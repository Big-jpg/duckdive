import {describe,expect,it} from "vitest";
import {replayVehicleMarketManifest} from "./pipeline";
import {buildVehicleMarketStageBatch,isVehicleMarketRunPublishable} from "./motherduck-publisher";
import {sha256Hex} from "./contracts";
import type {RawObjectInput,RawObjectStore} from "./raw-object-store";

class MemoryStore implements RawObjectStore{
  readonly objects=new Map<string,Buffer>();
  async putImmutable(input:RawObjectInput){const payloadSha256=sha256Hex(input.bytes),objectPath=`memory://${input.requestRole}/${input.pageNumber}/${input.attemptNumber}/${payloadSha256}`;this.objects.set(objectPath,Buffer.from(input.bytes));return {objectPath,payloadSha256,responseBytes:input.bytes.byteLength};}
  async read(objectPath:string){const value=this.objects.get(objectPath);if(!value)throw new Error("missing object");return Buffer.from(value);}
}

describe("vehicle-market DuckLake staging",()=>{
  it("builds reconciled dimensional rows with exact raw-page lineage",async()=>{
    const store=new MemoryStore(),run=await replayVehicleMarketManifest("fixtures/vehicle-market/replay/wa-used-sanitized.manifest.json",store),batch=await buildVehicleMarketStageBatch(run,store);
    expect(batch.rows.dimObservationRun).toHaveLength(1);expect(batch.rows.factListingObservation).toHaveLength(2);expect(batch.rows.dimListing).toHaveLength(2);
    expect(batch.rows.factListingObservation[0]).toMatchObject({load_id:run.runId,raw_page_number:1});
    expect(batch.rows.factListingObservation.every(row=>typeof row.raw_payload_sha256==="string"&&typeof row.raw_object_reference==="string")).toBe(true);
    expect(batch.rows.factListingObservation[0]).not.toHaveProperty("description");
    expect(batch.rows.dimListingContent[0]).toHaveProperty("description");
  });

  it("denies publication staging for incomplete evidence",async()=>{
    const store=new MemoryStore(),run=await replayVehicleMarketManifest("fixtures/vehicle-market/replay/wa-used-sanitized.manifest.json",store);run.quality.runStatus="PARTIAL";
    await expect(buildVehicleMarketStageBatch(run,store)).rejects.toThrow("not publishable");
  });

  it("allows fully enumerated changed populations for current-market publication",async()=>{
    const store=new MemoryStore(),run=await replayVehicleMarketManifest("fixtures/vehicle-market/replay/wa-used-sanitized.manifest.json",store);
    run.quality={...run.quality,runStatus:"CHANGED_DURING_CAPTURE",sourceTotalStart:1,sourceTotalEnd:2,sourceTotal:1};
    expect(isVehicleMarketRunPublishable(run)).toBe(true);
    await expect(buildVehicleMarketStageBatch(run,store)).resolves.toMatchObject({rows:{factListingObservation:[{},{}]}});
    run.quality.pagesFetched=0;
    expect(isVehicleMarketRunPublishable(run)).toBe(false);
  });

  it("allows only tightly bounded duplicate drift without rewriting the recorded status",async()=>{
    const store=new MemoryStore(),run=await replayVehicleMarketManifest("fixtures/vehicle-market/replay/wa-used-sanitized.manifest.json",store);
    run.quality={...run.quality,runStatus:"INVALID",rawHits:14741,uniqueListingIds:14737,duplicateHits:4,errors:["Source creation ordering decreased during capture"]};
    expect(isVehicleMarketRunPublishable(run)).toBe(true);
    run.quality.errors=["Raw page schema mismatch"];
    expect(isVehicleMarketRunPublishable(run)).toBe(false);
    run.quality.errors=["Source creation ordering decreased during capture"];
    run.quality.rawHits=14748;run.quality.uniqueListingIds=14737;run.quality.duplicateHits=11;
    expect(isVehicleMarketRunPublishable(run)).toBe(false);
  });

  it("fails closed when a retained raw object no longer matches its hash",async()=>{
    const store=new MemoryStore(),run=await replayVehicleMarketManifest("fixtures/vehicle-market/replay/wa-used-sanitized.manifest.json",store);store.objects.set(run.rawPages[0].objectPath,Buffer.from("{}"));
    await expect(buildVehicleMarketStageBatch(run,store)).rejects.toThrow("hash mismatch");
  });

  it("fails closed when saved canonical rows differ from retained raw evidence",async()=>{
    const store=new MemoryStore(),run=await replayVehicleMarketManifest("fixtures/vehicle-market/replay/wa-used-sanitized.manifest.json",store);run.observations[0]={...run.observations[0],advertisedPrice:1};
    await expect(buildVehicleMarketStageBatch(run,store)).rejects.toThrow("conflicts with raw evidence");
  });
});
