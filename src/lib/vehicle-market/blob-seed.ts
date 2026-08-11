import {readFile} from "node:fs/promises";
import path from "node:path";
import {vehicleMarketReplayManifestV1Schema,type VehicleMarketReplayManifestV1} from "./contracts";
import type {RawManifestStore} from "./raw-object-store";

export type SeededVehicleMarketManifest={
  manifest:VehicleMarketReplayManifestV1;
  manifestObjectPath:string;
  manifestPayloadSha256:string;
  rawObjects:number;
};

export async function seedVehicleMarketFixtureToRawStore(manifestPath:string,store:RawManifestStore):Promise<SeededVehicleMarketManifest>{
  const absolute=path.resolve(manifestPath),base=path.dirname(absolute);
  const source=vehicleMarketReplayManifestV1Schema.parse(JSON.parse(await readFile(absolute,"utf8")));
  const pages:VehicleMarketReplayManifestV1["pages"]=[];
  for(const page of source.pages){
    if(!page.file)throw new Error("Fixture seeding requires local file-backed manifest pages");
    const bytes=await readFile(path.resolve(base,page.file));
    const stored=await store.putImmutable({runId:source.runId,observationDate:source.observationDate,pageNumber:page.pageNumber,requestRole:page.requestRole,attemptNumber:page.attemptNumber??1,bytes});
    pages.push({requestRole:page.requestRole,pageNumber:page.pageNumber,attemptNumber:page.attemptNumber??1,requestUrl:page.requestUrl,requestedAt:page.requestedAt,responseReceivedAt:page.responseReceivedAt,httpStatus:page.httpStatus,objectPath:stored.objectPath});
  }
  const manifest=vehicleMarketReplayManifestV1Schema.parse({...source,pages}),bytes=Buffer.from(JSON.stringify(manifest,null,2));
  const storedManifest=await store.putManifest(source.runId,source.observationDate,bytes);
  return {manifest,manifestObjectPath:storedManifest.objectPath,manifestPayloadSha256:storedManifest.payloadSha256,rawObjects:pages.length};
}
