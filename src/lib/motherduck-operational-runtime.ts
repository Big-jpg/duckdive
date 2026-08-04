import {closeMotherduckServiceSql,motherduckServiceSql} from "./motherduck-access";
import {
  OPERATIONAL_RUNTIME_ADAPTER_KIND,
  WHO_RUNTIME_RESOURCE_REFERENCE,
  type CompiledOperationalQuery,
  type OperationalRuntimeAdapter,
  type RuntimeMetadata,
} from "./operational-runtime-policy";

export function operationalRuntimeUsername(env:Record<string,string|undefined>=process.env){
  const username=env.MOTHERDUCK_WHO_SERVICE_ACCOUNT_USERNAME?.trim();
  if(!username)throw new Error("MOTHERDUCK_WHO_SERVICE_ACCOUNT_USERNAME is required");
  if(username===(env.MOTHERDUCK_SHARED_SERVICE_ACCOUNT_USERNAME||"vic_house_lab").trim())throw new Error("The WHO runtime must not reuse the VIC service account");
  return username;
}

export class MotherDuckOperationalRuntimeAdapter implements OperationalRuntimeAdapter{
  readonly kind=OPERATIONAL_RUNTIME_ADAPTER_KIND;
  constructor(private readonly username=operationalRuntimeUsername()){}

  async inspect(resourceReference:string):Promise<RuntimeMetadata>{
    if(resourceReference!==WHO_RUNTIME_RESOURCE_REFERENCE)throw new Error("Operational runtime resource is unavailable");
    const sql=await motherduckServiceSql(this.username,"read_scaling");
    const rows=await sql.unsafe<{column_name:string;column_type:string}[]>("DESCRIBE SELECT * FROM sample_data.who.ambient_air_quality");
    if(!rows.length)throw new Error("WHO runtime metadata is unavailable");
    return {resourceReference,columns:rows.map(row=>({name:row.column_name,dataType:row.column_type}))};
  }

  async query(compiled:CompiledOperationalQuery){
    const sql=await motherduckServiceSql(this.username,"read_scaling");
    const rows=await sql.unsafe<Record<string,unknown>[]>(compiled.text,[...compiled.values]);
    return rows.slice(0,compiled.limit);
  }

  async close(){await closeMotherduckServiceSql(this.username,"read_scaling");}
}
