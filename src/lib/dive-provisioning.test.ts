import {describe,expect,it} from "vitest";
import {readFile} from "node:fs/promises";
import path from "node:path";
import {buildWorkspaceEditorDives,renderDiveSource,starterEntries} from "./dive-provisioning";

describe("Dive source rendering",()=>{
  it("exposes a safe, dataset-bound question entry catalogue",()=>{
    const entries=starterEntries();
    expect(entries.map(entry=>entry.key)).toEqual(["market-pulse","suburb-story","market-matchup"]);
    expect(entries.every(entry=>entry.datasetKey==="vic-housing"&&entry.questions.length>0)).toBe(true);
    expect(entries).not.toHaveProperty("0.file");
    expect(JSON.stringify(entries)).not.toMatch(/token|password|share_url/i);
  });

  it("builds the editor manifest only from exact registered ownership",()=>{
    const owned=starterEntries().map((entry,index)=>({workspace_id:"workspace",dataset_key:entry.datasetKey,starter_key:entry.key,dive_id:`dive-${index}`,source_dive_id:`source-${index}`}));
    const dives=buildWorkspaceEditorDives(owned);
    expect(dives.map(dive=>({key:dive.key,datasetKey:dive.datasetKey,diveId:dive.diveId,contractVersion:dive.contractVersion}))).toEqual([
      {key:"market-pulse",datasetKey:"vic-housing",diveId:"dive-0",contractVersion:"vic-housing/v1"},
      {key:"suburb-story",datasetKey:"vic-housing",diveId:"dive-1",contractVersion:"vic-housing/v1"},
      {key:"market-matchup",datasetKey:"vic-housing",diveId:"dive-2",contractVersion:"vic-housing/v1"},
    ]);
    expect(()=>buildWorkspaceEditorDives(owned.filter(row=>row.starter_key!=="suburb-story"))).toThrow("missing registered ownership");
    expect(()=>buildWorkspaceEditorDives(owned.map(row=>row.starter_key==="market-pulse"?{...row,dataset_key:"other"}:row))).toThrow("missing registered ownership");
  });

  it("injects only the approved share and analytics policy",()=>{
    const rendered=renderDiveSource("__MOTHERDUCK_SHARE_URL__ __PRICE_MIN__ __PRICE_MAX__ __LAND_MIN__ __LAND_MAX__","md:_share/vic/test");
    expect(rendered).toBe("md:_share/vic/test 50000 20000000 50 10000");
  });

  it("uses sandbox-safe time aliases in starter queries",async()=>{
    const files=["market-pulse.tsx","suburb-story.tsx"];
    const sources=await Promise.all(files.map(file=>readFile(path.join(process.cwd(),"src","dives",file),"utf8")));
    expect(sources.join("\n")).not.toMatch(/\)\s+(?:month|year)\s*,/i);
    expect(sources[0]).toContain("AS sale_month");
    expect(sources[1]).toContain("AS sale_year");
  });

  it("injects the shared DuckDive visual contract",async()=>{
    const source=await readFile(path.join(process.cwd(),"src","dives","market-pulse.tsx"),"utf8");
    const rendered=renderDiveSource(source,"md:_share/vic/test");
    expect(rendered).not.toContain("__DUCKDIVE_THEME_CSS__");
    expect(rendered).toContain("--dd-sky:#58bbe3");
    expect(rendered).toContain("prefers-color-scheme:dark");
  });
});
