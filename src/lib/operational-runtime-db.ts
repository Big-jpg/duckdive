import {createHash} from "node:crypto";
import {database} from "./db";
import type {OperationalDatasetCandidateV1} from "./operational-dataset-candidate";
import {
  OPERATIONAL_RUNTIME_ADAPTER_KIND,
  WHO_RUNTIME_RESOURCE_REFERENCE,
  type OperationalRuntimeContext,
  type ResolvedOperationalRuntimeBinding,
  type RuntimeReconciliationResult,
} from "./operational-runtime-policy";
import {canonicalJson} from "./semantic-model-types";

export type OperationalRuntimeBindingRow={
  operational_dataset_binding_id:string;operational_dataset_id:string;adapter_kind:typeof OPERATIONAL_RUNTIME_ADAPTER_KIND;resource_reference:string;
  binding_state:"binding"|"ready"|"degraded"|"revoked";reconciliation_status:"exact"|"acknowledged-variance"|null;
  reconciliation_fingerprint:string|null;acknowledged_variance_codes:string[];reconciled_at:string|null;revoked_at:string|null;created_at:string;updated_at:string;
};
type OwnedRuntimeRow=OperationalRuntimeBindingRow&{dataset_key:string;owner_user_id:string;public_contract_json:OperationalDatasetCandidateV1["publicContract"]};

const bindingColumns="b.operational_dataset_binding_id,b.operational_dataset_id,b.adapter_kind,b.resource_reference,b.binding_state,b.reconciliation_status,b.reconciliation_fingerprint,b.acknowledged_variance_codes,b.reconciled_at,b.revoked_at,b.created_at,b.updated_at";
export class OperationalRuntimeConflictError extends Error{}

export async function beginOperationalRuntimeBinding(userId:string,datasetId:string){
  const sql=database();try{return await sql.begin(async tx=>{
    const [dataset]=await tx<{operational_dataset_id:string}[]>`SELECT operational_dataset_id FROM app.operational_dataset WHERE owner_user_id=${userId}::uuid AND operational_dataset_id=${datasetId}::uuid AND lifecycle_state IN ('reviewed','binding','degraded','ready') FOR UPDATE`;
    if(!dataset)return null;
    const [existing]=await tx<OperationalRuntimeBindingRow[]>`SELECT operational_dataset_binding_id,operational_dataset_id,adapter_kind,resource_reference,binding_state,reconciliation_status,reconciliation_fingerprint,acknowledged_variance_codes,reconciled_at,revoked_at,created_at,updated_at FROM app.operational_dataset_binding WHERE operational_dataset_id=${datasetId}::uuid`;
    if(existing?.binding_state==="revoked")throw new OperationalRuntimeConflictError("The operational runtime binding has been revoked");
    const [binding]=existing?.binding_state==="ready"?[existing]:existing?await tx<OperationalRuntimeBindingRow[]>`UPDATE app.operational_dataset_binding SET binding_state='binding',reconciliation_status=NULL,reconciliation_fingerprint=NULL,acknowledged_variance_codes='[]'::jsonb,reconciled_at=NULL WHERE operational_dataset_id=${datasetId}::uuid RETURNING operational_dataset_binding_id,operational_dataset_id,adapter_kind,resource_reference,binding_state,reconciliation_status,reconciliation_fingerprint,acknowledged_variance_codes,reconciled_at,revoked_at,created_at,updated_at`:await tx<OperationalRuntimeBindingRow[]>`INSERT INTO app.operational_dataset_binding(operational_dataset_id,adapter_kind,resource_reference) VALUES(${datasetId}::uuid,${OPERATIONAL_RUNTIME_ADAPTER_KIND},${WHO_RUNTIME_RESOURCE_REFERENCE}) RETURNING operational_dataset_binding_id,operational_dataset_id,adapter_kind,resource_reference,binding_state,reconciliation_status,reconciliation_fingerprint,acknowledged_variance_codes,reconciled_at,revoked_at,created_at,updated_at`;
    await tx`UPDATE app.operational_dataset SET lifecycle_state='binding' WHERE operational_dataset_id=${datasetId}::uuid AND lifecycle_state<>'ready'`;
    await tx`INSERT INTO app.audit_event(user_id,event_type,target_id,details) VALUES(${userId}::uuid,'operational_runtime.binding_started',${datasetId},${tx.json({adapterKind:OPERATIONAL_RUNTIME_ADAPTER_KIND} as never)})`;
    return binding;
  });}finally{await sql.end();}
}

export function reconciliationFingerprint(result:RuntimeReconciliationResult){return createHash("sha256").update(canonicalJson({resourceReference:result.resourceReference,status:result.status,issues:result.issues})).digest("hex");}

