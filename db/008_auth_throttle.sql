CREATE TABLE IF NOT EXISTS app.auth_attempt (
  attempt_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  key_hash char(64) NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS auth_attempt_key_time_idx ON app.auth_attempt(key_hash,occurred_at DESC);
