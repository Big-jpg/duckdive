export const CSV_DIVE_SCHEMA_VERSION="csv-dive/v1" as const;
export const CSV_DIVE_LIMITS={fileBytes:1024*1024,rows:5_000,columns:30,previewRows:12} as const;

export type CsvColumnKind="number"|"date"|"text";
export type CsvColumnProfile={
  name:string;kind:CsvColumnKind;nonEmpty:number;missing:number;unique:number;
  minimum:number|null;maximum:number|null;mean:number|null;
  examples:string[];
};
export type CsvDiveChart={title:string;description:string;labels:string[];values:number[];valueLabel:string};
export type CsvDive={
  schemaVersion:typeof CSV_DIVE_SCHEMA_VERSION;
  ownerScope:string;
  importedAt:string;
  file:{name:string;size:number;lastModified:number;sha256:string};
  rowCount:number;
  columns:CsvColumnProfile[];
  preview:string[][];
  completeness:number;
  chart:CsvDiveChart;
  insight:string;
};

export class CsvDiveError extends Error{}

function isBlankRow(row:readonly string[]){return row.every(value=>!value.trim());}

export function parseCsv(source:string){
  const rows:string[][]=[];let row:string[]=[],field="",quoted=false;
  const pushField=()=>{row.push(field);field="";};
  const pushRow=()=>{pushField();if(!isBlankRow(row))rows.push(row);row=[];if(rows.length>CSV_DIVE_LIMITS.rows+1)throw new CsvDiveError(`CSV files are limited to ${CSV_DIVE_LIMITS.rows.toLocaleString("en-AU")} data rows.`);};
  for(let index=0;index<source.length;index++){
    const character=source[index];
    if(quoted){
      if(character==='"'&&source[index+1]==='"'){field+='"';index++;}
      else if(character==='"')quoted=false;
      else field+=character;
      continue;
    }
    if(character==='"'&&!field)quoted=true;
    else if(character===",")pushField();
    else if(character==="\n")pushRow();
    else if(character!=="\r")field+=character;
  }
  if(quoted)throw new CsvDiveError("The CSV ends inside a quoted value. Export it again and retry.");
  if(field||row.length)pushRow();
  if(rows.length<2)throw new CsvDiveError("The CSV needs a header row and at least 1 data row.");
  const width=rows[0].length;
  if(width<1||width>CSV_DIVE_LIMITS.columns)throw new CsvDiveError(`CSV files are limited to ${CSV_DIVE_LIMITS.columns} columns.`);
  if(rows.some(item=>item.length!==width))throw new CsvDiveError("Every CSV row must have the same number of columns.");
  return rows;
}

function headers(values:readonly string[]){
  const used=new Map<string,number>();
  return values.map((value,index)=>{
    const base=value.replace(/^\uFEFF/,"").trim()||`Column ${index+1}`,count=(used.get(base)||0)+1;used.set(base,count);
    return count===1?base:`${base} (${count})`;
  });
}
function finiteNumber(value:string){if(!value.trim())return null;const normalized=value.trim().replaceAll(",","").replace(/^\$/,"");const number=Number(normalized);return Number.isFinite(number)?number:null;}
function validDate(value:string){if(!value.trim()||/^\d+(\.\d+)?$/.test(value.trim()))return false;return Number.isFinite(Date.parse(value));}
function compact(value:number){return new Intl.NumberFormat("en-AU",{maximumFractionDigits:1,notation:Math.abs(value)>=1_000_000?"compact":"standard"}).format(value);}

function profileColumn(name:string,values:readonly string[],rowCount:number):CsvColumnProfile{
  const present=values.map(value=>value.trim()).filter(Boolean),numbers=present.map(finiteNumber).filter((value):value is number=>value!==null);
  const kind:CsvColumnKind=present.length&&numbers.length===present.length?"number":present.length&&present.every(validDate)?"date":"text";
  const counts=new Map<string,number>();for(const value of present)counts.set(value,(counts.get(value)||0)+1);
  const examples=[...counts].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,3).map(([value])=>value);
  return {name,kind,nonEmpty:present.length,missing:rowCount-present.length,unique:counts.size,minimum:kind==="number"?Math.min(...numbers):null,maximum:kind==="number"?Math.max(...numbers):null,mean:kind==="number"?numbers.reduce((sum,value)=>sum+value,0)/numbers.length:null,examples};
}

