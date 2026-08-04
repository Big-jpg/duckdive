import {readFile} from "node:fs/promises";
import {describe,expect,it} from "vitest";

describe("operational runtime migration",()=>{it("is additive, guarded, revocable, and credential-free",async()=>{
  const sql=await readFile(new URL("../db/017_operational_runtime.sql",import.meta.url),"utf8");
  expect(sql).toContain("ADD COLUMN IF NOT EXISTS reconciliation_status");expect(sql).toContain("guard_operational_dataset_binding_update");expect(sql).toContain("binding_state='revoked'");expect(sql).toContain("cannot be reactivated");expect(sql).toContain("ready operational runtime bindings require successful reconciliation");expect(sql).not.toMatch(/MOTHERDUCK_TOKEN|password|connection_string/i);
});});

describe("operational runtime resource reference migration",()=>{it("replaces the unsupported bounded regular expression with an explicit length check",async()=>{
  const sql=await readFile(new URL("../db/018_operational_runtime_resource_reference.sql",import.meta.url),"utf8");
  expect(sql).toContain("DROP CONSTRAINT IF EXISTS operational_dataset_binding_resource_reference_check");expect(sql).toContain("length(resource_reference) BETWEEN 1 AND 300");expect(sql).toContain("^[A-Za-z][A-Za-z0-9_.-]*$");expect(sql).not.toContain("{0,299}");
});});
