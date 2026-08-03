import {database} from "./db";
import type {OperationalDatasetCandidateV1} from "./operational-dataset-candidate";

export type OperationalDatasetState="reviewed"|"binding"|"ready"|"degraded"|"archived";
export type OperationalDatasetRow={
  operational_dataset_id:string;dataset_key:string;workspace_id:string;owner_user_id:string;dataset_draft_id:string;display_name:string;
  lifecycle_state:OperationalDatasetState;contract_version:"operational-dataset-candidate/v1";contract_fingerprint:string;candidate_fingerprint:string;
  public_contract_json:OperationalDatasetCandidateV1["publicContract"];created_at:string;updated_at:string;archived_at:string|null;
};

export class OperationalDatasetConflictError extends Error{}

export async function activateOperationalDataset(userId:string,draftId:string,candidate:OperationalDatasetCandidateV1){
  const sql=database();try{return await sql.begin(async tx=>{
    const [owned]=await tx<{workspace_id:string;dataset_draft_id:string}[]>`SELECT w.workspace_id,d.dataset_draft_id FROM app.workspace w JOIN app.dataset_draft d ON d.user_id=w.user_id WHERE w.user_id=${userId}::uuid AND d.dataset_draft_id=${draftId}::uuid AND d.contract_fingerprint=${candidate.provenance.reviewedContractFingerprint} FOR UPDATE OF d`;
    if(!owned)return null;
    await tx`SELECT pg_advisory_xact_lock(hashtext(${`${userId}:${candidate.provenance.reviewedContractFingerprint}`}))`;
    const [existing]=await tx<OperationalDatasetRow[]>`SELECT operational_dataset_id,dataset_key,workspace_id,owner_user_id,dataset_draft_id,display_name,lifecycle_state,contract_version,contract_fingerprint,candidate_fingerprint,public_contract_json,created_at,updated_at,archived_at FROM app.operational_dataset WHERE workspace_id=${owned.workspace_id}::uuid AND contract_fingerprint=${candidate.provenance.reviewedContractFingerprint}`;
    if(existing){
      if(existing.dataset_draft_id!==draftId||existing.contract_version!==candidate.schemaVersion||existing.candidate_fingerprint!==candidate.identity.candidateFingerprint)throw new OperationalDatasetConflictError("The reviewed contract is already registered with different immutable activation data");
      return {dataset:existing,created:false};
    }
    const [dataset]=await tx<OperationalDatasetRow[]>`INSERT INTO app.operational_dataset(workspace_id,owner_user_id,dataset_draft_id,display_name,contract_version,contract_fingerprint,candidate_fingerprint,public_contract_json) VALUES(${owned.workspace_id}::uuid,${userId}::uuid,${draftId}::uuid,${candidate.identity.displayName},${candidate.schemaVersion},${candidate.provenance.reviewedContractFingerprint},${candidate.identity.candidateFingerprint},${tx.json(candidate.publicContract as never)}) RETURNING operational_dataset_id,dataset_key,workspace_id,owner_user_id,dataset_draft_id,display_name,lifecycle_state,contract_version,contract_fingerprint,candidate_fingerprint,public_contract_json,created_at,updated_at,archived_at`;
    await tx`INSERT INTO app.audit_event(user_id,event_type,target_id,details) VALUES(${userId}::uuid,'operational_dataset.activated',${dataset.operational_dataset_id},${tx.json({schemaVersion:dataset.contract_version,lifecycleState:dataset.lifecycle_state} as never)})`;
    return {dataset,created:true};
  });}finally{await sql.end();}
}

export async function listOperationalDatasets(userId:string){const sql=database();try{return await sql<OperationalDatasetRow[]>`SELECT operational_dataset_id,dataset_key,workspace_id,owner_user_id,dataset_draft_id,display_name,lifecycle_state,contract_version,contract_fingerprint,candidate_fingerprint,public_contract_json,created_at,updated_at,archived_at FROM app.operational_dataset WHERE owner_user_id=${userId}::uuid ORDER BY created_at DESC`;}finally{await sql.end();}}
export async function getOperationalDataset(userId:string,datasetId:string){const sql=database();try{const [row]=await sql<OperationalDatasetRow[]>`SELECT operational_dataset_id,dataset_key,workspace_id,owner_user_id,dataset_draft_id,display_name,lifecycle_state,contract_version,contract_fingerprint,candidate_fingerprint,public_contract_json,created_at,updated_at,archived_at FROM app.operational_dataset WHERE owner_user_id=${userId}::uuid AND operational_dataset_id=${datasetId}::uuid`;return row||null;}finally{await sql.end();}}
export async function getOperationalDatasetByKey(userId:string,datasetKey:string){const sql=database();try{const [row]=await sql<OperationalDatasetRow[]>`SELECT operational_dataset_id,dataset_key,workspace_id,owner_user_id,dataset_draft_id,display_name,lifecycle_state,contract_version,contract_fingerprint,candidate_fingerprint,public_contract_json,created_at,updated_at,archived_at FROM app.operational_dataset WHERE owner_user_id=${userId}::uuid AND dataset_key=${datasetKey}`;return row||null;}finally{await sql.end();}}

export async function updateOperationalDatasetState(userId:string,datasetId:string,state:OperationalDatasetState){
  const sql=database();try{return await sql.begin(async tx=>{
    const [row]=await tx<OperationalDatasetRow[]>`UPDATE app.operational_dataset SET lifecycle_state=${state} WHERE owner_user_id=${userId}::uuid AND operational_dataset_id=${datasetId}::uuid RETURNING operational_dataset_id,dataset_key,workspace_id,owner_user_id,dataset_draft_id,display_name,lifecycle_state,contract_version,contract_fingerprint,candidate_fingerprint,public_contract_json,created_at,updated_at,archived_at`;
    if(!row)return null;
    await tx`INSERT INTO app.audit_event(user_id,event_type,target_id,details) VALUES(${userId}::uuid,'operational_dataset.lifecycle_changed',${row.operational_dataset_id},${tx.json({lifecycleState:row.lifecycle_state} as never)})`;
    return row;
  });}finally{await sql.end();}
}
