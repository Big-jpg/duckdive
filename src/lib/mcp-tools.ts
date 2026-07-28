import type {ToolSet} from "ai";

const ALLOWED=new Set(["list_databases","list_tables","list_columns","search_catalog","query","read_dive","edit_dive_content"]);
const ID_FIELDS=["id","dive_id","diveId"];

export function constrainedTools(tools:ToolSet,activeDiveId:string):ToolSet{
  return Object.fromEntries(Object.entries(tools).filter(([name])=>ALLOWED.has(name)).map(([name,tool])=>{
    if(name!=="read_dive"&&name!=="edit_dive_content")return [name,tool];
    const execute=tool.execute;if(!execute)return [name,tool];
    return [name,{...tool,async execute(input:unknown,options:Parameters<NonNullable<typeof execute>>[1]){const record={...(input as Record<string,unknown>)};for(const field of ID_FIELDS){if(field in record&&String(record[field])!==activeDiveId)throw new Error("Dive access denied");}const existing=ID_FIELDS.find(field=>field in record);record[existing||"id"]=activeDiveId;return execute(record,options);}}];
  }));
}
