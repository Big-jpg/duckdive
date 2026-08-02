import {database} from "../src/lib/db";

const sql=database(process.env.DATABASE_URL_UNPOOLED??process.env.DATABASE_URL);
try {
  const [actual]=await sql<{
    workspaces:number;legacy_owned_rows:number;legacy_source_rows:number;relational_rows:number;
    mismatched_rows:number;duplicate_dive_ids:number;unknown_starter_rows:number;owned_lookup_rows:number;cross_workspace_rows:number;
  }[]>`
    WITH owned AS (
      SELECT w.workspace_id,e.key starter_key,e.value dive_id
      FROM app.workspace w CROSS JOIN LATERAL jsonb_each_text(w.dive_ids) e
    ), source AS (
      SELECT w.workspace_id,e.key starter_key,e.value source_dive_id
      FROM app.workspace w CROSS JOIN LATERAL jsonb_each_text(w.source_dive_ids) e
    ), legacy AS (
      SELECT coalesce(o.workspace_id,s.workspace_id) workspace_id,
        coalesce(o.starter_key,s.starter_key) starter_key,o.dive_id,s.source_dive_id
      FROM owned o FULL JOIN source s USING(workspace_id,starter_key)
    ), comparison AS (
      SELECT legacy.workspace_id legacy_workspace_id,wd.workspace_id relational_workspace_id,
        legacy.starter_key legacy_starter_key,wd.starter_key relational_starter_key,
        legacy.dive_id legacy_dive_id,wd.dive_id relational_dive_id,
        legacy.source_dive_id legacy_source_dive_id,wd.source_dive_id relational_source_dive_id,
        wd.dataset_key
      FROM legacy FULL JOIN app.workspace_dive wd USING(workspace_id,starter_key)
    )
    SELECT
      (SELECT count(*) FROM app.workspace)::int workspaces,
      (SELECT count(*) FROM owned)::int legacy_owned_rows,
      (SELECT count(*) FROM source)::int legacy_source_rows,
      (SELECT count(*) FROM app.workspace_dive)::int relational_rows,
      (SELECT count(*) FROM comparison WHERE legacy_workspace_id IS NULL OR relational_workspace_id IS NULL
        OR legacy_dive_id<>relational_dive_id OR legacy_source_dive_id<>relational_source_dive_id
        OR dataset_key<>'vic-housing')::int mismatched_rows,
      (SELECT count(*) FROM (SELECT dive_id FROM app.workspace_dive GROUP BY dive_id HAVING count(*)>1) duplicates)::int duplicate_dive_ids,
      (SELECT count(*) FROM app.workspace_dive WHERE starter_key NOT IN ('market-pulse','suburb-story','market-matchup'))::int unknown_starter_rows,
      (SELECT count(*) FROM app.workspace w JOIN app.workspace_dive wd USING(workspace_id))::int owned_lookup_rows,
      (SELECT count(*) FROM app.workspace requester
        JOIN app.workspace_dive foreign_dive ON foreign_dive.workspace_id<>requester.workspace_id
        JOIN app.workspace owner ON owner.user_id=requester.user_id
        JOIN app.workspace_dive authorized ON authorized.workspace_id=owner.workspace_id AND authorized.dive_id=foreign_dive.dive_id)::int cross_workspace_rows
  `;
  const checks={
    exactRowCounts:Number(actual.legacy_owned_rows)===Number(actual.legacy_source_rows)&&Number(actual.legacy_owned_rows)===Number(actual.relational_rows),
    exactMappings:Number(actual.mismatched_rows)===0,
    uniqueOwnedDives:Number(actual.duplicate_dive_ids)===0,
    registeredStarters:Number(actual.unknown_starter_rows)===0,
    ownedLookupsComplete:Number(actual.owned_lookup_rows)===Number(actual.relational_rows),
    failClosedCrossWorkspace:Number(actual.cross_workspace_rows)===0,
  };
  console.log(JSON.stringify({workspaceDives:actual,checks},null,2));
  if(Object.values(checks).some(passed=>!passed))process.exitCode=1;
} finally {
  await sql.end();
}
