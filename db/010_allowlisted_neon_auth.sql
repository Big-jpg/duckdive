ALTER TABLE app.app_user
  ALTER COLUMN password_hash DROP NOT NULL;

ALTER TABLE app.app_user
  ADD COLUMN IF NOT EXISTS auth_subject text,
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'member',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS invited_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz,
  ADD COLUMN IF NOT EXISTS revoked_at timestamptz;

UPDATE app.app_user SET invited_at=created_at WHERE invited_at IS NULL;

ALTER TABLE app.app_user
  DROP CONSTRAINT IF EXISTS app_user_role_check,
  ADD CONSTRAINT app_user_role_check CHECK(role IN ('member','admin')),
  DROP CONSTRAINT IF EXISTS app_user_status_check,
  ADD CONSTRAINT app_user_status_check CHECK(status IN ('active','revoked'));

CREATE UNIQUE INDEX IF NOT EXISTS app_user_auth_subject_uidx
  ON app.app_user(auth_subject) WHERE auth_subject IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS app_user_normalized_email_uidx
  ON app.app_user(lower(email));

CREATE TABLE IF NOT EXISTS app.auth_webhook_event (
  event_id uuid PRIMARY KEY,
  event_type text NOT NULL,
  status text NOT NULL DEFAULT 'processing' CHECK(status IN ('processing','succeeded','failed')),
  attempt_count integer NOT NULL DEFAULT 1,
  last_error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

