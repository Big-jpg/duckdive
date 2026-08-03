import {database} from "./db";
import type {ReviewedSemanticContractV1} from "./semantic-model-types";

export type DatasetDraftRow={
  dataset_draft_id:string;
  user_id:string;
  display_name:string;
  source_kind:"fabric-tmdl";
  schema_version:"semantic-contract/v1";
  archive_fingerprint:string;
  contract_fingerprint:string;
  contract_json:ReviewedSemanticContractV1;
  diagnostics_json:ReviewedSemanticContractV1["diagnostics"];
  security_summary_json:ReviewedSemanticContractV1["securitySummary"]|null;
  created_at:string;
};

export type DatasetDraftSummary=Pick<DatasetDraftRow,"dataset_draft_id"|"display_name"|"source_kind"|"schema_version"|"archive_fingerprint"|"contract_fingerprint"|"created_at">;

export async function createDatasetDraft(userId:string,contract:ReviewedSemanticContractV1){
  const sql=database();try{
    const [row]=await sql<DatasetDraftRow[]>`WITH inserted AS (
        INSERT INTO app.dataset_draft(user_id,display_name,source_kind,schema_version,archive_fingerprint,contract_fingerprint,contract_json,diagnostics_json,security_summary_json)
        VALUES(${userId}::uuid,${contract.identity.displayName},${contract.identity.sourceFormat},${contract.schemaVersion},${contract.identity.archiveFingerprint},${contract.identity.contractFingerprint},${sql.json(contract as never)},${sql.json(contract.diagnostics as never)},${contract.securitySummary?sql.json(contract.securitySummary as never):null})
        ON CONFLICT(user_id,contract_fingerprint) DO NOTHING
        RETURNING dataset_draft_id,user_id,display_name,source_kind,schema_version,archive_fingerprint,contract_fingerprint,contract_json,diagnostics_json,security_summary_json,created_at
      )
      SELECT * FROM inserted
      UNION ALL
      SELECT dataset_draft_id,user_id,display_name,source_kind,schema_version,archive_fingerprint,contract_fingerprint,contract_json,diagnostics_json,security_summary_json,created_at
      FROM app.dataset_draft WHERE user_id=${userId}::uuid AND contract_fingerprint=${contract.identity.contractFingerprint}
      LIMIT 1`;
    return row;
  }finally{await sql.end();}
}

export async function listDatasetDrafts(userId:string){
  const sql=database();try{return await sql<DatasetDraftSummary[]>`SELECT dataset_draft_id,display_name,source_kind,schema_version,archive_fingerprint,contract_fingerprint,created_at FROM app.dataset_draft WHERE user_id=${userId}::uuid ORDER BY created_at DESC`;}finally{await sql.end();}
}

export async function getDatasetDraft(userId:string,draftId:string){
  const sql=database();try{const [row]=await sql<DatasetDraftRow[]>`SELECT dataset_draft_id,user_id,display_name,source_kind,schema_version,archive_fingerprint,contract_fingerprint,contract_json,diagnostics_json,security_summary_json,created_at FROM app.dataset_draft WHERE user_id=${userId}::uuid AND dataset_draft_id=${draftId}::uuid`;return row||null;}finally{await sql.end();}
}

export async function deleteDatasetDraft(userId:string,draftId:string){
  const sql=database();try{const [row]=await sql<{dataset_draft_id:string}[]>`DELETE FROM app.dataset_draft WHERE user_id=${userId}::uuid AND dataset_draft_id=${draftId}::uuid RETURNING dataset_draft_id`;return row||null;}finally{await sql.end();}
}
