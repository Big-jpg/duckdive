CREATE TABLE IF NOT EXISTS app.ai_gateway_setting (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  model text NOT NULL CHECK (model IN (
    'openai/gpt-5.6-sol',
    'openai/gpt-5.6-terra',
    'openai/gpt-5.6-luna'
  )),
  updated_by uuid REFERENCES app.app_user(user_id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

