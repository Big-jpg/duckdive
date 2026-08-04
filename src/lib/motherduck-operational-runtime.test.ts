import {beforeEach,describe,expect,it,vi} from "vitest";
const mocks=vi.hoisted(()=>({serviceSql:vi.fn()}));
vi.mock("./motherduck-access",()=>({motherduckServiceSql:mocks.serviceSql}));
import {MotherDuckOperationalRuntimeAdapter,operationalRuntimeUsername} from "./motherduck-operational-runtime";
import {WHO_RUNTIME_RESOURCE_REFERENCE} from "./operational-runtime-policy";

describe("MotherDuck operational runtime adapter",()=>{
  beforeEach(()=>vi.clearAllMocks());
  it("requires a WHO-only identity distinct from VIC",()=>{
    expect(()=>operationalRuntimeUsername({})).toThrow("required");
    expect(()=>operationalRuntimeUsername({MOTHERDUCK_WHO_SERVICE_ACCOUNT_USERNAME:"vic_house_lab"})).toThrow("must not reuse");
    expect(operationalRuntimeUsername({MOTHERDUCK_WHO_SERVICE_ACCOUNT_USERNAME:"duckdive_who_runtime",MOTHERDUCK_SHARED_SERVICE_ACCOUNT_USERNAME:"vic_house_lab"})).toBe("duckdive_who_runtime");
  });
  it("inspects only the fixed WHO resource with a read-scaling connection",async()=>{
    const unsafe=vi.fn().mockResolvedValue([{column_name:"country_name",column_type:"VARCHAR"}]),sql=Object.assign(vi.fn(),{unsafe});mocks.serviceSql.mockResolvedValue(sql);
    const adapter=new MotherDuckOperationalRuntimeAdapter("duckdive_who_runtime");
    await expect(adapter.inspect(WHO_RUNTIME_RESOURCE_REFERENCE)).resolves.toEqual({resourceReference:WHO_RUNTIME_RESOURCE_REFERENCE,columns:[{name:"country_name",dataType:"VARCHAR"}]});
    expect(mocks.serviceSql).toHaveBeenCalledWith("duckdive_who_runtime","read_scaling");
    await expect(adapter.inspect("vic_house_data.mart.suburb_monthly_sales")).rejects.toThrow("unavailable");
  });
  it("executes only a precompiled statement and enforces its result limit",async()=>{
    const unsafe=vi.fn().mockResolvedValue([{country_name:"Australia"},{country_name:"New Zealand"}]),sql=Object.assign(vi.fn(),{unsafe});mocks.serviceSql.mockResolvedValue(sql);
    const rows=await new MotherDuckOperationalRuntimeAdapter("duckdive_who_runtime").query({text:'SELECT "country_name" FROM "sample_data"."who"."ambient_air_quality" LIMIT 1',values:[],limit:1});
    expect(rows).toEqual([{country_name:"Australia"}]);expect(unsafe).toHaveBeenCalledOnce();
  });
});
