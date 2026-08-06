import {beforeEach,describe,expect,it,vi} from "vitest";

const mocks=vi.hoisted(()=>({control:vi.fn(),getFlight:vi.fn(),listRuns:vi.fn()}));
vi.mock("./motherduck-access",()=>({motherduckControlMcp:mocks.control}));

import {getDemoFlightStatus,safeFlightStatus} from "./motherduck-flight-status";

const flight={success:true,flight:{flight_id:"private-id",flight_name:"duckdive-flight-01",status:"ACTIVE",schedule_cron:null,current_version:1,owner_name:"private-owner",version_info:{max_runtime_sec:120,source_code:"private source",config:{SECRET:"private"}}}};
const runs={success:true,flight_id:"private-id",runs:[{run_id:"private-run",run_number:1,flight_version:1,status:"SUCCEEDED",created_at:"2026-08-06T06:34:45.427Z",started_at:"2026-08-06T06:34:46.603Z",ended_at:"2026-08-06T06:34:55.043Z",exit_code:0,config:{SECRET:"private"}}]};

describe("MotherDuck Flight status adapter",()=>{
  beforeEach(()=>{
    vi.clearAllMocks();
    mocks.getFlight.mockResolvedValue(flight);
    mocks.listRuns.mockResolvedValue(runs);
    mocks.control.mockResolvedValue({tools:vi.fn().mockResolvedValue({get_flight:{execute:mocks.getFlight},list_flight_runs:{execute:mocks.listRuns}})});
  });

  it("does not connect when the allowlisted Flight is unconfigured",async()=>{
    const status=await getDemoFlightStatus({MOTHERDUCK_TOKEN:"token"});
    expect(status.availability).toBe("unconfigured");
    expect(mocks.control).not.toHaveBeenCalled();
  });

  it("projects live MCP data into a safe browser contract",async()=>{
    const status=await getDemoFlightStatus({MOTHERDUCK_TOKEN:"token",MOTHERDUCK_DEMO_FLIGHT_ID:"9daad437-aad5-4b67-a1b2-3d5745878fa5"});
    expect(status).toMatchObject({availability:"live",name:"duckdive-flight-01",definition:{status:"ACTIVE",version:1,schedule:"on_demand",maxRuntimeSec:120},latestRun:{number:1,status:"SUCCEEDED",queueMs:1176,durationMs:8440,exitCode:0}});
    expect(mocks.getFlight).toHaveBeenCalledWith({id:"9daad437-aad5-4b67-a1b2-3d5745878fa5"},expect.any(Object));
    expect(mocks.listRuns).toHaveBeenCalledWith({id:"9daad437-aad5-4b67-a1b2-3d5745878fa5",limit:1},expect.any(Object));
    expect(JSON.stringify(status)).not.toMatch(/private|source|config|token|flight_id|run_id|owner/i);
  });

  it("rejects malformed MCP output",()=>{
    expect(()=>safeFlightStatus({success:true,flight:{}},runs)).toThrow();
  });

  it("fails closed to an unavailable presentation state",async()=>{
    mocks.control.mockRejectedValue(new Error("network detail"));
    const log=vi.spyOn(console,"error").mockImplementation(()=>{});
    const status=await getDemoFlightStatus({MOTHERDUCK_TOKEN:"token",MOTHERDUCK_DEMO_FLIGHT_ID:"9daad437-aad5-4b67-a1b2-3d5745878fa5"});
    expect(status.availability).toBe("unavailable");
    expect(status.definition).toBeNull();
    expect(status.latestRun).toBeNull();
    log.mockRestore();
  });
});
