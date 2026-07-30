ALTER TABLE app.auth_webhook_event
  ADD COLUMN IF NOT EXISTS response_json jsonb;

