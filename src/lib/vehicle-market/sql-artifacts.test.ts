import {readFile} from "node:fs/promises";
import path from "node:path";
import {describe,expect,it} from "vitest";

describe("vehicle-market SQL artifacts",()=>{
  it("uses only DuckLake-supported constraints and declares every governed view",async()=>{
    const sql=await readFile(path.resolve("db/ducklake/wa_vehicle_market.sql"),"utf8"),statements=sql.replace(/--.*$/gm,"");
    expect(statements).not.toMatch(/\b(?:PRIMARY KEY|FOREIGN KEY|UNIQUE|CHECK)\b/i);
    for(const view of ["observation_run_comparability","vehicle_market_current","vehicle_market_history","listing_lifecycle","observation_pairs","listing_events","market_movement","market_timeseries","vehicle_screen","observation_run_quality"])expect(sql).toContain(`contract.${view}`);
    expect(sql).toContain("duplicate_hits BETWEEN 1 AND 10");
    expect(sql).toContain("duplicate_hits::DOUBLE/raw_hits<=0.001");
    expect(sql).toContain("'SNAPSHOT_INTERSECTION' AS comparison_basis");
    expect(sql).toContain("WHERE c.set_differences_available");
    expect(sql).not.toMatch(/WHERE\s+r\.run_status IN \('COMPLETE','CHANGED_DURING_CAPTURE'\)/);
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
