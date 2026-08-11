import {describe,expect,it,vi} from "vitest";
import {assertLiveAcquisitionAuthorized,captureLiveVehicleMarket,VehicleMarketAuthorizationError} from "./live-acquisition";
import type {RawObjectInput,RawObjectStore} from "./raw-object-store";
import {sha256Hex} from "./contracts";

class MemoryStore implements RawObjectStore{
  writes:RawObjectInput[]=[];
  async putImmutable(input:RawObjectInput){this.writes.push(input);return {objectPath:`memory://${this.writes.length}`,payloadSha256:sha256Hex(input.bytes),responseBytes:input.bytes.length};}
  async read(){return Buffer.alloc(0);}
}

function response(page:number,lastPage=2){const data=[{id:page,condition:"Used",location_state:"WA",created_at:`2026-08-11 0${page}:00:00`}];return new Response(JSON.stringify({current_page:page,last_page:lastPage,per_page:50,total:lastPage,data}),{status:200});}

describe("live vehicle-market acquisition gate",()=>{
  it("requires the source gate and a separate full-population gate",()=>{
    expect(()=>assertLiveAcquisitionAuthorized("smoke",{})).toThrow(VehicleMarketAuthorizationError);
    expect(()=>assertLiveAcquisitionAuthorized("full",{VEHICLE_MARKET_SOURCE_ENABLED:"true"})).toThrow("VEHICLE_MARKET_ALLOW_FULL_WA_COLLECTION");
    expect(()=>assertLiveAcquisitionAuthorized("full",{VEHICLE_MARKET_SOURCE_ENABLED:"true",VEHICLE_MARKET_ALLOW_FULL_WA_COLLECTION:"true"})).not.toThrow();
  });

  it("enumerates a bounded population sequentially and probes page one at the end",async()=>{
    const store=new MemoryStore(),requested:number[]=[];
    const fetchImpl=vi.fn(async(input:string|URL|Request)=>{const page=Number(new URL(String(input)).searchParams.get("page"));requested.push(page);return response(page);}) as unknown as typeof fetch;
    const result=await captureLiveVehicleMarket({mode:"smoke",store,fetchImpl,env:{VEHICLE_MARKET_SOURCE_ENABLED:"true"},delayMs:0,sleep:async()=>{},now:(()=>{let tick=0;return ()=>new Date(Date.UTC(2026,7,11,0,0,0,tick++));})()});
    expect(requested).toEqual([1,2,1]);
    expect(result.quality).toMatchObject({pagesExpected:2,pagesFetched:2,rawHits:2,runStatus:"COMPLETE"});
    expect(result.requestAttempts).toHaveLength(3);
    expect(store.writes.map(write=>write.requestRole)).toEqual(["capture","capture","consistency_probe","capture","capture","consistency_probe"]);
  });

  it("records bounded no-response attempts and returns a PARTIAL audit result",async()=>{
    const result=await captureLiveVehicleMarket({mode:"smoke",store:new MemoryStore(),fetchImpl:vi.fn(async()=>{throw new TypeError("offline");}) as unknown as typeof fetch,env:{VEHICLE_MARKET_SOURCE_ENABLED:"true"},delayMs:0,maxAttempts:3,sleep:async()=>{}});
    expect(result.quality.runStatus).toBe("PARTIAL");
    expect(result.rawPages).toEqual([]);
    expect(result.requestAttempts).toHaveLength(3);
    expect(result.requestAttempts.every(attempt=>attempt.httpStatus===null&&attempt.networkErrorCode==="network-error")).toBe(true);
  });
});
