import {readFile} from "node:fs/promises";
import path from "node:path";
import {describe,expect,it} from "vitest";
import {seedVehicleMarketFixtureToRawStore} from "./blob-seed";
import {sha256Hex} from "./contracts";
import type {RawManifestStore,RawObjectInput} from "./raw-object-store";

class MemoryManifestStore implements RawManifestStore{
  readonly objects=new Map<string,Buffer>();
  async putImmutable(input:RawObjectInput){const payloadSha256=sha256Hex(input.bytes),objectPath=`memory://raw/${input.requestRole}/${input.pageNumber}/${input.attemptNumber}/${payloadSha256}`;this.objects.set(objectPath,Buffer.from(input.bytes));return {objectPath,payloadSha256,responseBytes:input.bytes.byteLength};}
  async putManifest(runId:string,observationDate:string,bytes:Buffer){const payloadSha256=sha256Hex(bytes),objectPath=`memory://manifest/${observationDate}/${runId}/${payloadSha256}`;this.objects.set(objectPath,Buffer.from(bytes));return {objectPath,payloadSha256,responseBytes:bytes.byteLength};}
  async read(objectPath:string){const value=this.objects.get(objectPath);if(!value)throw new Error("missing object");return Buffer.from(value);}
}

describe("vehicle-market private raw-store fixture seeding",()=>{
  it("uploads exact fixture bytes and emits a replayable object-backed manifest",async()=>{
    const store=new MemoryManifestStore(),manifestPath=path.resolve("fixtures/vehicle-market/replay/wa-used-sanitized.manifest.json");
    const seeded=await seedVehicleMarketFixtureToRawStore(manifestPath,store);
    expect(seeded.rawObjects).toBe(2);expect(seeded.manifest.pages.every(page=>Boolean(page.objectPath)&&!page.file)).toBe(true);
    const source=JSON.parse(await readFile(manifestPath,"utf8"));
    for(let index=0;index<source.pages.length;index++)expect(sha256Hex(await store.read(seeded.manifest.pages[index].objectPath as string))).toBe(sha256Hex(await readFile(path.resolve(path.dirname(manifestPath),source.pages[index].file))));
    expect(sha256Hex(await store.read(seeded.manifestObjectPath))).toBe(seeded.manifestPayloadSha256);
  });

  it("rejects an object-backed manifest as a fixture seed source",async()=>{
    const store=new MemoryManifestStore(),source=JSON.parse(await readFile(path.resolve("fixtures/vehicle-market/replay/wa-used-sanitized.manifest.json"),"utf8"));
    source.pages[0].objectPath="https://example.test/raw.json";delete source.pages[0].file;
    const temporary=path.resolve("fixtures/vehicle-market/replay/.seed-object-backed.test.json");
    await expect((async()=>{
      const {writeFile,unlink}=await import("node:fs/promises");await writeFile(temporary,JSON.stringify(source));try{return await seedVehicleMarketFixtureToRawStore(temporary,store);}finally{await unlink(temporary).catch(()=>{});}
    })()).rejects.toThrow("local file-backed");
  });
});
