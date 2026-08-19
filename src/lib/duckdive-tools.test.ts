import {beforeEach,describe,expect,it,vi} from "vitest";
import type {MCPClient} from "@ai-sdk/mcp";

const {runActive,verifyRevision}=vi.hoisted(()=>({runActive:vi.fn(),verifyRevision:vi.fn()}));
vi.mock("./duckdive-db",()=>({duckDiveRunIsActive:runActive}));
vi.mock("./duckdive-runtime",()=>({verifyDiveRevision:verifyRevision}));
import {boundedDuckDiveResult,createDuckDiveTools,governedReadOnlyQuery} from "./duckdive-tools";
import {WA_VEHICLE_MARKET_DATASET} from "./datasets";
import {reportPurposeForStarter} from "./duckdive-report";

const policy=WA_VEHICLE_MARKET_DATASET.reportPolicy;
const before={version:5,content:"before",hash:"aaa"};
const dataset={key:"wa-vehicle-market",title:"WA Used Vehicle Market",contractVersion:"wa-vehicle-market/v1",motherduckDatabase:"wa_vehicle_market",motherduckShareUrl:"md:_share/wa/test",serviceAccountUsername:"owner"};
const options={toolCallId:"call",messages:[],abortSignal:new AbortController().signal} as never;

function reportPlan(overrides:Record<string,unknown>={}){
  return {
    request:"Change the report",
    interpretedIntent:"Apply a bounded report change",
    purpose:reportPurposeForStarter({title:"Market Atlas",description:"Current market",policy}),
    capabilityIds:["asking-price"],
    unsupportedRequests:[],
    materialClarification:null,
    added:[],
    changed:["Report"],
    removed:[],
    unchanged:[],
    validations:[],
    ...overrides,
  };
}

async function controlledTools(){
  const queryExecute=vi.fn().mockResolvedValue([{count:1}]);
  const editExecute=vi.fn().mockResolvedValue({ok:true});
  const client={tools:vi.fn().mockResolvedValue({query:{execute:queryExecute},edit_dive_content:{execute:editExecute}})} as unknown as MCPClient;
  const control=await createDuckDiveTools({client,runId:"run",diveId:"active-dive",username:"owner",before,dataset,reportPolicy:policy});
  return {control,queryExecute,editExecute};
}

async function prepare(control:Awaited<ReturnType<typeof createDuckDiveTools>>,overrides:Record<string,unknown>={}){
  return control.tools.prepare_report_update.execute!(reportPlan(overrides),options);
}

async function save(control:Awaited<ReturnType<typeof createDuckDiveTools>>,summary="Changed report"){
  return control.tools.save_dive_revision.execute!({summary,edits:[{old_string:"before",new_string:"after"}]},options);
}

