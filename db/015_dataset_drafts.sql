CREATE TABLE IF NOT EXISTS app.dataset_draft (
  dataset_draft_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES app.app_user(user_id) ON DELETE CASCADE,
  display_name text NOT NULL CHECK(length(btrim(display_name)) BETWEEN 1 AND 300),
  source_kind text NOT NULL CHECK(source_kind='fabric-tmdl'),
  schema_version text NOT NULL CHECK(schema_version='semantic-contract/v1'),
  archive_fingerprint text NOT NULL CHECK(archive_fingerprint ~ '^[a-f0-9]{64}$'),
  contract_fingerprint text NOT NULL CHECK(contract_fingerprint ~ '^[a-f0-9]{64}$'),
  contract_json jsonb NOT NULL CHECK(jsonb_typeof(contract_json)='object'),
  diagnostics_json jsonb NOT NULL DEFAULT '[]'::jsonb CHECK(jsonb_typeof(diagnostics_json)='array'),
  security_summary_json jsonb CHECK(security_summary_json IS NULL OR jsonb_typeof(security_summary_json)='object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id,contract_fingerprint),
  CHECK(contract_json::text !~* '(https?://|onelake\.dfs\.fabric\.microsoft\.com|rawtmdl|connectionstring|sourceexpression|mexpression)')
);

CREATE INDEX IF NOT EXISTS dataset_draft_user_created_idx
  ON app.dataset_draft(user_id,created_at DESC);
