CREATE TABLE IF NOT EXISTS app.workspace_dive (
  workspace_id uuid NOT NULL REFERENCES app.workspace(workspace_id) ON DELETE CASCADE,
  dataset_key text NOT NULL CHECK(dataset_key ~ '^[a-z][a-z0-9-]*$'),
  starter_key text NOT NULL CHECK(starter_key ~ '^[a-z][a-z0-9-]*$'),
  dive_id text NOT NULL CHECK(length(btrim(dive_id))>0),
  source_dive_id text NOT NULL CHECK(length(btrim(source_dive_id))>0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(workspace_id,starter_key),
  UNIQUE(dive_id)
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM app.workspace w
    CROSS JOIN LATERAL (
      SELECT key FROM jsonb_object_keys(w.dive_ids) key
      UNION
      SELECT key FROM jsonb_object_keys(w.source_dive_ids) key
    ) keys
    WHERE keys.key NOT IN ('market-pulse','suburb-story','market-matchup')
  ) THEN
    RAISE EXCEPTION 'workspace Dive backfill contains an unregistered starter key';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM app.workspace w
    CROSS JOIN LATERAL (
      SELECT coalesce(owned.key,source.key) key,owned.value dive_id,source.value source_dive_id
      FROM jsonb_each_text(w.dive_ids) owned
      FULL JOIN jsonb_each_text(w.source_dive_ids) source USING(key)
    ) mapping
    WHERE mapping.dive_id IS NULL OR mapping.source_dive_id IS NULL
      OR length(btrim(mapping.dive_id))=0 OR length(btrim(mapping.source_dive_id))=0
  ) THEN
    RAISE EXCEPTION 'workspace Dive backfill contains missing or blank paired IDs';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM app.workspace w
    CROSS JOIN LATERAL jsonb_each_text(w.dive_ids) owned
    GROUP BY owned.value
    HAVING count(*)>1
  ) THEN
    RAISE EXCEPTION 'workspace Dive backfill contains duplicate owned Dive IDs';
  END IF;
END $$;

INSERT INTO app.workspace_dive(workspace_id,dataset_key,starter_key,dive_id,source_dive_id)
SELECT w.workspace_id,'vic-housing',owned.key,owned.value,source.value
FROM app.workspace w
CROSS JOIN LATERAL jsonb_each_text(w.dive_ids) owned
JOIN LATERAL jsonb_each_text(w.source_dive_ids) source ON source.key=owned.key
ON CONFLICT(workspace_id,starter_key) DO NOTHING;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM app.workspace w
    CROSS JOIN LATERAL jsonb_each_text(w.dive_ids) owned
    JOIN LATERAL jsonb_each_text(w.source_dive_ids) source ON source.key=owned.key
    FULL JOIN app.workspace_dive wd
      ON wd.workspace_id=w.workspace_id AND wd.starter_key=owned.key
    WHERE wd.workspace_id IS NULL OR w.workspace_id IS NULL
      OR wd.dataset_key<>'vic-housing'
      OR wd.dive_id<>owned.value OR wd.source_dive_id<>source.value
  ) THEN
    RAISE EXCEPTION 'workspace Dive relational ownership does not exactly match legacy ownership';
  END IF;
END $$;