describe("DuckDive controlled tools",()=>{
  beforeEach(()=>{
    runActive.mockReset().mockResolvedValue(true);
    verifyRevision.mockReset().mockResolvedValue({version:6,content:"after",hash:"bbb"});
  });

  it("accepts a safe analytical change and records one verified mutation",async()=>{
    const {control,editExecute}=await controlledTools();
    await expect(prepare(control,{request:"Compare asking prices",capabilityIds:["asking-price"]})).resolves.toMatchObject({accepted:true});
    await expect(save(control,"Compared asking prices")).resolves.toMatchObject({saved:true,beforeVersion:5,afterVersion:6});
    expect(editExecute).toHaveBeenCalledWith(expect.objectContaining({id:"active-dive"}),options);
    expect(control.getMutation()).toMatchObject({before:{version:5},after:{version:6}});
  });

  it("accepts a presentation-only change through the allowlisted capability",async()=>{
    const {control,editExecute}=await controlledTools();
    await expect(prepare(control,{request:"Use brighter colours",interpretedIntent:"Increase chart contrast",capabilityIds:["report-presentation"],changed:["Chart colours"],validations:[{id:"semantics",label:"Governed semantics unchanged",status:"passed"}]})).resolves.toMatchObject({accepted:true,capabilityIds:["report-presentation"]});
    await expect(save(control,"Increased chart contrast")).resolves.toMatchObject({saved:true});
    expect(editExecute).toHaveBeenCalledOnce();
  });

  it("rejects an unknown capability and prevents a save",async()=>{
    const {control,editExecute}=await controlledTools();
    await expect(prepare(control,{capabilityIds:["fair-value"]})).resolves.toMatchObject({accepted:false,error:"The report plan requested an unavailable capability"});
    await expect(save(control)).rejects.toThrow("Prepare the structured report update");
    expect(editExecute).not.toHaveBeenCalled();
  });

  it("prevents a save when contract validation fails",async()=>{
    const {control,editExecute}=await controlledTools();
    await expect(prepare(control,{capabilityIds:["report-presentation"],validations:[{id:"semantics",label:"Governed semantics unchanged",status:"failed"}]})).resolves.toMatchObject({accepted:false,error:"The report plan did not pass contract validation"});
    await expect(save(control)).rejects.toThrow("Prepare the structured report update");
    expect(editExecute).not.toHaveBeenCalled();
  });

  it("makes no save after the model classifies a valuation request as unsupported",async()=>{
    const {control,editExecute}=await controlledTools();
    await expect(prepare(control,{request:"Estimate fair value",unsupportedRequests:["vehicle valuation"]})).resolves.toMatchObject({accepted:false,unsupportedRequests:["vehicle valuation"]});
    await expect(prepare(control,{request:"Try again",unsupportedRequests:[]})).rejects.toThrow("already been prepared");
    await expect(save(control)).rejects.toThrow("does not authorize a save");
    expect(editExecute).not.toHaveBeenCalled();
  });

  it("makes no save after the model classifies a sale or sell-through request as unsupported",async()=>{
    const {control,editExecute}=await controlledTools();
    await expect(prepare(control,{request:"Show which vehicles sold",unsupportedRequests:["sale or sell-through inference"]})).resolves.toMatchObject({accepted:false,unsupportedRequests:["sale or sell-through inference"]});
    await expect(prepare(control,{request:"Try again",unsupportedRequests:[]})).rejects.toThrow("already been prepared");
    await expect(save(control)).rejects.toThrow("does not authorize a save");
    expect(editExecute).not.toHaveBeenCalled();
  });

  it("returns one material clarification field and makes no save",async()=>{
    const {control,editExecute}=await controlledTools();
    await expect(prepare(control,{request:"Make it better",materialClarification:"Which comparison or presentation change should the report make?"})).resolves.toMatchObject({accepted:false,materialClarification:"Which comparison or presentation change should the report make?"});
    await expect(prepare(control,{request:"Try again",materialClarification:null})).rejects.toThrow("already been prepared");
    await expect(save(control)).rejects.toThrow("does not authorize a save");
    expect(editExecute).not.toHaveBeenCalled();
  });

  it("permits one bounded read-only inspection and caps both rows and returned characters",async()=>{
    const {control,queryExecute}=await controlledTools();
    queryExecute.mockResolvedValue({value:"x".repeat(13_000)});
    expect(control.tools.inspect_data.description).toContain("WA Used Vehicle Market");
    const inspected=await control.tools.inspect_data.execute!({purpose:"Count rows",sql:"SELECT * FROM current_listings"},options);
    expect(queryExecute).toHaveBeenCalledWith(expect.objectContaining({database:"wa_vehicle_market",sql:"SELECT * FROM (SELECT * FROM current_listings) AS duckdive_inspection LIMIT 200"}),options);
    expect(inspected).toMatchObject({result:{truncated:true}});
    await expect(control.tools.inspect_data.execute!({purpose:"Again",sql:"SELECT 1"},options)).rejects.toThrow("already been attempted");
    expect(()=>governedReadOnlyQuery("DROP TABLE current_listings")).toThrow("read-only SELECT");
    expect(()=>governedReadOnlyQuery("SELECT 1; SELECT 2")).toThrow("read-only SELECT");
    expect(boundedDuckDiveResult({value:"x".repeat(13_000)})).toMatchObject({truncated:true});
  });

  it("rejects a second mutation attempt",async()=>{
    const {control,editExecute}=await controlledTools();
    await prepare(control);
    await save(control);
    await expect(save(control,"Again")).rejects.toThrow("already been attempted");
    expect(editExecute).toHaveBeenCalledOnce();
  });

  it("never records a mutation when version or hash verification fails",async()=>{
    verifyRevision.mockRejectedValueOnce(new Error("Dive version did not advance"));
    const {control}=await controlledTools();
    await prepare(control);
    await expect(save(control)).rejects.toThrow("version did not advance");
    expect(control.getMutation()).toBeNull();
  });
});
