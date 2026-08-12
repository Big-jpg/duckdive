import {afterEach,describe,expect,it,vi} from "vitest";
import {createEmbedSession} from "./motherduck-api";

describe("MotherDuck embed sessions",()=>{
  afterEach(()=>vi.unstubAllGlobals());

  it("binds the configured share to the dataset alias for the session",async()=>{
    const fetchMock=vi.fn(async()=>new Response(JSON.stringify({session:"embedded"}),{status:200,headers:{"Content-Type":"application/json"}}));
    vi.stubGlobal("fetch",fetchMock);
    process.env.MOTHERDUCK_TOKEN="test-token";
    await expect(createEmbedSession("dive/id","vic_house_lab",[{url:"md:_share/wa/current",alias:"wa_vehicle_market"}])).resolves.toBe("embedded");
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/v1/dives/dive%2Fid/embed-session"),expect.objectContaining({
      method:"POST",
      body:JSON.stringify({username:"vic_house_lab",required_resources:[{url:"md:_share/wa/current",alias:"wa_vehicle_market"}]}),
    }));
  });
});
