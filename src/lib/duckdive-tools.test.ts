import {beforeEach,describe,expect,it,vi} from "vitest";
import type {MCPClient} from "@ai-sdk/mcp";

const {runActive,verifyRevision}=vi.hoisted(()=>({runActive:vi.fn(),verifyRevision:vi.fn()}));
vi.mock("./duckdive-db",()=>({duckDiveRunIsActive:runActive}));
vi.mock("./duckdive-runtime",()=>({verifyDiveRevision:verifyRevision}));
import {boundedDuckDiveResult,createDuckDiveTools,governedReadOnlyQuery} from "./duckdive-tools";

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
    const control=await createDuckDiveTools({client,runId:"run",diveId:"active-dive",username:"owner",before:{version:5,content:"before",hash:"aaa"}});
    const options={toolCallId:"call",messages:[],abortSignal:new AbortController().signal} as never;
    await control.tools.inspect_data.execute!({purpose:"Count rows",sql:"SELECT count(*) AS count FROM suburb_dimension"},options);
    expect(queryExecute).toHaveBeenCalledWith(expect.objectContaining({database:"vic_house_data",sql:expect.stringContaining("LIMIT 200")}),options);
    await control.tools.save_dive_revision.execute!({summary:"Changed title",edits:[{old_string:"before",new_string:"after"}]},options);
    expect(editExecute).toHaveBeenCalledWith(expect.objectContaining({id:"active-dive"}),options);
    await expect(control.tools.save_dive_revision.execute!({summary:"Again",edits:[{old_string:"a",new_string:"b"}]},options)).rejects.toThrow("already been attempted");
  });
});
