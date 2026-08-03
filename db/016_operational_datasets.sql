CREATE UNIQUE INDEX IF NOT EXISTS workspace_id_user_uidx
  ON app.workspace(workspace_id,user_id);

CREATE UNIQUE INDEX IF NOT EXISTS dataset_draft_id_user_uidx
  ON app.dataset_draft(dataset_draft_id,user_id);

CREATE TABLE IF NOT EXISTS app.operational_dataset (
  operational_dataset_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_key text NOT NULL DEFAULT ('dataset-'||replace(gen_random_uuid()::text,'-',''))
    CHECK(dataset_key ~ '^dataset-[a-f0-9]{32}$'),
  workspace_id uuid NOT NULL,
  owner_user_id uuid NOT NULL,
  dataset_draft_id uuid NOT NULL,
  display_name text NOT NULL CHECK(length(btrim(display_name)) BETWEEN 1 AND 300),
  lifecycle_state text NOT NULL DEFAULT 'reviewed'
    CHECK(lifecycle_state IN ('reviewed','binding','ready','degraded','archived')),
  contract_version text NOT NULL CHECK(contract_version='operational-dataset-candidate/v1'),
  contract_fingerprint text NOT NULL CHECK(contract_fingerprint ~ '^[a-f0-9]{64}$'),
  candidate_fingerprint text NOT NULL CHECK(candidate_fingerprint ~ '^[a-f0-9]{64}$'),
  public_contract_json jsonb NOT NULL CHECK(jsonb_typeof(public_contract_json)='object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  UNIQUE(dataset_key),
  UNIQUE(workspace_id,contract_fingerprint),
  FOREIGN KEY(workspace_id,owner_user_id)
    REFERENCES app.workspace(workspace_id,user_id) ON DELETE CASCADE,
  FOREIGN KEY(dataset_draft_id,owner_user_id)
    REFERENCES app.dataset_draft(dataset_draft_id,user_id) ON DELETE RESTRICT,
  CHECK(public_contract_json::text !~* '(https?://|onelake\.dfs\.fabric\.microsoft\.com|rawtmdl|connectionstring|sourceexpression|mexpression|token|password|secret)')
);

CREATE INDEX IF NOT EXISTS operational_dataset_owner_created_idx
  ON app.operational_dataset(owner_user_id,created_at DESC);

CREATE TABLE IF NOT EXISTS app.operational_dataset_binding (
  operational_dataset_binding_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operational_dataset_id uuid NOT NULL UNIQUE REFERENCES app.operational_dataset(operational_dataset_id) ON DELETE CASCADE,
  adapter_kind text NOT NULL CHECK(adapter_kind ~ '^[a-z][a-z0-9-]*$'),
  resource_reference text NOT NULL CHECK(resource_reference ~ '^[A-Za-z][A-Za-z0-9_.-]{0,299}$'),
  binding_state text NOT NULL DEFAULT 'binding' CHECK(binding_state IN ('binding','ready','degraded','revoked')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK(resource_reference !~* '(token|password|secret|https?://|md:)')
);

CREATE OR REPLACE FUNCTION app.guard_operational_dataset_update()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.dataset_key IS DISTINCT FROM NEW.dataset_key
    OR OLD.workspace_id IS DISTINCT FROM NEW.workspace_id
    OR OLD.owner_user_id IS DISTINCT FROM NEW.owner_user_id
    OR OLD.dataset_draft_id IS DISTINCT FROM NEW.dataset_draft_id
    OR OLD.contract_version IS DISTINCT FROM NEW.contract_version
    OR OLD.contract_fingerprint IS DISTINCT FROM NEW.contract_fingerprint
    OR OLD.candidate_fingerprint IS DISTINCT FROM NEW.candidate_fingerprint
    OR OLD.public_contract_json IS DISTINCT FROM NEW.public_contract_json
  THEN
    RAISE EXCEPTION 'operational dataset identity and contract are immutable';
  END IF;

  IF OLD.lifecycle_state='archived' AND NEW.lifecycle_state<>'archived' THEN
    RAISE EXCEPTION 'archived operational datasets cannot be reactivated';
  END IF;
  IF OLD.lifecycle_state='reviewed' AND NEW.lifecycle_state NOT IN ('reviewed','binding','archived') THEN
    RAISE EXCEPTION 'invalid operational dataset lifecycle transition';
  ELSIF OLD.lifecycle_state='binding' AND NEW.lifecycle_state NOT IN ('binding','ready','degraded','archived') THEN
    RAISE EXCEPTION 'invalid operational dataset lifecycle transition';
  ELSIF OLD.lifecycle_state='ready' AND NEW.lifecycle_state NOT IN ('ready','degraded','archived') THEN
    RAISE EXCEPTION 'invalid operational dataset lifecycle transition';
  ELSIF OLD.lifecycle_state='degraded' AND NEW.lifecycle_state NOT IN ('degraded','binding','ready','archived') THEN
    RAISE EXCEPTION 'invalid operational dataset lifecycle transition';
  END IF;

  NEW.archived_at=CASE WHEN NEW.lifecycle_state='archived' THEN coalesce(OLD.archived_at,now()) ELSE NULL END;
  NEW.updated_at=now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS guard_operational_dataset_update ON app.operational_dataset;
CREATE TRIGGER guard_operational_dataset_update
BEFORE UPDATE ON app.operational_dataset
FOR EACH ROW EXECUTE FUNCTION app.guard_operational_dataset_update();
