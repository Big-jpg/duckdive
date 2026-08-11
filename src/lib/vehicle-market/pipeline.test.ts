import {readFile} from "node:fs/promises";
import path from "node:path";
import {describe,expect,it} from "vitest";
import {AutotraderVehicleMarketAdapter,buildAutotraderUrl} from "./autotrader-adapter";
import {canonicalVehicleMarketScope,sha256Hex,type VehicleMarketReplayManifestV1} from "./contracts";
import {processVehicleMarketRawPages,replayVehicleMarketManifest,type RawPageInput} from "./pipeline";
import type {RawObjectInput,RawObjectStore} from "./raw-object-store";

class MemoryRawObjectStore implements RawObjectStore{
  readonly writes:RawObjectInput[]=[];
  readonly objects=new Map<string,Buffer>();
  async putImmutable(input:RawObjectInput){
    this.writes.push(input);const payloadSha256=sha256Hex(input.bytes),objectPath=`memory://${input.requestRole}/${input.pageNumber}/${input.attemptNumber}/${payloadSha256}`;
    this.objects.set(objectPath,Buffer.from(input.bytes));return {objectPath,payloadSha256,responseBytes:input.bytes.byteLength};
  }
  async read(objectPath:string){const bytes=this.objects.get(objectPath);if(!bytes)throw new Error("missing object");return bytes;}
}

function run(scope=canonicalVehicleMarketScope()):VehicleMarketReplayManifestV1{return {schemaVersion:"vehicle-market-replay/v1",runId:"22222222-2222-4222-8222-222222222222",observationDate:"2026-08-11",scope,pages:[]};}
function page(body:unknown,overrides:Partial<RawPageInput>={}):RawPageInput{return {requestRole:"capture",pageNumber:1,attemptNumber:1,requestUrl:buildAutotraderUrl(canonicalVehicleMarketScope(),1),requestedAt:"2026-08-11T00:00:00.000Z",responseReceivedAt:"2026-08-11T00:00:00.100Z",httpStatus:200,bytes:Buffer.from(typeof body==="string"?body:JSON.stringify(body)),...overrides};}
function body(data:unknown[],metadata:Partial<{current_page:number;last_page:number;per_page:number;total:number}>={}){return {current_page:1,last_page:1,per_page:50,total:data.length,data,...metadata};}
const valid={id:1,condition:"Used",location_state:"WA",created_at:"2026-08-11 00:00:00",vehicle_class:"Car",make:"Subaru",model:"Outback",price:10000};

describe("vehicle-market replay pipeline",()=>{
  it("preserves the dated source-behaviour evidence without promoting it to a production constant",async()=>{
    const expected=JSON.parse(await readFile(path.resolve("fixtures/vehicle-market/source-behaviour/2026-08-11-wa-used.expected.json"),"utf8"));
    expect((expected.last_page-1)*expected.page_size+expected.last_page_rows).toBe(expected.source_total);
    expect(expected).toMatchObject({source_total:14749,last_page:295,last_page_rows:49,page_after_last_rows:0});
  });

  it("replays the checked-in evidence through the shared path and reconciles exactly",async()=>{
    const result=await replayVehicleMarketManifest(path.resolve("fixtures/vehicle-market/replay/wa-used-sanitized.manifest.json"),new MemoryRawObjectStore());
    expect(result.quality).toMatchObject({sourceTotal:2,rawHits:2,uniqueListingIds:2,scopeViolations:0,pagesExpected:1,pagesFetched:1,runStatus:"COMPLETE"});
    expect(result.rawPages).toHaveLength(2);
  });

  it("persists exact bytes before parsing and retains malformed responses",async()=>{
    const order:string[]=[],store=new MemoryRawObjectStore();
    const originalPut=store.putImmutable.bind(store);store.putImmutable=async input=>{order.push("persist");return originalPut(input);};
    class OrderedAdapter extends AutotraderVehicleMarketAdapter{override parsePage(bytes:Buffer){order.push("parse");return super.parsePage(bytes);}}
    const bytes="{malformed";
    const result=await processVehicleMarketRawPages(run(),[page(bytes)],store,new OrderedAdapter());
    expect(order).toEqual(["persist","parse"]);
    expect(store.writes[0].bytes.toString()).toBe(bytes);
    expect(result.rawPages).toHaveLength(1);
    expect(result.quality.runStatus).toBe("INVALID");
  });

  it("retains non-200 retry evidence without poisoning a later successful page",async()=>{
    const store=new MemoryRawObjectStore(),success=page(body([valid]),{attemptNumber:2});
    const result=await processVehicleMarketRawPages(run(),[page({error:"busy"},{httpStatus:429}),success,page(body([valid]),{requestRole:"consistency_probe",attemptNumber:1})],store);
    expect(store.writes).toHaveLength(3);
    expect(result.quality.runStatus).toBe("COMPLETE");
    expect(result.quality.warnings).toContain("Source returned HTTP 429");
  });

  it.each([
    ["state",{...valid,location_state:"VIC"}],
    ["condition",{...valid,condition:"New"}],
    ["listing id",{...valid,id:null}],
  ])("invalidates a %s hard-scope violation",async(_label,listing)=>{
    const result=await processVehicleMarketRawPages(run(),[page(body([listing]))],new MemoryRawObjectStore());
    expect(result.quality).toMatchObject({scopeViolations:1,runStatus:"INVALID"});
  });

  it("profiles vehicle class without making it a hard predicate",async()=>{
    const result=await processVehicleMarketRawPages(run(),[page(body([{...valid,vehicle_class:"Commercial"},{...valid,id:2,vehicle_class:null}]))],new MemoryRawObjectStore());
    expect(result.quality.vehicleClassProfile).toEqual({Commercial:1});
    expect(result.quality.missingVehicleClass).toBe(1);
    expect(result.quality.scopeViolations).toBe(0);
  });

  it("classifies changed, partial, duplicate, and request-contract failures",async()=>{
    const changed=await processVehicleMarketRawPages(run(),[page(body([valid])),page(body([valid],{total:2}),{requestRole:"consistency_probe"})],new MemoryRawObjectStore());
    expect(changed.quality.runStatus).toBe("CHANGED_DURING_CAPTURE");
    const partial=await processVehicleMarketRawPages(run(),[page(body([valid],{last_page:2,total:2}))],new MemoryRawObjectStore());
    expect(partial.quality.runStatus).toBe("PARTIAL");
    const duplicate=await processVehicleMarketRawPages(run(),[page(body([valid,{...valid,price:11000}]))],new MemoryRawObjectStore());
    expect(duplicate.quality).toMatchObject({duplicateHits:1,runStatus:"INVALID"});
    const forbidden=page(body([valid]),{requestUrl:`${buildAutotraderUrl(canonicalVehicleMarketScope(),1)}&kmsFrom=50000`});
    const invalid=await processVehicleMarketRawPages(run(),[forbidden],new MemoryRawObjectStore());
    expect(invalid.quality.runStatus).toBe("INVALID");
    expect(invalid.rawPages).toHaveLength(1);
  });

  it("preserves exact fixture hashes",async()=>{
    const bytes=await readFile(path.resolve("fixtures/vehicle-market/autotrader/wa-used-page-1.json")),store=new MemoryRawObjectStore();
    const result=await processVehicleMarketRawPages(run(),[page(bytes.toString())],store);
    expect(result.rawPages[0].payloadSha256).toBe(sha256Hex(bytes));
  });
});
