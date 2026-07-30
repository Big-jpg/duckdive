CREATE TABLE IF NOT EXISTS app.dive_share (
  share_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES app.workspace(workspace_id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES app.app_user(user_id) ON DELETE CASCADE,
  dive_id text NOT NULL,
  starter_key text NOT NULL CHECK(starter_key IN ('market-pulse','suburb-story','market-matchup')),
  slug text NOT NULL UNIQUE CHECK(slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','revoked')),
  expires_at timestamptz,
  view_count bigint NOT NULL DEFAULT 0 CHECK(view_count >= 0),
  last_viewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS dive_share_active_dive_idx
  ON app.dive_share(workspace_id,dive_id)
  WHERE status='active';

CREATE INDEX IF NOT EXISTS dive_share_owner_idx
  ON app.dive_share(created_by,created_at DESC);

CREATE INDEX IF NOT EXISTS dive_share_slug_lookup_idx
  ON app.dive_share(slug)
  WHERE status='active';
