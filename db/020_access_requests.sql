CREATE TABLE IF NOT EXISTS app.access_request (
  request_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  name text NOT NULL,
  title text,
  dataset_interest text,
  status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','ignored')),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES app.app_user(user_id) ON DELETE SET NULL,
  approved_user_id uuid REFERENCES app.app_user(user_id) ON DELETE SET NULL,
  CONSTRAINT access_request_name_length CHECK(length(btrim(name)) BETWEEN 1 AND 100),
  CONSTRAINT access_request_email_length CHECK(length(btrim(email)) BETWEEN 3 AND 254),
  CONSTRAINT access_request_title_length CHECK(title IS NULL OR length(title)<=120),
  CONSTRAINT access_request_dataset_interest_length CHECK(dataset_interest IS NULL OR length(dataset_interest)<=1000)
);

CREATE UNIQUE INDEX IF NOT EXISTS access_request_normalized_email_uidx
  ON app.access_request(lower(email));
CREATE INDEX IF NOT EXISTS access_request_status_submitted_idx
  ON app.access_request(status,submitted_at DESC);

CREATE TABLE IF NOT EXISTS app.access_request_attempt (
  attempt_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  key_hash text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS access_request_attempt_key_time_idx
  ON app.access_request_attempt(key_hash,occurred_at DESC);
