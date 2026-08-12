import {beforeEach,describe,expect,it,vi} from "vitest";

const mocks=vi.hoisted(()=>({currentUser:vi.fn(),review:vi.fn()}));
vi.mock("@/lib/auth",()=>({currentUser:mocks.currentUser}));
vi.mock("@/lib/access-request-db",()=>({reviewAccessRequest:mocks.review}));
import {PATCH} from "./route";

const requestId="11111111-1111-4111-8111-111111111111";
function request(body:unknown){return new Request("https://duckdive.gold/api/admin/access-requests",{method:"PATCH",headers:{"Content-Type":"application/json",origin:"https://duckdive.gold",host:"duckdive.gold"},body:JSON.stringify(body)});}

describe("admin access request review route",()=>{
  beforeEach(()=>{vi.clearAllMocks();mocks.currentUser.mockResolvedValue({user_id:"admin",role:"admin"});mocks.review.mockResolvedValue({request:{request_id:requestId,status:"approved"},user:{email:"ada@example.com"},reason:null});});
  it("approves only through an authenticated administrator",async()=>{
    const response=await PATCH(request({requestId,action:"approve"}));
    expect(response.status).toBe(200);expect(mocks.review).toHaveBeenCalledWith("admin",requestId,"approve");
  });
  it("denies non-admin users before review",async()=>{
    mocks.currentUser.mockResolvedValue({user_id:"member",role:"member"});
    expect((await PATCH(request({requestId,action:"approve"}))).status).toBe(403);expect(mocks.review).not.toHaveBeenCalled();
  });
  it("rejects unsupported actions",async()=>{
    expect((await PATCH(request({requestId,action:"delete"}))).status).toBe(400);expect(mocks.review).not.toHaveBeenCalled();
  });
});
