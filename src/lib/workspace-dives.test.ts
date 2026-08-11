import {describe,expect,it} from "vitest";
import {buildWorkspaceDives,hasExactWorkspaceDives,workspaceDiveIds,type WorkspaceDive} from "./workspace-dives";

describe("relational workspace Dive ownership",()=>{
  it("builds registered, paired ownership rows",()=>{
    expect(buildWorkspaceDives(
      {"vehicle-market-atlas":"owned-atlas","vehicle-lens":"owned-lens"},
      {"vehicle-market-atlas":"source-atlas","vehicle-lens":"source-lens"},
    )).toEqual([
      {dataset_key:"wa-vehicle-market",starter_key:"vehicle-lens",dive_id:"owned-lens",source_dive_id:"source-lens"},
      {dataset_key:"wa-vehicle-market",starter_key:"vehicle-market-atlas",dive_id:"owned-atlas",source_dive_id:"source-atlas"},
    ]);
  });

  it("fails closed for mismatched, unknown, blank, or duplicate ownership",()=>{
    expect(()=>buildWorkspaceDives({"vehicle-market-atlas":"owned"},{})).toThrow("must match exactly");
    expect(()=>buildWorkspaceDives({unknown:"owned"},{unknown:"source"})).toThrow("Unregistered starter");
    expect(()=>buildWorkspaceDives({"vehicle-market-atlas":" "},{"vehicle-market-atlas":"source"})).toThrow("Missing Dive ID");
    expect(()=>buildWorkspaceDives(
      {"vehicle-market-atlas":"owned","vehicle-lens":"owned"},
      {"vehicle-market-atlas":"source-1","vehicle-lens":"source-2"},
    )).toThrow("Duplicate owned Dive ID");
  });

  it("reconstructs the legacy response shape without crossing workspaces",()=>{
    const rows=[
      {workspace_id:"a",dataset_key:"wa-vehicle-market",starter_key:"vehicle-market-atlas",dive_id:"a-atlas",source_dive_id:"source"},
      {workspace_id:"a",dataset_key:"wa-vehicle-market",starter_key:"vehicle-lens",dive_id:"a-lens",source_dive_id:"source"},
    ] satisfies WorkspaceDive[];
    expect(workspaceDiveIds(rows)).toEqual({"vehicle-market-atlas":"a-atlas","vehicle-lens":"a-lens"});
    expect(workspaceDiveIds(rows)).not.toHaveProperty("data-observatory");
    expect(hasExactWorkspaceDives(rows,["vehicle-market-atlas","vehicle-lens"])).toBe(true);
    expect(hasExactWorkspaceDives(rows,["vehicle-market-atlas","vehicle-lens","data-observatory"])).toBe(false);
    expect(hasExactWorkspaceDives([{...rows[0],dataset_key:"another-dataset"}], ["vehicle-market-atlas"])).toBe(false);
  });
});
