import {readFile} from "node:fs/promises";
import path from "node:path";
import {describe,expect,it} from "vitest";
import {analyticsPolicy} from "./analytics-contract";
import {VIC_HOUSING_DATASET,resolveDatasetRuntime} from "./datasets";
import {DIVE_THEME_CSS,buildWorkspaceEditorDives,renderDiveSource,starterEntries,workspaceDatasetProvisioningPlan} from "./dive-provisioning";
import type {WorkspaceDive} from "./workspace-dives";

const runtime=resolveDatasetRuntime(VIC_HOUSING_DATASET,{
  MOTHERDUCK_DATABASE:"vic_house_data",
  MOTHERDUCK_SHARE_URL:"md:_share/vic/test",
  MOTHERDUCK_SHARED_SERVICE_ACCOUNT_USERNAME:"vic_house_lab",
});

function ownership(datasetKey:string=VIC_HOUSING_DATASET.key):WorkspaceDive[]{
  return VIC_HOUSING_DATASET.starters.map((starter,index)=>({
    workspace_id:"workspace",
    dataset_key:datasetKey,
    starter_key:starter.key,
    dive_id:`dive-${index}`,
    source_dive_id:`source-${index}`,
  }));
}

function legacyVicRender(source:string){
  return source
    .replaceAll("__DUCKDIVE_THEME_CSS__",DIVE_THEME_CSS)
    .replaceAll("__MOTHERDUCK_SHARE_URL__",runtime.motherduckShareUrl)
    .replaceAll("__PRICE_MIN__",String(analyticsPolicy.priceAud.minimum))
    .replaceAll("__PRICE_MAX__",String(analyticsPolicy.priceAud.maximum))
    .replaceAll("__LAND_MIN__",String(analyticsPolicy.landSizeSqm.minimum))
    .replaceAll("__LAND_MAX__",String(analyticsPolicy.landSizeSqm.maximum));
}

describe("Dive source rendering",()=>{
  it("exposes a safe, dataset-bound question entry catalogue",()=>{
    const entries=starterEntries(VIC_HOUSING_DATASET);
    expect(entries.map(entry=>entry.key)).toEqual(["market-pulse","suburb-story","market-matchup"]);
    expect(entries.every(entry=>entry.datasetKey==="vic-housing"&&entry.questions.length>0)).toBe(true);
    expect(entries).not.toHaveProperty("0.file");
    expect(JSON.stringify(entries)).not.toMatch(/token|password|share_url/i);
  });

  it("builds the editor manifest only from exact registered ownership",()=>{
    const dives=buildWorkspaceEditorDives(ownership(),VIC_HOUSING_DATASET);
    expect(dives.map(dive=>({key:dive.key,datasetKey:dive.datasetKey,diveId:dive.diveId,contractVersion:dive.contractVersion}))).toEqual([
      {key:"market-pulse",datasetKey:"vic-housing",diveId:"dive-0",contractVersion:"vic-housing/v1"},
      {key:"suburb-story",datasetKey:"vic-housing",diveId:"dive-1",contractVersion:"vic-housing/v1"},
      {key:"market-matchup",datasetKey:"vic-housing",diveId:"dive-2",contractVersion:"vic-housing/v1"},
    ]);
    expect(()=>buildWorkspaceEditorDives(ownership().filter(row=>row.starter_key!=="suburb-story"),VIC_HOUSING_DATASET)).toThrow("missing registered ownership");
    expect(()=>buildWorkspaceEditorDives(ownership("other"),VIC_HOUSING_DATASET)).toThrow("belongs to another dataset");
  });

  it("creates only missing starters and preserves mappings from older datasets",()=>{
    const stale={...ownership()[0],dataset_key:"older-default",starter_key:"older-report",dive_id:"older-dive"};
    const active=ownership().slice(0,2);
    const plan=workspaceDatasetProvisioningPlan([...active,stale],VIC_HOUSING_DATASET);
    expect(plan.missing.map(starter=>starter.key)).toEqual(["market-matchup"]);
    expect(plan.preserved).toEqual([stale]);
    expect(workspaceDatasetProvisioningPlan(ownership(),VIC_HOUSING_DATASET).missing).toEqual([]);
  });

  it("fails closed on conflicting and unregistered active mappings",()=>{
    expect(()=>workspaceDatasetProvisioningPlan([{...ownership()[0],dataset_key:"other"}],VIC_HOUSING_DATASET)).toThrow("belongs to another dataset");
    expect(()=>workspaceDatasetProvisioningPlan([{...ownership()[0],starter_key:"unknown"}],VIC_HOUSING_DATASET)).toThrow("unregistered");
  });

  it("keeps every rendered VIC starter byte-equivalent to the previous renderer",async()=>{
    for(const starter of VIC_HOUSING_DATASET.starters){
      const source=await readFile(path.join(process.cwd(),"src","dives",starter.file),"utf8");
      expect(renderDiveSource(source,VIC_HOUSING_DATASET,runtime)).toBe(legacyVicRender(source));
    }
  });

  it("rejects unresolved source-template tokens",()=>{
    expect(()=>renderDiveSource("__UNKNOWN_DATASET_VALUE__",VIC_HOUSING_DATASET,runtime)).toThrow("Unresolved Dive source template values");
  });

  it("uses sandbox-safe time aliases in starter queries",async()=>{
    const files=["market-pulse.tsx","suburb-story.tsx"];
    const sources=await Promise.all(files.map(file=>readFile(path.join(process.cwd(),"src","dives",file),"utf8")));
    expect(sources.join("\n")).not.toMatch(/\)\s+(?:month|year)\s*,/i);
    expect(sources[0]).toContain("AS sale_month");
    expect(sources[1]).toContain("AS sale_year");
  });
});
