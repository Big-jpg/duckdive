import {beforeEach,describe,expect,it,vi} from "vitest";

const mocks=vi.hoisted(()=>({submit:vi.fn()}));
vi.mock("@/lib/access-request-db",()=>({submitAccessRequest:mocks.submit}));
import {POST} from "./route";

function request(body:unknown,origin="https://duckdive.gold"){
  return new Request("https://duckdive.gold/api/access-requests",{method:"POST",headers:{"Content-Type":"application/json",origin,host:"duckdive.gold","x-forwarded-for":"203.0.113.2"},body:JSON.stringify(body)});
}

describe("public access request route",()=>{
  beforeEach(()=>{vi.clearAllMocks();mocks.submit.mockResolvedValue({accepted:true,rateLimited:false});});
  it("validates and persists a normalized request",async()=>{
    const response=await POST(request({name:"  Ada Lovelace ",email:" ADA@EXAMPLE.COM ",title:" Analyst ",datasetInterest:" Transport data ",website:""}));
    expect(response.status).toBe(202);
    expect(mocks.submit).toHaveBeenCalledWith(expect.objectContaining({name:"Ada Lovelace",email:"ada@example.com",title:"Analyst",datasetInterest:"Transport data",keyHash:expect.any(String)}));
  });
  it("rejects incomplete and cross-origin submissions",async()=>{
    expect((await POST(request({name:"",email:"not-email"}))).status).toBe(400);
    expect((await POST(request({name:"Ada",email:"ada@example.com"},"https://attacker.test"))).status).toBe(403);
    expect(mocks.submit).not.toHaveBeenCalled();
  });
  it("quietly accepts honeypot submissions without writing",async()=>{
    const response=await POST(request({name:"Bot",email:"bot@example.com",website:"https://spam.test"}));
    expect(response.status).toBe(202);expect(mocks.submit).not.toHaveBeenCalled();
  });
});
