import {beforeEach,describe,expect,it,vi} from "vitest";
import type {MCPClient} from "@ai-sdk/mcp";

const {runActive,verifyRevision}=vi.hoisted(()=>({runActive:vi.fn(),verifyRevision:vi.fn()}));
vi.mock("./duckdive-db",()=>({duckDiveRunIsActive:runActive}));
vi.mock("./duckdive-runtime",()=>({verifyDiveRevision:verifyRevision}));
import {boundedDuckDiveResult,createDuckDiveTools,governedReadOnlyQuery} from "./duckdive-tools";
import {VIC_HOUSING_DATASET} from "./datasets";
import {reportPurposeForStarter} from "./duckdive-report";

describe("DuckDive controlled tools",()=>{
  beforeEach(()=>{runActive.mockReset().mockResolvedValue(true);verifyRevision.mockReset().mockResolvedValue({version:6,content:"after",hash:"bbb"});});

  it("forces one bounded read-only statement",()=>{
    expect(governedReadOnlyQuery("SELECT * FROM suburb_dimension")).toBe("SELECT * FROM (SELECT * FROM suburb_dimension) AS duckdive_inspection LIMIT 200");
    expect(()=>governedReadOnlyQuery("DROP TABLE suburb_dimension")).toThrow("read-only SELECT");
    expect(()=>governedReadOnlyQuery("SELECT 1; SELECT 2")).toThrow("read-only SELECT");
    expect(boundedDuckDiveResult({value:"x".repeat(13_000)})).toMatchObject({truncated:true});
  });

  it("forces the active Dive and permits only one successful mutation",async()=>{
    const queryExecute=vi.fn().mockResolvedValue([{count:1}]),editExecute=vi.fn().mockResolvedValue({ok:true});
    const client={tools:vi.fn().mockResolvedValue({query:{execute:queryExecute},edit_dive_content:{execute:editExecute}})} as unknown as MCPClient;
    const control=await createDuckDiveTools({client,runId:"run",diveId:"active-dive",username:"owner",before:{version:5,content:"before",hash:"aaa"},dataset:{key:"vic-housing",title:"VIC Housing",contractVersion:"vic-housing/v1",motherduckDatabase:"vic_house_data",motherduckShareUrl:"md:_share/vic/test",serviceAccountUsername:"vic_house_lab"},reportPolicy:VIC_HOUSING_DATASET.reportPolicy});
    const options={toolCallId:"call",messages:[],abortSignal:new AbortController().signal} as never;
    expect(control.tools.inspect_data.description).toContain("VIC Housing");
    await control.tools.inspect_data.execute!({purpose:"Count rows",sql:"SELECT count(*) AS count FROM suburb_dimension"},options);
    expect(queryExecute).toHaveBeenCalledWith(expect.objectContaining({database:"vic_house_data",sql:expect.stringContaining("LIMIT 200")}),options);
    await control.tools.prepare_report_update.execute!({request:"Change title",interpretedIntent:"Change the report title",purpose:reportPurposeForStarter({title:"Market",description:"Market",policy:VIC_HOUSING_DATASET.reportPolicy}),capabilityIds:["sales-volume"],unsupportedRequests:[],materialClarification:null,added:[],changed:["Title"],removed:[],unchanged:[],validations:[]},options);
    await control.tools.save_dive_revision.execute!({summary:"Changed title",edits:[{old_string:"before",new_string:"after"}]},options);
    expect(editExecute).toHaveBeenCalledWith(expect.objectContaining({id:"active-dive"}),options);
    await expect(control.tools.save_dive_revision.execute!({summary:"Again",edits:[{old_string:"a",new_string:"b"}]},options)).rejects.toThrow("already been attempted");
  });

  it("permits a structurally valid rejected plan when report validation is disabled",async()=>{
    const editExecute=vi.fn().mockResolvedValue({ok:true});
    const client={tools:vi.fn().mockResolvedValue({query:{execute:vi.fn()},edit_dive_content:{execute:editExecute}})} as unknown as MCPClient;
    const control=await createDuckDiveTools({client,runId:"run",diveId:"active-dive",username:"owner",before:{version:5,content:"before",hash:"aaa"},dataset:{key:"vic-housing",title:"VIC Housing",contractVersion:"vic-housing/v1",motherduckDatabase:"vic_house_data",motherduckShareUrl:"md:_share/vic/test",serviceAccountUsername:"vic_house_lab"},reportPolicy:VIC_HOUSING_DATASET.reportPolicy,reportValidationEnabled:false});
    const options={toolCallId:"call",messages:[],abortSignal:new AbortController().signal} as never;
    const prepared=await control.tools.prepare_report_update.execute!({request:"Use brighter colours",interpretedIntent:"Increase chart contrast",purpose:reportPurposeForStarter({title:"Market",description:"Market",policy:VIC_HOUSING_DATASET.reportPolicy}),capabilityIds:["visual-accessibility"],unsupportedRequests:[],materialClarification:null,added:[],changed:["Chart colours"],removed:[],unchanged:[],validations:[{id:"palette",label:"Palette validation",status:"failed"}]},options);
    expect(prepared).toMatchObject({accepted:true,capabilityIds:["visual-accessibility"]});
    await control.tools.save_dive_revision.execute!({summary:"Increased chart contrast",edits:[{old_string:"before",new_string:"after"}]},options);
    expect(editExecute).toHaveBeenCalledOnce();
  });
});
