import {beforeEach,describe,expect,it,vi} from "vitest";

const mocks=vi.hoisted(()=>({currentUser:vi.fn(),owned:vi.fn(),snapshot:vi.fn(),context:vi.fn(),getReport:vi.fn(),saveReport:vi.fn()}));
vi.mock("@/lib/auth",()=>({currentUser:mocks.currentUser}));
vi.mock("@/lib/app-db",()=>({getOwnedWorkspaceDive:mocks.owned}));
vi.mock("@/lib/duckdive-runtime",()=>({readDiveSnapshot:mocks.snapshot}));
vi.mock("@/lib/datasets",()=>({datasetContextForWorkspaceDiveRecord:mocks.context}));
vi.mock("@/lib/dive-provisioning",()=>({STARTER_DIVES:[{key:"market-pulse",title:"Market pulse",description:"Statewide signals"}]}));
vi.mock("@/lib/duckdive-report-db",async importOriginal=>{const actual=await importOriginal<typeof import("@/lib/duckdive-report-db")>();return {...actual,getDiveReportVersion:mocks.getReport,saveDiveReportVersion:mocks.saveReport};});
import {GET} from "./route";

const params={params:Promise.resolve({diveId:"dive"})},contract={scope:"Sales",grains:[{name:"sales",grain:"One sale"}],measures:{volume:"Sales"},dimensions:["suburb"],caveats:["Historical only"]};

describe("Dive report metadata route",()=>{
  beforeEach(()=>{vi.clearAllMocks();mocks.currentUser.mockResolvedValue({user_id:"user"});mocks.owned.mockResolvedValue({workspace_id:"workspace",starter_key:"market-pulse",source_dive_id:"source",motherduck_username:"owner"});mocks.context.mockReturnValue({dataset:{publicContract:contract}});});

  it("returns a deterministic starter explanation when the metadata table is not migrated",async()=>{
    mocks.snapshot.mockResolvedValueOnce({version:3,hash:"same",content:"owned"}).mockResolvedValueOnce({version:8,hash:"same",content:"source"});
    mocks.getReport.mockRejectedValue(Object.assign(new Error("missing relation"),{code:"42P01"}));
    const response=await GET(new Request("https://duckdive.gold/api/dives/dive/report"),params),body=await response.json();
    expect(response.status).toBe(200);expect(body).toMatchObject({persisted:false,reason:"schema-unavailable",report:{version:3,purpose:{title:"Market pulse"}}});expect(mocks.saveReport).not.toHaveBeenCalled();
  });

  it("does not fabricate an explanation for a changed legacy version",async()=>{
    mocks.snapshot.mockResolvedValueOnce({version:3,hash:"changed",content:"owned"}).mockResolvedValueOnce({version:8,hash:"starter",content:"source"});
    mocks.getReport.mockRejectedValue(Object.assign(new Error("missing relation"),{code:"42P01"}));
    const response=await GET(new Request("https://duckdive.gold/api/dives/dive/report"),params),body=await response.json();
    expect(response.status).toBe(200);expect(body).toEqual({report:null,persisted:false,reason:"legacy-version"});
  });
});
