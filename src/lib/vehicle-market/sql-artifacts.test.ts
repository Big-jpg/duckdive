import {readFile} from "node:fs/promises";
import path from "node:path";
import {describe,expect,it} from "vitest";

describe("vehicle-market SQL artifacts",()=>{
  it("uses only DuckLake-supported constraints and declares every governed view",async()=>{
    const sql=await readFile(path.resolve("db/ducklake/wa_vehicle_market.sql"),"utf8"),statements=sql.replace(/--.*$/gm,"");
    expect(statements).not.toMatch(/\b(?:PRIMARY KEY|FOREIGN KEY|UNIQUE|CHECK)\b/i);
    for(const view of ["vehicle_market_current","vehicle_market_history","listing_lifecycle","listing_events","market_timeseries","vehicle_screen","observation_run_quality"])expect(sql).toContain(`contract.${view}`);
    expect(sql).toContain("run_status IN ('COMPLETE','CHANGED_DURING_CAPTURE')");
    expect(sql).toContain("FROM core.dim_observation_run WHERE run_status='COMPLETE'");
    expect(sql).not.toMatch(/CREATE TABLE[^;]*feature_bridge/is);
  });

  it("promotes staged rows with MERGE and fails closed on conflicting run or fact lineage",async()=>{
    const sql=await readFile(path.resolve("db/ducklake/load_vehicle_market_run.sql"),"utf8");
    expect(sql).toContain("BEGIN TRANSACTION");expect(sql).toContain("Conflicting run lineage");expect(sql).toContain("Conflicting observation fact lineage");expect(sql).toContain("MERGE INTO core.fact_listing_observation");expect(sql).toContain("COMMIT");
  });

  it("keeps the Neon migration additive under ops with immutable raw-object metadata",async()=>{
    const sql=await readFile(path.resolve("db/019_vehicle_market_ingestion.sql"),"utf8");
    expect(sql).toContain("ops.vehicle_market_ingestion_run");expect(sql).toContain("ops.vehicle_market_ingestion_request");expect(sql).toContain("ops.vehicle_market_raw_object");expect(sql).toContain("reject_vehicle_market_raw_object_update");
    expect(sql).not.toMatch(/DROP\s+(?:SCHEMA|TABLE)\s/i);
  });
});
