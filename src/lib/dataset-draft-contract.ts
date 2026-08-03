import {createHash} from "node:crypto";
import {reviewedSemanticContractV1Schema,semanticContractFingerprintInput,semanticContractPrivacyIssues,type ReviewedSemanticContractV1} from "./semantic-model-types";

export const DATASET_DRAFT_BODY_LIMIT=2*1024*1024;

export function expectedSemanticContractFingerprint(contract:ReviewedSemanticContractV1){return createHash("sha256").update(semanticContractFingerprintInput(contract)).digest("hex");}

export function validateDatasetDraftPayload(value:unknown){
  const parsed=reviewedSemanticContractV1Schema.safeParse(value);
  if(!parsed.success)return {ok:false as const,error:"The reviewed semantic contract is invalid",issues:parsed.error.issues.map(issue=>issue.path.join(".")).slice(0,20)};
  const privacyIssues=semanticContractPrivacyIssues(parsed.data);
  if(privacyIssues.length)return {ok:false as const,error:"The contract contains prohibited connectivity or raw-model detail",issues:privacyIssues.slice(0,20)};
  if(expectedSemanticContractFingerprint(parsed.data)!==parsed.data.identity.contractFingerprint)return {ok:false as const,error:"The contract fingerprint does not match the reviewed content",issues:[]};
  return {ok:true as const,contract:parsed.data};
}

export function datasetDraftResponse(row:{dataset_draft_id:string;display_name:string;source_kind:string;schema_version:string;archive_fingerprint:string;contract_fingerprint:string;contract_json:ReviewedSemanticContractV1;created_at:string}){
  return {id:row.dataset_draft_id,displayName:row.display_name,sourceKind:row.source_kind,schemaVersion:row.schema_version,archiveFingerprint:row.archive_fingerprint,contractFingerprint:row.contract_fingerprint,contract:row.contract_json,createdAt:row.created_at};
}

export function datasetDraftSummaryResponse(row:{dataset_draft_id:string;display_name:string;source_kind:string;schema_version:string;archive_fingerprint:string;contract_fingerprint:string;created_at:string}){
  return {id:row.dataset_draft_id,displayName:row.display_name,sourceKind:row.source_kind,schemaVersion:row.schema_version,archiveFingerprint:row.archive_fingerprint,contractFingerprint:row.contract_fingerprint,createdAt:row.created_at};
}
