import type {
  LocalSemanticEvidence,ParsedSemanticColumn,ParsedSemanticMeasure,ParsedSemanticPartition,
  ParsedSemanticRelationship,ParsedSemanticRole,ParsedSemanticTable,SemanticDiagnostic,SourceSummary,
} from "./semantic-model-types";

export type TmdlDocument={path:string;text:string};

type Line={raw:string;trimmed:string;indent:number;number:number};

function lines(text:string):Line[]{
  if(text.includes("\0"))throw new Error("TMDL contains a null byte");
  return text.replace(/\r\n?/g,"\n").split("\n").map((raw,index)=>{
    const prefix=raw.match(/^[\t ]*/)?.[0]||"";
    let indent=0,spaces=0;
    for(const char of prefix){if(char==="\t"){indent++;spaces=0;}else{spaces++;if(spaces===4){indent++;spaces=0;}}}
    return {raw,trimmed:raw.trim(),indent,number:index+1};
  });
}

function unquote(value:string){
  const text=value.trim();
  return text.startsWith("'")&&text.endsWith("'")?text.slice(1,-1).replaceAll("''", "'"):text;
}

function declarationName(text:string,keyword:string){
  const remainder=text.slice(keyword.length).trim();
  if(remainder.startsWith("'")){
    let value="";
    for(let index=1;index<remainder.length;index++){
      if(remainder[index]==="'"&&remainder[index+1]==="'"){value+="'";index++;continue;}
      if(remainder[index]==="'")return {name:value,rest:remainder.slice(index+1).trim()};
      value+=remainder[index];
    }
  }
  const match=remainder.match(/^(.*?)(?=\s*=|\s*$)/);
  return {name:unquote(match?.[1]||remainder),rest:remainder.slice((match?.[1]||remainder).length).trim()};
}

function descriptions(source:Line[],index:number){
  const value:string[]=[];
  for(let cursor=index-1;cursor>=0;cursor--){
    const line=source[cursor];
    if(line.trimmed.startsWith("///")){value.unshift(line.trimmed.slice(3).trim());continue;}
    if(!line.trimmed)break;
    break;
  }
  return value.join("\n");
}

function blockEnd(source:Line[],index:number){
  const base=source[index].indent;
  for(let cursor=index+1;cursor<source.length;cursor++)if(source[cursor].trimmed&&source[cursor].indent<=base)return cursor;
  return source.length;
}

function property(source:Line[],start:number,end:number,name:string){
  const prefix=`${name}:`;
  return source.slice(start+1,end).find(line=>line.trimmed.startsWith(prefix))?.trimmed.slice(prefix.length).trim()||"";
}

function flag(source:Line[],start:number,end:number,name:string){return source.slice(start+1,end).some(line=>line.trimmed===name);}

function expression(source:Line[],start:number,end:number,rest:string){
  const equals=rest.indexOf("=");
  const first=equals>=0?rest.slice(equals+1).trimStart():"";
  const metadata=/^(formatString|lineageTag|annotation|displayFolder|detailRowsDefinition|formatStringDefinition):?/;
  const body:string[]=[];
  if(first)body.push(first);
  for(const line of source.slice(start+1,end)){
    if(line.indent===source[start].indent+1&&metadata.test(line.trimmed))break;
    let raw=line.raw;
    for(let level=0;level<source[start].indent+1;level++)raw=raw.replace(/^(?:\t| {1,4})/,"");
    body.push(raw);
  }
  while(body.length&&!body.at(-1)?.trim())body.pop();
  return body.join("\n").trim();
}

function mergeTable(target:Map<string,ParsedSemanticTable>,table:ParsedSemanticTable,diagnostics:SemanticDiagnostic[],file:string,line:number){
  const existing=target.get(table.name);
  if(!existing){target.set(table.name,table);return;}
  for(const column of table.columns){
    if(existing.columns.some(item=>item.name===column.name))diagnostics.push({code:"duplicate-column",severity:"error",message:`Duplicate column ${table.name}.${column.name}`,file,line});
    else existing.columns.push(column);
  }
  for(const measure of table.measures){
    if(existing.measures.some(item=>item.name===measure.name))diagnostics.push({code:"duplicate-measure",severity:"error",message:`Duplicate measure ${table.name}.${measure.name}`,file,line});
    else existing.measures.push(measure);
  }
  existing.description=existing.description||table.description;
  existing.partitions.push(...table.partitions);
  existing.hasHierarchy||=table.hasHierarchy;
  existing.hasCalculationGroup||=table.hasCalculationGroup;
}

