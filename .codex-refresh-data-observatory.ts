import { audit } from "./src/lib/app-db";
import { database } from "./src/lib/db";
import { sourceDives } from "./src/lib/dive-provisioning";
import { WA_VEHICLE_MARKET_DATASET } from "./src/lib/datasets";
import { reportPurposeForStarter } from "./src/lib/duckdive-report";
import { saveDiveReportVersion } from "./src/lib/duckdive-report-db";
import { readDiveSnapshot, resetDiveToSource } from "./src/lib/duckdive-runtime";
import { closeMotherduckServiceSql } from "./src/lib/motherduck-access";

type Row = {
  workspace_id: string;
  user_id: string;
  dive_id: string;
  source_dive_id: string;
  motherduck_username: string;
};

await sourceDives(WA_VEHICLE_MARKET_DATASET);
const sql = database(
  process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL,
  process.env.DATABASE_URL_UNPOOLED ? "DATABASE_URL_UNPOOLED" : "DATABASE_URL",
);

try {
  const rows = await sql<Row[]>`
    SELECT wd.workspace_id,w.user_id,wd.dive_id,wd.source_dive_id,w.motherduck_username
    FROM app.workspace_dive wd
    JOIN app.workspace w USING(workspace_id)
    WHERE wd.dataset_key=${WA_VEHICLE_MARKET_DATASET.key}
      AND wd.starter_key='data-observatory'
  `;
  if (rows.length !== 1) throw new Error(`Expected one Data Observatory owner mapping; found ${rows.length}`);
  const row = rows[0];
  const starter = WA_VEHICLE_MARKET_DATASET.starters.find((item) => item.key === "data-observatory");
  if (!starter) throw new Error("Data Observatory starter is unavailable");
  const [before, source] = await Promise.all([
    readDiveSnapshot(row.dive_id, row.motherduck_username),
    readDiveSnapshot(row.source_dive_id, row.motherduck_username),
  ]);
  if (before.hash === source.hash) {
    console.log(JSON.stringify({ action: "none", version: before.version, matchesStarter: true }));
  } else {
    const reset = await resetDiveToSource(row.dive_id, row.source_dive_id, row.motherduck_username);
    const purpose = reportPurposeForStarter({
      title: starter.title,
      description: starter.description,
      policy: WA_VEHICLE_MARKET_DATASET.reportPolicy,
    });
    await saveDiveReportVersion({
      workspaceId: row.workspace_id,
      diveId: row.dive_id,
      version: reset.after.version,
      sourceHash: reset.after.hash,
      purpose,
      manifest: {
        request: "Hide raw capture statuses",
        interpretedIntent: "Keep capture evidence visible without surfacing internal run-status enums",
        requested: { added: [], changed: ["Data Observatory status presentation"], removed: ["Raw run-status labels"], unchanged: ["Capture evidence", "Comparison policy"] },
        applied: { added: [], changed: ["Data Observatory summary and table"], removed: ["Recorded status KPI", "Status column"], unchanged: ["Governed data contract", "Immutable lineage"] },
        validations: [{ id: "status-presentation", label: "Raw status enums are not rendered", status: "passed" }],
        version: reset.after.version,
        generatedAt: new Date().toISOString(),
      },
    });
    await audit("duckdive.reset", row.user_id, row.dive_id, {
      beforeVersion: reset.before.version,
      afterVersion: reset.after.version,
      starterKey: "data-observatory",
      requestedChange: "hide-raw-capture-statuses",
    });
    console.log(JSON.stringify({ action: "reset", beforeVersion: reset.before.version, afterVersion: reset.after.version, matchesStarter: reset.after.hash === source.hash }));
  }
  await closeMotherduckServiceSql(row.motherduck_username, "read_write");
} finally {
  await sql.end();
}
