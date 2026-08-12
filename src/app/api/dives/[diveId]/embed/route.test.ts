import {beforeEach,describe,expect,it,vi} from "vitest";

const mocks=vi.hoisted(()=>({audit:vi.fn(),context:vi.fn(),currentUser:vi.fn(),owned:vi.fn(),session:vi.fn()}));
vi.mock("@/lib/auth",()=>({currentUser:mocks.currentUser}));
vi.mock("@/lib/app-db",()=>({audit:mocks.audit,getOwnedWorkspaceDive:mocks.owned}));
vi.mock("@/lib/datasets",()=>({datasetContextForWorkspaceDiveRecord:mocks.context}));
vi.mock("@/lib/motherduck-api",()=>({createEmbedSession:mocks.session}));
import {GET} from "./route";

describe("owned Dive embed route",()=>{
  beforeEach(()=>{
    vi.clearAllMocks();
    mocks.currentUser.mockResolvedValue({user_id:"user"});
    mocks.owned.mockResolvedValue({dataset_key:"wa-vehicle-market",starter_key:"vehicle-lens",motherduck_username:"vic_house_lab"});
    mocks.context.mockReturnValue({runtime:{motherduckShareUrl:"md:_share/wa/current",motherduckDatabase:"wa_vehicle_market"}});
    mocks.session.mockResolvedValue("embedded");
  });

  it("overrides the embedded session with the governed dataset resource",async()=>{
    const response=await GET(new Request("https://duckdive.gold/api/dives/dive/embed"),{params:Promise.resolve({diveId:"dive"})});
    expect(response.status).toBe(200);
    expect(mocks.session).toHaveBeenCalledWith("dive","vic_house_lab",[{url:"md:_share/wa/current",alias:"wa_vehicle_market"}]);
  });

  it("fails closed when ownership cannot resolve to a dataset",async()=>{
    mocks.context.mockReturnValue(null);
    const response=await GET(new Request("https://duckdive.gold/api/dives/dive/embed"),{params:Promise.resolve({diveId:"dive"})});
    expect(response.status).toBe(400);
    expect(mocks.session).not.toHaveBeenCalled();
  });
});
