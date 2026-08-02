import {describe,expect,it} from "vitest";
import {buildWorkspaceDives,hasExactWorkspaceDives,workspaceDiveIds,type WorkspaceDive} from "./workspace-dives";

describe("relational workspace Dive ownership",()=>{
  it("builds registered, paired ownership rows",()=>{
    expect(buildWorkspaceDives(
      {"market-pulse":"owned-pulse","suburb-story":"owned-story"},
      {"market-pulse":"source-pulse","suburb-story":"source-story"},
    )).toEqual([
      {dataset_key:"vic-housing",starter_key:"market-pulse",dive_id:"owned-pulse",source_dive_id:"source-pulse"},
      {dataset_key:"vic-housing",starter_key:"suburb-story",dive_id:"owned-story",source_dive_id:"source-story"},
    ]);
  });

  it("fails closed for mismatched, unknown, blank, or duplicate ownership",()=>{
    expect(()=>buildWorkspaceDives({"market-pulse":"owned"},{})).toThrow("must match exactly");
    expect(()=>buildWorkspaceDives({unknown:"owned"},{unknown:"source"})).toThrow("Unregistered starter");
    expect(()=>buildWorkspaceDives({"market-pulse":" "},{"market-pulse":"source"})).toThrow("Missing Dive ID");
    expect(()=>buildWorkspaceDives(
      {"market-pulse":"owned","suburb-story":"owned"},
      {"market-pulse":"source-1","suburb-story":"source-2"},
    )).toThrow("Duplicate owned Dive ID");
  });

  it("reconstructs the legacy response shape without crossing workspaces",()=>{
    const rows=[
      {workspace_id:"a",dataset_key:"vic-housing",starter_key:"market-pulse",dive_id:"a-pulse",source_dive_id:"source"},
      {workspace_id:"a",dataset_key:"vic-housing",starter_key:"suburb-story",dive_id:"a-story",source_dive_id:"source"},
    ] satisfies WorkspaceDive[];
    expect(workspaceDiveIds(rows)).toEqual({"market-pulse":"a-pulse","suburb-story":"a-story"});
    expect(workspaceDiveIds(rows)).not.toHaveProperty("market-matchup");
    expect(hasExactWorkspaceDives(rows,["market-pulse","suburb-story"])).toBe(true);
    expect(hasExactWorkspaceDives(rows,["market-pulse","suburb-story","market-matchup"])).toBe(false);
    expect(hasExactWorkspaceDives([{...rows[0],dataset_key:"another-dataset"}], ["market-pulse"])).toBe(false);
  });
});
