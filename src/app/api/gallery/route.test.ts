import {beforeEach,describe,expect,it,vi} from "vitest";

const mocks=vi.hoisted(()=>({currentUser:vi.fn(),preview:vi.fn()}));
vi.mock("@/lib/auth",()=>({currentUser:mocks.currentUser}));
vi.mock("@/lib/dive-provisioning",()=>({workspaceDivePreview:mocks.preview}));
import {GET} from "./route";

describe("authenticated report gallery route",()=>{
  beforeEach(()=>{
    vi.clearAllMocks();
    mocks.currentUser.mockResolvedValue({user_id:"user",email:"owner@example.com"});
    mocks.preview.mockResolvedValue({dataset:{key:"vic-housing"},dive:{key:"market-pulse",diveId:"dive",session:{token:"session"}}});
  });

  it("fails closed before provisioning for an unknown starter",async()=>{
    const response=await GET(new Request("https://duckdive.gold/api/gallery?starter=unknown"));
    expect(response.status).toBe(404);
    expect(mocks.preview).not.toHaveBeenCalled();
  });

  it("prepares exactly the one requested starter",async()=>{
    const response=await GET(new Request("https://duckdive.gold/api/gallery?starter=market-pulse"));
    expect(response.status).toBe(200);
    expect(mocks.preview).toHaveBeenCalledOnce();
    expect(mocks.preview).toHaveBeenCalledWith(expect.objectContaining({user_id:"user"}),"market-pulse");
    await expect(response.json()).resolves.toMatchObject({dataset:{key:"vic-housing"},dive:{key:"market-pulse",diveId:"dive"}});
  });

  it("requires authentication",async()=>{
    mocks.currentUser.mockResolvedValue(null);
    const response=await GET(new Request("https://duckdive.gold/api/gallery?starter=market-pulse"));
    expect(response.status).toBe(401);
    expect(mocks.preview).not.toHaveBeenCalled();
  });
});