function parseTableBlocks(document:TmdlDocument,tables:Map<string,ParsedSemanticTable>,diagnostics:SemanticDiagnostic[]){
  const source=lines(document.text);
  for(let index=0;index<source.length;index++){
    const line=source[index];
    if(line.indent!==0||!line.trimmed.startsWith("table "))continue;
    const {name}=declarationName(line.trimmed,"table "),end=blockEnd(source,index);
    if(!name){diagnostics.push({code:"malformed-table",severity:"error",message:"A table declaration has no name",file:document.path,line:line.number});continue;}
    const table:ParsedSemanticTable={name,description:descriptions(source,index),columns:[],measures:[],partitions:[],hasHierarchy:false,hasCalculationGroup:false};
    for(let cursor=index+1;cursor<end;cursor++){
      const child=source[cursor];
      if(child.indent!==1)continue;
      if(child.trimmed.startsWith("column ")){
        const item=declarationName(child.trimmed,"column "),childEnd=blockEnd(source,cursor);
        const column:ParsedSemanticColumn={name:item.name,description:descriptions(source,cursor),dataType:property(source,cursor,childEnd,"dataType"),isHidden:flag(source,cursor,childEnd,"isHidden"),isKey:flag(source,cursor,childEnd,"isKey"),formatString:property(source,cursor,childEnd,"formatString"),summarizeBy:property(source,cursor,childEnd,"summarizeBy")};
        if(column.name)table.columns.push(column);else diagnostics.push({code:"malformed-column",severity:"error",message:`A column in ${name} has no name`,file:document.path,line:child.number});
        cursor=childEnd-1;
      }else if(child.trimmed.startsWith("measure ")){
        const item=declarationName(child.trimmed,"measure "),childEnd=blockEnd(source,cursor);
        const measure:ParsedSemanticMeasure={name:item.name,description:descriptions(source,cursor),expression:expression(source,cursor,childEnd,item.rest),formatString:property(source,cursor,childEnd,"formatString"),file:document.path,line:child.number};
        if(measure.name&&measure.expression)table.measures.push(measure);else diagnostics.push({code:"malformed-measure",severity:"error",message:`A measure in ${name} is missing a name or expression`,file:document.path,line:child.number});
        cursor=childEnd-1;
      }else if(child.trimmed.startsWith("partition ")){
        const item=declarationName(child.trimmed,"partition "),childEnd=blockEnd(source,cursor),equals=item.rest.indexOf("=");
        const partition:ParsedSemanticPartition={name:item.name,type:equals>=0?item.rest.slice(equals+1).trim():"",mode:property(source,cursor,childEnd,"mode")};
        table.partitions.push(partition);cursor=childEnd-1;
      }else if(child.trimmed.startsWith("hierarchy "))table.hasHierarchy=true;
      else if(child.trimmed.startsWith("calculationGroup"))table.hasCalculationGroup=true;
      else if(child.trimmed&&!child.trimmed.startsWith("///")&&!/^(lineageTag|sourceLineageTag|annotation |isHidden|dataCategory|excludeFromModelRefresh)/.test(child.trimmed))diagnostics.push({code:"unsupported-table-property",severity:"warning",message:`${name} contains unsupported table metadata: ${child.trimmed.split(/[: ]/,1)[0]}`,file:document.path,line:child.number});
    }
    if(table.hasHierarchy)diagnostics.push({code:"hierarchy-present",severity:"warning",message:`${name} contains hierarchy metadata that is not persisted`,file:document.path,line:line.number});
    if(table.hasCalculationGroup)diagnostics.push({code:"calculation-group-present",severity:"warning",message:`${name} contains a calculation group that requires later activation support`,file:document.path,line:line.number});
    mergeTable(tables,table,diagnostics,document.path,line.number);index=end-1;
  }
}

function splitReference(value:string){
  const dot=value.lastIndexOf(".");
  return dot<0?{table:"",column:""}:{table:unquote(value.slice(0,dot)),column:unquote(value.slice(dot+1))};
}

