CREATE TABLE IF NOT EXISTS app.duckdive_report_version (
  workspace_id uuid NOT NULL REFERENCES app.workspace(workspace_id) ON DELETE CASCADE,
  dive_id text NOT NULL,
  version integer NOT NULL CHECK(version >= 1),
  source_hash text NOT NULL,
  purpose_json jsonb NOT NULL,
  change_manifest_json jsonb NOT NULL,
  run_id uuid REFERENCES app.duckdive_run(run_id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(workspace_id,dive_id,version)
);
CREATE INDEX IF NOT EXISTS duckdive_report_version_dive_idx ON app.duckdive_report_version(workspace_id,dive_id,version DESC);
