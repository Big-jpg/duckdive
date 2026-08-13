import {beforeEach,describe,expect,it,vi} from "vitest";

const mocks=vi.hoisted(()=>({currentUser:vi.fn(),setModel:vi.fn()}));
vi.mock("@/lib/auth",()=>({currentUser:mocks.currentUser}));
vi.mock("@/lib/ai-gateway-settings-db",()=>({setAiGatewayModel:mocks.setModel}));
import {PATCH} from "./route";

function request(model:string){return new Request("https://duckdive.gold/api/admin/ai-model",{method:"PATCH",headers:{"Content-Type":"application/json",origin:"https://duckdive.gold",host:"duckdive.gold"},body:JSON.stringify({model})});}

describe("admin AI model route",()=>{
  beforeEach(()=>{vi.clearAllMocks();mocks.currentUser.mockResolvedValue({user_id:"11111111-1111-4111-8111-111111111111",role:"admin"});mocks.setModel.mockResolvedValue({model:"openai/gpt-5.6-luna",source:"admin",updatedAt:"2026-08-13T00:00:00Z"});});
  it("updates the global model for an administrator",async()=>{const response=await PATCH(request("openai/gpt-5.6-luna"));expect(response.status).toBe(200);expect(mocks.setModel).toHaveBeenCalledWith("11111111-1111-4111-8111-111111111111","openai/gpt-5.6-luna");});
  it("denies non-administrators",async()=>{mocks.currentUser.mockResolvedValue({user_id:"member",role:"member"});expect((await PATCH(request("openai/gpt-5.6-luna"))).status).toBe(403);expect(mocks.setModel).not.toHaveBeenCalled();});
  it("rejects models outside the approved family",async()=>{expect((await PATCH(request("openai/gpt-5.4"))).status).toBe(400);expect(mocks.setModel).not.toHaveBeenCalled();});
});