function deriveChart(names:readonly string[],body:readonly string[][],profiles:readonly CsvColumnProfile[]):CsvDiveChart{
  const numericIndex=profiles.findIndex(profile=>profile.kind==="number"),categoryIndex=profiles.findIndex((profile,index)=>index!==numericIndex&&profile.kind!=="number"&&profile.unique>1&&profile.unique<=Math.min(20,body.length));
  if(numericIndex>=0&&categoryIndex>=0){
    const totals=new Map<string,number>();for(const row of body){const label=row[categoryIndex].trim()||"Missing",value=finiteNumber(row[numericIndex]);if(value!==null)totals.set(label,(totals.get(label)||0)+value);}
    const ranked=[...totals].sort((a,b)=>b[1]-a[1]).slice(0,8);
    return {title:`${names[numericIndex]} by ${names[categoryIndex]}`,description:`Sum of ${names[numericIndex]} across the leading ${names[categoryIndex]} values.`,labels:ranked.map(([label])=>label),values:ranked.map(([,value])=>value),valueLabel:names[numericIndex]};
  }
  const index=categoryIndex>=0?categoryIndex:0,counts=new Map<string,number>();for(const row of body){const label=row[index].trim()||"Missing";counts.set(label,(counts.get(label)||0)+1);}
  const ranked=[...counts].sort((a,b)=>b[1]-a[1]).slice(0,8);
  return {title:`Rows by ${names[index]}`,description:`Count of rows across the leading ${names[index]} values.`,labels:ranked.map(([label])=>label),values:ranked.map(([,value])=>value),valueLabel:"Rows"};
}

export function buildCsvDive(input:{ownerScope:string;fileName:string;fileSize:number;lastModified:number;sha256:string;source:string;importedAt?:string}):CsvDive{
  if(!input.ownerScope.trim())throw new CsvDiveError("The authenticated owner scope is missing.");
  if(input.fileSize>CSV_DIVE_LIMITS.fileBytes)throw new CsvDiveError("Choose a CSV no larger than 1 MiB for this first slice.");
  const [rawHeaders,...body]=parseCsv(input.source),names=headers(rawHeaders),profiles=names.map((name,index)=>profileColumn(name,body.map(row=>row[index]),body.length));
  const chart=deriveChart(names,body,profiles),totalCells=body.length*names.length,present=profiles.reduce((sum,profile)=>sum+profile.nonEmpty,0),leading=chart.values[0]??0;
  return {schemaVersion:CSV_DIVE_SCHEMA_VERSION,ownerScope:input.ownerScope,importedAt:input.importedAt||new Date().toISOString(),file:{name:input.fileName,size:input.fileSize,lastModified:input.lastModified,sha256:input.sha256},rowCount:body.length,columns:profiles,preview:body.slice(0,CSV_DIVE_LIMITS.previewRows),completeness:totalCells?present/totalCells:0,chart,insight:chart.labels.length?`${chart.labels[0]} leads ${chart.title.toLowerCase()} at ${compact(leading)}.`:"No chartable values were found."};
}

function isCsvDive(value:unknown):value is CsvDive{
  if(!value||typeof value!=="object")return false;const dive=value as Partial<CsvDive>;
  return dive.schemaVersion===CSV_DIVE_SCHEMA_VERSION&&typeof dive.ownerScope==="string"&&typeof dive.rowCount==="number"&&Array.isArray(dive.columns)&&Array.isArray(dive.preview)&&Boolean(dive.file&&typeof dive.file.name==="string")&&Boolean(dive.chart&&Array.isArray(dive.chart.labels));
}
export function csvDiveStorageKey(ownerScope:string){return `${CSV_DIVE_SCHEMA_VERSION}:${ownerScope}`;}
export function clearCsvDiveStorage(storage:Pick<Storage,"length"|"key"|"removeItem">){
  const keys:string[]=[];for(let index=0;index<storage.length;index++){const key=storage.key(index);if(key?.startsWith(`${CSV_DIVE_SCHEMA_VERSION}:`))keys.push(key);}for(const key of keys)storage.removeItem(key);
}
export function restoreCsvDive(serialized:string|null,ownerScope:string){if(!serialized)return null;try{const value=JSON.parse(serialized);return isCsvDive(value)&&value.ownerScope===ownerScope?value:null;}catch{return null;}}
