import {createMotherDuckUser} from "../src/lib/motherduck-api";
import {MotherDuckOperationalRuntimeAdapter} from "../src/lib/motherduck-operational-runtime";
import {compileOperationalQuery,reconcileRuntimeColumns,WHO_RUNTIME_RESOURCE_REFERENCE} from "../src/lib/operational-runtime-policy";
import {whoRuntimePublicContract} from "../src/lib/who-runtime-contract";

const username=process.env.MOTHERDUCK_WHO_SERVICE_ACCOUNT_USERNAME||"duckdive_who_phase2cc";
if(username===(process.env.MOTHERDUCK_SHARED_SERVICE_ACCOUNT_USERNAME||"vic_house_lab"))throw new Error("WHO smoke identity must differ from VIC");
await createMotherDuckUser(username);
console.log("WHO_RUNTIME user_ready");
process.env.MOTHERDUCK_WHO_SERVICE_ACCOUNT_USERNAME=username;
const adapter=new MotherDuckOperationalRuntimeAdapter(username),metadata=await adapter.inspect(WHO_RUNTIME_RESOURCE_REFERENCE),publicContract=whoRuntimePublicContract(),reconciliation=reconcileRuntimeColumns(publicContract,metadata);
console.log(`WHO_RUNTIME metadata_ready columns=${metadata.columns.length}`);
if(!reconciliation.readyEligible||reconciliation.status!=="exact")throw new Error(`WHO runtime reconciliation failed: ${JSON.stringify(reconciliation.issues)}`);
console.log(`WHO_RUNTIME reconciliation_${reconciliation.status}`);
const datasetKey="dataset-"+"a".repeat(32),userId="11111111-1111-4111-8111-111111111111",context={userId,datasetKey,binding:{operationalDatasetId:"33333333-3333-4333-8333-333333333333",datasetKey,ownerUserId:userId,adapterKind:"motherduck-pg" as const,resourceReference:WHO_RUNTIME_RESOURCE_REFERENCE,bindingState:"ready" as const},publicContract};
try{
  const compiled=compileOperationalQuery(context,{select:["country_name","average_pm25_concentration"],filters:[{column:"year",operator:"gte",value:2020}],orderBy:[{field:"average_pm25_concentration",direction:"desc"}],limit:5}),rows=await adapter.query(compiled);
  console.log(`WHO_RUNTIME query_ready rows=${rows.length}`);
  let vicDenied=false;try{await adapter.inspect("vic_house_data.mart.suburb_monthly_sales");}catch{vicDenied=true;}
  if(!vicDenied)throw new Error("WHO adapter unexpectedly accepted a VIC resource");
  let revokedDenied=false;try{compileOperationalQuery({...context,binding:{...context.binding,bindingState:"revoked"}},{select:["country_name"]});}catch{revokedDenied=true;}
  if(!revokedDenied)throw new Error("Revoked WHO binding unexpectedly compiled a query");
  console.log(JSON.stringify({identity:username,tokenType:"read_scaling",tokenTtlSeconds:900,resource:WHO_RUNTIME_RESOURCE_REFERENCE,columnCount:metadata.columns.length,reconciliation:reconciliation.status,resultCount:rows.length,vicResourceDenied:vicDenied,revokedBindingDenied:revokedDenied},null,2));
}finally{await adapter.close();}
