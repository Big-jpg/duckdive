import {createHash} from "node:crypto";
import {beforeEach,describe,expect,it,vi} from "vitest";
const mocks=vi.hoisted(()=>({currentUser:vi.fn(),getContext:vi.fn(),degrade:vi.fn(),query:vi.fn()}));
vi.mock("@/lib/auth",()=>({currentUser:mocks.currentUser}));
vi.mock("@/lib/operational-runtime-db",()=>({degradeOperationalRuntimeBinding:mocks.degrade,getOperationalRuntimeContext:mocks.getContext}));
vi.mock("@/lib/motherduck-operational-runtime",()=>({MotherDuckOperationalRuntimeAdapter:class {query=mocks.query;}}));
import {POST} from "./route";

const userId="11111111-1111-4111-8111-111111111111",datasetId="33333333-3333-4333-8333-333333333333",datasetKey="dataset-"+"a".repeat(32),routeContext={params:Promise.resolve({datasetId})};
const publicContract={scope:"Air",entities:[{name:"ambient_air_quality",purpose:"Air",grain:"One row",provenance:{purpose:"user-confirmed" as const,grain:"user-confirmed" as const},columns:[{name:"country_name",description:"",dataType:"string",isKey:false,provenance:"declared" as const},{name:"pm25_concentration",description:"",dataType:"int64",isKey:false,provenance:"declared" as const}]}],measures:[{entity:"ambient_air_quality",name:"average_pm25_concentration",description:"",formatString:"0.0",provenance:"user-confirmed" as const,semanticEvidence:{language:"DAX" as const,executable:false as const,expressionFingerprint:createHash("sha256").update("AVERAGE(ambient_air_quality[pm25_concentration])").digest("hex")}}],relationships:[],caveats:[]};
const runtimeContext={userId,datasetKey,binding:{operationalDatasetId:datasetId,datasetKey,ownerUserId:userId,adapterKind:"motherduck-pg" as const,resourceReference:"sample_data.who.ambient_air_quality",bindingState:"ready" as const},publicContract};
function request(body:unknown,origin="https://duckdive.gold"){return new Request("https://duckdive.gold/api/datasets/x/query",{method:"POST",headers:{origin,host:"duckdive.gold","content-type":"application/json"},body:JSON.stringify(body)});}
describe("operational dataset query route",()=>{
  beforeEach(()=>{vi.clearAllMocks();mocks.currentUser.mockResolvedValue({user_id:userId});mocks.getContext.mockResolvedValue(runtimeContext);mocks.query.mockResolvedValue([{country_name:"Australia"}]);});
  it("routes an owner-scoped bounded query",async()=>{const response=await POST(request({select:["country_name"],limit:1}),routeContext);expect(response.status).toBe(200);expect(await response.json()).toEqual({rows:[{country_name:"Australia"}],limit:1});expect(mocks.getContext).toHaveBeenCalledWith(userId,datasetId);});
  it("rejects raw SQL and unknown VIC fields before execution",async()=>{expect((await POST(request({select:["country_name"],sql:"SELECT * FROM vic_house_data"}),routeContext)).status).toBe(400);expect((await POST(request({select:["suburb_key"]}),routeContext)).status).toBe(400);expect(mocks.query).not.toHaveBeenCalled();});
  it("makes revoked or cross-owner context unavailable",async()=>{mocks.getContext.mockResolvedValue(null);expect((await POST(request({select:["country_name"]}),routeContext)).status).toBe(404);expect(mocks.query).not.toHaveBeenCalled();});
  it("marks the binding degraded when a live query fails",async()=>{mocks.query.mockRejectedValue(new Error("runtime unavailable"));await expect(POST(request({select:["country_name"]}),routeContext)).rejects.toThrow("runtime unavailable");expect(mocks.degrade).toHaveBeenCalledWith(userId,datasetId,"query-failed");});
});
