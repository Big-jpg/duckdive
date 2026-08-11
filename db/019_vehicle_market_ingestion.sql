CREATE TABLE IF NOT EXISTS ops.vehicle_market_ingestion_run (
  run_id uuid PRIMARY KEY,
  source text NOT NULL CHECK(source='autotrader'),
  market text NOT NULL CHECK(market='wa-used'),
  observation_date date NOT NULL,
  scope_version text NOT NULL,
  scope jsonb NOT NULL CHECK(jsonb_typeof(scope)='object'),
  scope_fingerprint text NOT NULL CHECK(scope_fingerprint ~ '^[a-f0-9]{64}$'),
  source_total_start integer,
  source_total_end integer,
  pages_expected integer,
  pages_fetched integer NOT NULL DEFAULT 0,
  raw_hits integer NOT NULL DEFAULT 0,
  unique_listing_ids integer NOT NULL DEFAULT 0,
  duplicate_hits integer NOT NULL DEFAULT 0,
  scope_violations integer NOT NULL DEFAULT 0,
  vehicle_class_profile jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(vehicle_class_profile)='object'),
  missing_vehicle_class integer NOT NULL DEFAULT 0,
  adapter_version text NOT NULL,
  parser_version text NOT NULL,
  schema_version text NOT NULL,
  model_version text NOT NULL,
  status text NOT NULL DEFAULT 'RUNNING' CHECK(status IN ('RUNNING','COMPLETE','CHANGED_DURING_CAPTURE','PARTIAL','INVALID')),
  collection_duration_ms bigint,
  error_summary jsonb NOT NULL DEFAULT '[]'::jsonb CHECK(jsonb_typeof(error_summary)='array'),
  started_at timestamptz NOT NULL,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS vehicle_market_run_status_time_idx
  ON ops.vehicle_market_ingestion_run(status,started_at DESC);
CREATE INDEX IF NOT EXISTS vehicle_market_run_scope_time_idx
  ON ops.vehicle_market_ingestion_run(scope_fingerprint,started_at DESC);

CREATE TABLE IF NOT EXISTS ops.vehicle_market_raw_object (
  raw_object_id uuid PRIMARY KEY,
  run_id uuid NOT NULL REFERENCES ops.vehicle_market_ingestion_run(run_id),
  object_reference text NOT NULL UNIQUE,
  payload_sha256 text NOT NULL CHECK(payload_sha256 ~ '^[a-f0-9]{64}$'),
  response_bytes bigint NOT NULL CHECK(response_bytes >= 0),
  media_type text NOT NULL DEFAULT 'application/json',
  persisted_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(run_id,object_reference,payload_sha256)
);

CREATE TABLE IF NOT EXISTS ops.vehicle_market_ingestion_request (
  request_id uuid PRIMARY KEY,
  run_id uuid NOT NULL REFERENCES ops.vehicle_market_ingestion_run(run_id),
  request_role text NOT NULL CHECK(request_role IN ('capture','consistency_probe')),
  page_number integer NOT NULL CHECK(page_number >= 1),
  attempt_number integer NOT NULL CHECK(attempt_number >= 1),
  request_url text NOT NULL,
  request_parameters jsonb NOT NULL CHECK(jsonb_typeof(request_parameters)='object'),
  requested_at timestamptz NOT NULL,
  response_received_at timestamptz,
  duration_ms bigint,
  http_status integer CHECK(http_status BETWEEN 100 AND 599),
  raw_object_id uuid REFERENCES ops.vehicle_market_raw_object(raw_object_id),
  source_current_page integer,
  source_last_page integer,
  source_total integer,
  source_returned integer,
  network_error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(run_id,request_role,page_number,attempt_number),
  CHECK((http_status IS NULL AND raw_object_id IS NULL) OR (http_status IS NOT NULL AND raw_object_id IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS vehicle_market_request_run_page_idx
  ON ops.vehicle_market_ingestion_request(run_id,request_role,page_number,attempt_number);

CREATE TABLE IF NOT EXISTS ops.vehicle_market_validation_result (
  validation_result_id uuid PRIMARY KEY,
  run_id uuid NOT NULL REFERENCES ops.vehicle_market_ingestion_run(run_id),
  request_id uuid REFERENCES ops.vehicle_market_ingestion_request(request_id),
  source_listing_id text,
  validation_code text NOT NULL,
  severity text NOT NULL CHECK(severity IN ('warning','error')),
  detail jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(detail)='object'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS vehicle_market_validation_run_idx
  ON ops.vehicle_market_validation_result(run_id,severity,validation_code);

CREATE TABLE IF NOT EXISTS ops.vehicle_market_publication_result (
  publication_result_id uuid PRIMARY KEY,
  run_id uuid NOT NULL REFERENCES ops.vehicle_market_ingestion_run(run_id),
  target_database text NOT NULL,
  target_snapshot_id text,
  status text NOT NULL CHECK(status IN ('pending','published','reconciled','failed')),
  source_rows bigint,
  fact_rows bigint,
  dimension_counts jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(dimension_counts)='object'),
  reconciliation_fingerprint text CHECK(reconciliation_fingerprint IS NULL OR reconciliation_fingerprint ~ '^[a-f0-9]{64}$'),
  error_summary text,
  started_at timestamptz NOT NULL,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS vehicle_market_publication_run_target_idx
  ON ops.vehicle_market_publication_result(run_id,target_database);

CREATE OR REPLACE FUNCTION ops.reject_vehicle_market_raw_object_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'vehicle-market raw object metadata is immutable';
END $$;

DROP TRIGGER IF EXISTS reject_vehicle_market_raw_object_update ON ops.vehicle_market_raw_object;
CREATE TRIGGER reject_vehicle_market_raw_object_update
BEFORE UPDATE ON ops.vehicle_market_raw_object
FOR EACH ROW EXECUTE FUNCTION ops.reject_vehicle_market_raw_object_mutation();

DROP TRIGGER IF EXISTS reject_vehicle_market_raw_object_delete ON ops.vehicle_market_raw_object;
CREATE TRIGGER reject_vehicle_market_raw_object_delete
BEFORE DELETE ON ops.vehicle_market_raw_object
FOR EACH ROW EXECUTE FUNCTION ops.reject_vehicle_market_raw_object_mutation();