function parseRelationships(document:TmdlDocument,diagnostics:SemanticDiagnostic[]){
  const source=lines(document.text),result:ParsedSemanticRelationship[]=[];
  for(let index=0;index<source.length;index++){
    const line=source[index];if(line.indent!==0||!line.trimmed.startsWith("relationship "))continue;
    const end=blockEnd(source,index),from=splitReference(property(source,index,end,"fromColumn")),to=splitReference(property(source,index,end,"toColumn"));
    const relationship:ParsedSemanticRelationship={id:declarationName(line.trimmed,"relationship ").name,fromTable:from.table,fromColumn:from.column,toTable:to.table,toColumn:to.column,fromCardinality:property(source,index,end,"fromCardinality")||"many",toCardinality:property(source,index,end,"toCardinality")||"one",isActive:!flag(source,index,end,"isActive: false")&&property(source,index,end,"isActive")!=="false",crossFilteringBehavior:property(source,index,end,"crossFilteringBehavior")||"oneDirection",securityFilteringBehavior:property(source,index,end,"securityFilteringBehavior"),file:document.path,line:line.number};
    if(!relationship.id||!from.table||!from.column||!to.table||!to.column)diagnostics.push({code:"malformed-relationship",severity:"error",message:"A relationship is missing an endpoint",file:document.path,line:line.number});
    else result.push(relationship);index=end-1;
  }
  return result;
}

function parseRoles(documents:TmdlDocument[]):ParsedSemanticRole[]{
  return documents.filter(document=>/\/roles\/[^/]+\.tmdl$/i.test(document.path)).flatMap(document=>{
    const source=lines(document.text),roleLine=source.find(line=>line.indent===0&&line.trimmed.startsWith("role "));if(!roleLine)return [];
    const name=declarationName(roleLine.trimmed,"role ").name,affectedTables=source.filter(line=>line.trimmed.startsWith("tablePermission ")).map(line=>declarationName(line.trimmed,"tablePermission ").name);
    return [{name,affectedTables:[...new Set(affectedTables)].sort()}];
  });
}

function sourceSummary(documents:TmdlDocument[],tables:ParsedSemanticTable[]):SourceSummary{
  const modes=new Set(tables.flatMap(table=>table.partitions.map(partition=>partition.mode.toLowerCase())).filter(Boolean));
  const types=new Set(tables.flatMap(table=>table.partitions.map(partition=>partition.type.toLowerCase())).filter(Boolean));
  const text=documents.filter(document=>/\/(expressions|datasources)\.tmdl$/i.test(document.path)).map(document=>document.text).join("\n");
  if(modes.size>1)return "Composite/Mixed Mode";
  if(modes.has("directlake")||/onelake|AzureStorage\.DataLake|Lakehouse/i.test(text))return "Direct Lake";
  if(modes.has("directquery")||/AnalysisServices\.Database|Sql\.Database|Sql\.Server/i.test(text))return "DirectQuery";
  if(modes.has("import"))return "Import";
  if(types.has("m"))return "Import";
  return "Unknown";
}

export function parseTmdlEvidence(input:{displayName:string;archiveFingerprint:string;documents:TmdlDocument[]}):LocalSemanticEvidence{
  const diagnostics:SemanticDiagnostic[]=[],tables=new Map<string,ParsedSemanticTable>(),documents=[...input.documents].sort((a,b)=>a.path.localeCompare(b.path));
  for(const document of documents)parseTableBlocks(document,tables,diagnostics);
  const relationshipDocument=documents.find(document=>/\/relationships\.tmdl$/i.test(document.path));
  const relationships=relationshipDocument?parseRelationships(relationshipDocument,diagnostics):[];
  for(const document of documents){
    if(/\/(perspectives|cultures)\//i.test(document.path))diagnostics.push({code:"unsupported-document",severity:"warning",message:`${document.path.split("/").at(-2)} metadata is detected but not persisted`,file:document.path});
    if(/\/(functions|datasources)\.tmdl$/i.test(document.path))diagnostics.push({code:"unsupported-document",severity:"warning",message:`${document.path.split("/").pop()} is used only for local source classification`,file:document.path});
  }
  const sorted=[...tables.values()].map(table=>({...table,columns:table.columns.sort((a,b)=>a.name.localeCompare(b.name)),measures:table.measures.sort((a,b)=>a.name.localeCompare(b.name)),partitions:table.partitions.sort((a,b)=>a.name.localeCompare(b.name))})).sort((a,b)=>a.name.localeCompare(b.name));
  if(!sorted.length)diagnostics.push({code:"no-tables",severity:"error",message:"No TMDL table declarations were parsed"});
  const roles=parseRoles(documents);
  diagnostics.sort((a,b)=>(a.file||"").localeCompare(b.file||"")||(a.line||0)-(b.line||0)||a.code.localeCompare(b.code));
  return {displayName:input.displayName,archiveFingerprint:input.archiveFingerprint,sourceSummary:sourceSummary(documents,sorted),tables:sorted,relationships:relationships.sort((a,b)=>a.id.localeCompare(b.id)),roles:roles.sort((a,b)=>a.name.localeCompare(b.name)),diagnostics};
}
