CREATE TABLE IF NOT EXISTS app.public_share_request (
  request_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  share_id uuid NOT NULL REFERENCES app.dive_share(share_id) ON DELETE CASCADE,
  key_hash char(64) NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS public_share_request_key_time_idx
  ON app.public_share_request(key_hash,occurred_at DESC);
CREATE INDEX IF NOT EXISTS public_share_request_time_idx
  ON app.public_share_request(occurred_at DESC);
