import {beforeEach,describe,expect,it,vi} from "vitest";
const mocks=vi.hoisted(()=>({currentUser:vi.fn(),getDataset:vi.fn(),begin:vi.fn(),degrade:vi.fn(),finalize:vi.fn(),revoke:vi.fn(),inspect:vi.fn()}));
vi.mock("@/lib/auth",()=>({currentUser:mocks.currentUser}));
vi.mock("@/lib/operational-datasets-db",()=>({getOperationalDataset:mocks.getDataset}));
vi.mock("@/lib/operational-runtime-db",()=>({OperationalRuntimeConflictError:class OperationalRuntimeConflictError extends Error{},beginOperationalRuntimeBinding:mocks.begin,degradeOperationalRuntimeBinding:mocks.degrade,finalizeOperationalRuntimeBinding:mocks.finalize,revokeOperationalRuntimeBinding:mocks.revoke}));
vi.mock("@/lib/motherduck-operational-runtime",()=>({MotherDuckOperationalRuntimeAdapter:class {inspect=mocks.inspect;}}));
import {POST} from "./route";

const userId="11111111-1111-4111-8111-111111111111",datasetId="33333333-3333-4333-8333-333333333333",context={params:Promise.resolve({datasetId})};
const publicContract={scope:"Air",entities:[{name:"ambient_air_quality",purpose:"Air",grain:"One row",provenance:{purpose:"user-confirmed",grain:"user-confirmed"},columns:[{name:"country_name",description:"",dataType:"string",isKey:false,provenance:"declared"}]}],measures:[],relationships:[],caveats:[]};
function request(body:unknown,origin="https://duckdive.gold"){return new Request("https://duckdive.gold/api/datasets/x/runtime",{method:"POST",headers:{origin,host:"duckdive.gold","content-type":"application/json"},body:JSON.stringify(body)});}
describe("operational runtime binding route",()=>{
  beforeEach(()=>{vi.clearAllMocks();mocks.currentUser.mockResolvedValue({user_id:userId});mocks.getDataset.mockResolvedValue({public_contract_json:publicContract});mocks.begin.mockResolvedValue({resource_reference:"sample_data.who.ambient_air_quality"});mocks.inspect.mockResolvedValue({resourceReference:"sample_data.who.ambient_air_quality",columns:[{name:"country_name",dataType:"VARCHAR"}]});mocks.finalize.mockResolvedValue({binding_state:"ready"});});
  it("rejects cross-origin mutation before binding",async()=>{expect((await POST(request({action:"bind"},"https://attacker.example"),context)).status).toBe(403);expect(mocks.begin).not.toHaveBeenCalled();});
  it("reconciles and readies the owner-scoped WHO binding",async()=>{const response=await POST(request({action:"bind"}),context);expect(response.status).toBe(200);expect(mocks.begin).toHaveBeenCalledWith(userId,datasetId);expect(mocks.finalize).toHaveBeenCalledWith(userId,datasetId,expect.objectContaining({status:"exact",readyEligible:true}));});
  it("fails closed for another owner's dataset",async()=>{mocks.getDataset.mockResolvedValue(null);const response=await POST(request({action:"bind"}),context);expect(response.status).toBe(404);expect(mocks.begin).not.toHaveBeenCalled();});
  it("revokes without inspecting MotherDuck",async()=>{mocks.revoke.mockResolvedValue({binding_state:"revoked"});const response=await POST(request({action:"revoke"}),context);expect(response.status).toBe(200);expect(mocks.revoke).toHaveBeenCalledWith(userId,datasetId);expect(mocks.inspect).not.toHaveBeenCalled();});
  it("marks a started binding degraded when live inspection fails",async()=>{mocks.inspect.mockRejectedValue(new Error("catalog unavailable"));await expect(POST(request({action:"bind"}),context)).rejects.toThrow("catalog unavailable");expect(mocks.degrade).toHaveBeenCalledWith(userId,datasetId,"inspection-failed");});
});
