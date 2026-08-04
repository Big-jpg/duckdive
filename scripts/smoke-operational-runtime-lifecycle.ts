import {createHash,randomUUID} from "node:crypto";
import {addAccess,saveWorkspace} from "../src/lib/app-db";
import {createDatasetDraft} from "../src/lib/dataset-drafts-db";
import {expectedSemanticContractFingerprint} from "../src/lib/dataset-draft-contract";
import {database} from "../src/lib/db";
import {MotherDuckOperationalRuntimeAdapter} from "../src/lib/motherduck-operational-runtime";
import {compileOperationalDatasetCandidate} from "../src/lib/operational-dataset-candidate";
import {activateOperationalDataset} from "../src/lib/operational-datasets-db";
import {beginOperationalRuntimeBinding,finalizeOperationalRuntimeBinding,getOperationalRuntimeContext,revokeOperationalRuntimeBinding} from "../src/lib/operational-runtime-db";
import {compileOperationalQuery,reconcileRuntimeColumns,WHO_RUNTIME_RESOURCE_REFERENCE} from "../src/lib/operational-runtime-policy";
import type {ReviewedSemanticContractV1} from "../src/lib/semantic-model-types";
import {WHO_RUNTIME_EXPECTED_COLUMNS} from "../src/lib/who-runtime-contract";

const email="qa-phase2cc-runtime@invalid.local",runtimeUsername=process.env.MOTHERDUCK_WHO_SERVICE_ACCOUNT_USERNAME||"duckdive_who_phase2cc";
process.env.MOTHERDUCK_WHO_SERVICE_ACCOUNT_USERNAME=runtimeUsername;

function reviewedContract():ReviewedSemanticContractV1{
  const contract:ReviewedSemanticContractV1={schemaVersion:"semantic-contract/v1",identity:{displayName:"WHO ambient air quality QA",sourceFormat:"fabric-tmdl",archiveFingerprint:createHash("sha256").update("phase2cc-who-runtime-fixture").digest("hex"),contractFingerprint:"0".repeat(64)},entities:[{name:"ambient_air_quality",description:"Public World Health Organization ambient air-quality fixture.",purpose:"Compare recorded pollutant concentrations across places and years.",grain:"One published air-quality observation for a city and measurement year.",provenance:{purpose:"user-confirmed",grain:"user-confirmed"},columns:WHO_RUNTIME_EXPECTED_COLUMNS.map(column=>({...column,description:"",isHidden:false,isKey:false,provenance:"declared"}))}],measures:[{table:"ambient_air_quality",name:"average_pm25_concentration",description:"Average reviewed PM2.5 concentration",dax:"AVERAGE(ambient_air_quality[pm25_concentration])",formatString:"0.0",provenance:"user-confirmed"}],relationships:[],sourceSummary:"Import",diagnostics:[]};
  contract.identity.contractFingerprint=expectedSemanticContractFingerprint(contract);return contract;
}

async function cleanup(){const sql=database();try{await sql`DELETE FROM app.app_user WHERE lower(email)=lower(${email})`;}finally{await sql.end();}}
async function qaCounts(){const sql=database();try{const [row]=await sql<{users:number;datasets:number;bindings:number}[]>`SELECT (SELECT count(*)::int FROM app.app_user WHERE lower(email)=lower(${email})) users,(SELECT count(*)::int FROM app.operational_dataset d JOIN app.app_user u ON u.user_id=d.owner_user_id WHERE lower(u.email)=lower(${email})) datasets,(SELECT count(*)::int FROM app.operational_dataset_binding b JOIN app.operational_dataset d USING(operational_dataset_id) JOIN app.app_user u ON u.user_id=d.owner_user_id WHERE lower(u.email)=lower(${email})) bindings`;return row;}finally{await sql.end();}}
async function baseline(){const sql=database();try{const [row]=await sql<{files:number;observations:number}[]>`SELECT (SELECT count(*)::int FROM ops.ingest_file) files,(SELECT count(*)::int FROM raw.sale_observation) observations`;return row;}finally{await sql.end();}}

await cleanup();
const before=await baseline(),adapter=new MotherDuckOperationalRuntimeAdapter(runtimeUsername);
let evidence:Record<string,unknown>={};
try{
  const user=await addAccess(email,"member");if(!user)throw new Error("Could not create QA owner");
  await saveWorkspace(user.user_id,process.env.MOTHERDUCK_SHARED_SERVICE_ACCOUNT_USERNAME||"vic_house_lab",{},{});
  const contract=reviewedContract(),draft=await createDatasetDraft(user.user_id,contract);if(!draft)throw new Error("Could not create QA reviewed draft");
  const activated=await activateOperationalDataset(user.user_id,draft.dataset_draft_id,compileOperationalDatasetCandidate(contract));if(!activated)throw new Error("Could not activate QA operational dataset");
  const datasetId=activated.dataset.operational_dataset_id,started=await beginOperationalRuntimeBinding(user.user_id,datasetId);if(!started)throw new Error("Could not start QA runtime binding");
  const metadata=await adapter.inspect(WHO_RUNTIME_RESOURCE_REFERENCE),reconciliation=reconcileRuntimeColumns(activated.dataset.public_contract_json,metadata);if(!reconciliation.readyEligible)throw new Error(`Runtime reconciliation failed: ${JSON.stringify(reconciliation.issues)}`);
  const ready=await finalizeOperationalRuntimeBinding(user.user_id,datasetId,reconciliation);if(ready?.binding_state!=="ready")throw new Error("Runtime binding did not become ready");
  const context=await getOperationalRuntimeContext(user.user_id,datasetId);if(!context)throw new Error("Owner runtime context was not ready");
  const compiled=compileOperationalQuery(context,{select:["country_name","average_pm25_concentration"],filters:[{column:"year",operator:"gte",value:2020}],orderBy:[{field:"average_pm25_concentration",direction:"desc"}],limit:5}),rows=await adapter.query(compiled);if(rows.length!==5)throw new Error("Bounded runtime query did not return five rows");
  const crossOwner=await getOperationalRuntimeContext(randomUUID(),datasetId);if(crossOwner)throw new Error("Cross-owner runtime context was exposed");
  const revoked=await revokeOperationalRuntimeBinding(user.user_id,datasetId);if(revoked?.binding_state!=="revoked")throw new Error("Runtime binding did not revoke");
  if(await getOperationalRuntimeContext(user.user_id,datasetId))throw new Error("Revoked runtime remained available");
  const sql=database();let audits:{event_type:string;details:unknown}[];try{audits=await sql`SELECT event_type,details FROM app.audit_event WHERE user_id=${user.user_id}::uuid AND event_type LIKE 'operational_runtime.%' ORDER BY occurred_at`;}finally{await sql.end();}
  const serialized=JSON.stringify(audits);if(serialized.includes("country_name")||serialized.includes("pm25_concentration"))throw new Error("Runtime audits contain contract content");
  evidence={datasetId,reconciliation:reconciliation.status,columnCount:metadata.columns.length,resultCount:rows.length,crossOwnerDenied:true,revokedDenied:true,auditEvents:audits.map(item=>item.event_type)};
}finally{await adapter.close();await cleanup();}
const after=await baseline(),remaining=await qaCounts();
if(before.files!==83||before.observations!==88422||after.files!==83||after.observations!==88422)throw new Error("VIC baseline changed during runtime smoke");
if(remaining.users||remaining.datasets||remaining.bindings)throw new Error(`QA cleanup incomplete: ${JSON.stringify(remaining)}`);
console.log(JSON.stringify({...evidence,vicBaseline:after,cleanup:remaining},null,2));
