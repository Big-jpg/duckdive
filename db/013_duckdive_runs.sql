CREATE TABLE IF NOT EXISTS app.duckdive_run (
  run_id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES app.workspace(workspace_id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES app.app_user(user_id) ON DELETE CASCADE,
  chat_session_id uuid NOT NULL REFERENCES app.chat_session(chat_session_id) ON DELETE CASCADE,
  dive_id text NOT NULL,
  request_text text NOT NULL,
  status text NOT NULL DEFAULT 'running' CHECK(status IN ('running','clarification','applied','no_change','failed','aborted')),
  before_version integer NOT NULL CHECK(before_version >= 1),
  after_version integer CHECK(after_version >= before_version),
  source_hash_before text NOT NULL,
  source_hash_after text,
  model text NOT NULL,
  assistant_summary text,
  error_code text,
  input_tokens bigint NOT NULL DEFAULT 0,
  output_tokens bigint NOT NULL DEFAULT 0,
  duration_ms integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS duckdive_run_one_active_per_dive
  ON app.duckdive_run(workspace_id,dive_id) WHERE status='running';
CREATE INDEX IF NOT EXISTS duckdive_run_user_time_idx
  ON app.duckdive_run(user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS duckdive_run_status_time_idx
  ON app.duckdive_run(status,created_at DESC);
