import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";

const mocks=vi.hoisted(()=>({currentUser:vi.fn(),owned:vi.fn(),audit:vi.fn(),current:vi.fn(),reset:vi.fn(),context:vi.fn(),saveReport:vi.fn()}));
vi.mock("@/lib/auth",()=>({currentUser:mocks.currentUser}));
vi.mock("@/lib/app-db",()=>({getOwnedWorkspaceDive:mocks.owned,audit:mocks.audit}));
vi.mock("@/lib/csrf",()=>({assertSameOrigin:()=>null}));
vi.mock("@/lib/duckdive-runtime",()=>({readDiveSnapshot:mocks.current,resetDiveToSource:mocks.reset}));
vi.mock("@/lib/datasets",()=>({datasetContextForWorkspaceDiveRecord:mocks.context}));
vi.mock("@/lib/duckdive-report-db",()=>({saveDiveReportVersion:mocks.saveReport}));
import {POST} from "./route";

const params={params:Promise.resolve({diveId:"dive"})};
const request=()=>new Request("https://duckdive.gold/api/dives/dive/reset",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({expectedVersion:4})});

describe("Dive reset route",()=>{
  beforeEach(()=>{
    vi.clearAllMocks();
    vi.spyOn(console,"error").mockImplementation(()=>{});
    mocks.currentUser.mockResolvedValue({user_id:"user"});
    mocks.owned.mockResolvedValue({workspace_id:"workspace",dataset_key:"included",starter_key:"overview",dive_id:"dive",source_dive_id:"source",motherduck_username:"owner"});
    mocks.context.mockReturnValue({dataset:{capabilities:{editing:true},starters:[{key:"overview",title:"Overview",description:"Reviewed events"}],reportPolicy:{capabilities:[],limitations:[],assumptions:[],scopeItems:[]}}});
    mocks.current.mockResolvedValue({version:4,hash:"before",content:"before"});
    mocks.reset.mockResolvedValue({before:{version:4,hash:"before",content:"before"},after:{version:5,hash:"after",content:"after"},noChange:false});
    mocks.saveReport.mockResolvedValue({version:5});
    mocks.audit.mockResolvedValue(undefined);
  });
  afterEach(()=>vi.restoreAllMocks());

  it("reports a verified reset even when optional metadata persistence fails",async()=>{
    mocks.saveReport.mockRejectedValue(new Error("metadata unavailable"));
    mocks.audit.mockRejectedValue(new Error("audit unavailable"));
    const response=await POST(request(),params);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({beforeVersion:4,afterVersion:5,noChange:false,report:null});
    expect(mocks.reset).toHaveBeenCalledWith("dive","source","owner");
  });

  it("denies cross-owner reset before reading or mutating the Dive",async()=>{
    mocks.owned.mockResolvedValue(null);
    const response=await POST(request(),params);
    expect(response.status).toBe(403);
    expect(mocks.current).not.toHaveBeenCalled();
    expect(mocks.reset).not.toHaveBeenCalled();
  });
});