export async function finalizeOperationalRuntimeBinding(userId:string,datasetId:string,result:RuntimeReconciliationResult){
  const sql=database();try{return await sql.begin(async tx=>{
    const [owned]=await tx<{operational_dataset_id:string}[]>`SELECT operational_dataset_id FROM app.operational_dataset WHERE owner_user_id=${userId}::uuid AND operational_dataset_id=${datasetId}::uuid FOR UPDATE`;
    if(!owned)return null;
    const state=result.readyEligible?"ready":"degraded",status=result.readyEligible?result.status:null,fingerprint=reconciliationFingerprint(result),codes=result.status==="acknowledged-variance"?result.issues.map(issue=>issue.code):[];
    const [binding]=await tx<OperationalRuntimeBindingRow[]>`UPDATE app.operational_dataset_binding SET binding_state=${state},reconciliation_status=${status},reconciliation_fingerprint=${fingerprint},acknowledged_variance_codes=${tx.json(codes as never)},reconciled_at=now() WHERE operational_dataset_id=${datasetId}::uuid AND binding_state<>'revoked' RETURNING operational_dataset_binding_id,operational_dataset_id,adapter_kind,resource_reference,binding_state,reconciliation_status,reconciliation_fingerprint,acknowledged_variance_codes,reconciled_at,revoked_at,created_at,updated_at`;
    if(!binding)return null;
    await tx`UPDATE app.operational_dataset SET lifecycle_state=${state} WHERE operational_dataset_id=${datasetId}::uuid`;
    await tx`INSERT INTO app.audit_event(user_id,event_type,target_id,details) VALUES(${userId}::uuid,'operational_runtime.reconciled',${datasetId},${tx.json({status:result.status,readyEligible:result.readyEligible,issueCount:result.issues.length} as never)})`;
    return binding;
  });}finally{await sql.end();}
}

export async function getOperationalRuntimeContext(userId:string,datasetId:string):Promise<OperationalRuntimeContext|null>{
  const sql=database();try{
    const [row]=await sql.unsafe<OwnedRuntimeRow[]>(`SELECT ${bindingColumns},d.dataset_key,d.owner_user_id,d.public_contract_json FROM app.operational_dataset_binding b JOIN app.operational_dataset d ON d.operational_dataset_id=b.operational_dataset_id WHERE d.owner_user_id=$1::uuid AND d.operational_dataset_id=$2::uuid AND d.lifecycle_state='ready' AND b.binding_state='ready'`,[userId,datasetId]);
    if(!row)return null;
    const binding:ResolvedOperationalRuntimeBinding={operationalDatasetId:row.operational_dataset_id,datasetKey:row.dataset_key,ownerUserId:row.owner_user_id,adapterKind:row.adapter_kind,resourceReference:row.resource_reference,bindingState:row.binding_state};
    return {userId,datasetKey:row.dataset_key,binding,publicContract:row.public_contract_json};
  }finally{await sql.end();}
}

export async function revokeOperationalRuntimeBinding(userId:string,datasetId:string){
  const sql=database();try{return await sql.begin(async tx=>{
    const [owned]=await tx<{operational_dataset_id:string}[]>`SELECT operational_dataset_id FROM app.operational_dataset WHERE owner_user_id=${userId}::uuid AND operational_dataset_id=${datasetId}::uuid FOR UPDATE`;
    if(!owned)return null;
    const [binding]=await tx<OperationalRuntimeBindingRow[]>`UPDATE app.operational_dataset_binding SET binding_state='revoked' WHERE operational_dataset_id=${datasetId}::uuid AND binding_state<>'revoked' RETURNING operational_dataset_binding_id,operational_dataset_id,adapter_kind,resource_reference,binding_state,reconciliation_status,reconciliation_fingerprint,acknowledged_variance_codes,reconciled_at,revoked_at,created_at,updated_at`;
    if(binding){await tx`UPDATE app.operational_dataset SET lifecycle_state='degraded' WHERE operational_dataset_id=${datasetId}::uuid`;await tx`INSERT INTO app.audit_event(user_id,event_type,target_id,details) VALUES(${userId}::uuid,'operational_runtime.revoked',${datasetId},${tx.json({bindingState:"revoked"} as never)})`;return binding;}
    const [existing]=await tx<OperationalRuntimeBindingRow[]>`SELECT operational_dataset_binding_id,operational_dataset_id,adapter_kind,resource_reference,binding_state,reconciliation_status,reconciliation_fingerprint,acknowledged_variance_codes,reconciled_at,revoked_at,created_at,updated_at FROM app.operational_dataset_binding WHERE operational_dataset_id=${datasetId}::uuid AND binding_state='revoked'`;
    return existing||null;
  });}finally{await sql.end();}
}

export async function degradeOperationalRuntimeBinding(userId:string,datasetId:string,reasonCode:"inspection-failed"|"query-failed"){
  const sql=database();try{return await sql.begin(async tx=>{
    const [owned]=await tx<{operational_dataset_id:string}[]>`SELECT operational_dataset_id FROM app.operational_dataset WHERE owner_user_id=${userId}::uuid AND operational_dataset_id=${datasetId}::uuid FOR UPDATE`;
    if(!owned)return null;
    const [binding]=await tx<OperationalRuntimeBindingRow[]>`UPDATE app.operational_dataset_binding SET binding_state='degraded' WHERE operational_dataset_id=${datasetId}::uuid AND binding_state<>'revoked' RETURNING operational_dataset_binding_id,operational_dataset_id,adapter_kind,resource_reference,binding_state,reconciliation_status,reconciliation_fingerprint,acknowledged_variance_codes,reconciled_at,revoked_at,created_at,updated_at`;
    if(!binding)return null;
    await tx`UPDATE app.operational_dataset SET lifecycle_state='degraded' WHERE operational_dataset_id=${datasetId}::uuid`;
    await tx`INSERT INTO app.audit_event(user_id,event_type,target_id,details) VALUES(${userId}::uuid,'operational_runtime.degraded',${datasetId},${tx.json({reasonCode} as never)})`;
    return binding;
  });}finally{await sql.end();}
}
