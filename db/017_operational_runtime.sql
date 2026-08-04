ALTER TABLE app.operational_dataset_binding
  ADD COLUMN IF NOT EXISTS reconciliation_status text,
  ADD COLUMN IF NOT EXISTS reconciliation_fingerprint text,
  ADD COLUMN IF NOT EXISTS acknowledged_variance_codes jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS reconciled_at timestamptz,
  ADD COLUMN IF NOT EXISTS revoked_at timestamptz;

ALTER TABLE app.operational_dataset_binding
  DROP CONSTRAINT IF EXISTS operational_dataset_binding_reconciliation_status_check,
  DROP CONSTRAINT IF EXISTS operational_dataset_binding_reconciliation_fingerprint_check,
  DROP CONSTRAINT IF EXISTS operational_dataset_binding_acknowledged_variance_codes_check;

ALTER TABLE app.operational_dataset_binding
  ADD CONSTRAINT operational_dataset_binding_reconciliation_status_check
    CHECK(reconciliation_status IS NULL OR reconciliation_status IN ('exact','acknowledged-variance')),
  ADD CONSTRAINT operational_dataset_binding_reconciliation_fingerprint_check
    CHECK(reconciliation_fingerprint IS NULL OR reconciliation_fingerprint ~ '^[a-f0-9]{64}$'),
  ADD CONSTRAINT operational_dataset_binding_acknowledged_variance_codes_check
    CHECK(jsonb_typeof(acknowledged_variance_codes)='array');

CREATE OR REPLACE FUNCTION app.guard_operational_dataset_binding_update()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.operational_dataset_id IS DISTINCT FROM NEW.operational_dataset_id
    OR OLD.adapter_kind IS DISTINCT FROM NEW.adapter_kind
    OR OLD.resource_reference IS DISTINCT FROM NEW.resource_reference
  THEN
    RAISE EXCEPTION 'operational runtime binding identity is immutable';
  END IF;

  IF OLD.binding_state='revoked' AND NEW.binding_state<>'revoked' THEN
    RAISE EXCEPTION 'revoked operational runtime bindings cannot be reactivated';
  END IF;
  IF OLD.binding_state='binding' AND NEW.binding_state NOT IN ('binding','ready','degraded','revoked') THEN
    RAISE EXCEPTION 'invalid operational runtime binding transition';
  ELSIF OLD.binding_state='ready' AND NEW.binding_state NOT IN ('ready','degraded','revoked') THEN
    RAISE EXCEPTION 'invalid operational runtime binding transition';
  ELSIF OLD.binding_state='degraded' AND NEW.binding_state NOT IN ('degraded','binding','ready','revoked') THEN
    RAISE EXCEPTION 'invalid operational runtime binding transition';
  END IF;

  IF NEW.binding_state='ready' AND (
    NEW.reconciliation_status NOT IN ('exact','acknowledged-variance')
    OR NEW.reconciliation_fingerprint IS NULL
    OR NEW.reconciled_at IS NULL
  ) THEN
    RAISE EXCEPTION 'ready operational runtime bindings require successful reconciliation';
  END IF;

  NEW.revoked_at=CASE WHEN NEW.binding_state='revoked' THEN coalesce(OLD.revoked_at,now()) ELSE NULL END;
  NEW.updated_at=now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS guard_operational_dataset_binding_update ON app.operational_dataset_binding;
CREATE TRIGGER guard_operational_dataset_binding_update
BEFORE UPDATE ON app.operational_dataset_binding
FOR EACH ROW EXECUTE FUNCTION app.guard_operational_dataset_binding_update();
