import {mkdir,readFile,writeFile} from "node:fs/promises";
import path from "node:path";
import {assertLiveAcquisitionAuthorized,captureLiveVehicleMarket} from "../src/lib/vehicle-market/live-acquisition";
import {vehicleMarketReplayManifestV1Schema,vehicleMarketScopeV1Schema,type ProcessedVehicleMarketRun} from "../src/lib/vehicle-market/contracts";
import {replayVehicleMarketManifest,replayVehicleMarketManifestValue} from "../src/lib/vehicle-market/pipeline";
import {LocalRawObjectStore,VercelBlobRawObjectStore} from "../src/lib/vehicle-market/raw-object-store";
import {persistVehicleMarketOperationalRun} from "../src/lib/vehicle-market/operational-store";

function argument(name:string){const index=process.argv.indexOf(name);return index>=0?process.argv[index+1]:undefined;}
function requiredArgument(name:string){const value=argument(name);if(!value)throw new Error(`${name} is required`);return value;}
function has(name:string){return process.argv.includes(name);}

const evidenceRoot=path.resolve(argument("--evidence-root")??".vehicle-market-evidence"),localStore=new LocalRawObjectStore(path.join(evidenceRoot,"objects"));

function evidence(run:ProcessedVehicleMarketRun){const quality=run.quality;return {source_total:quality.sourceTotal,source_total_start:quality.sourceTotalStart,source_total_end:quality.sourceTotalEnd,raw_hits:quality.rawHits,unique_listing_ids:quality.uniqueListingIds,duplicate_hits:quality.duplicateHits,scope_violations:quality.scopeViolations,pages_expected:quality.pagesExpected,pages_fetched:quality.pagesFetched,run_status:quality.runStatus};}

function replayManifest(run:ProcessedVehicleMarketRun){return {schemaVersion:"vehicle-market-replay/v1",runId:run.runId,observationDate:run.observationDate,scope:run.scope,pages:run.rawPages.map(page=>({requestRole:page.requestRole,pageNumber:page.pageNumber,attemptNumber:page.attemptNumber,requestUrl:page.requestUrl,requestedAt:page.requestedAt,responseReceivedAt:page.responseReceivedAt,httpStatus:page.httpStatus,objectPath:page.objectPath}))};}

async function saveRun(run:ProcessedVehicleMarketRun,blobStore?:VercelBlobRawObjectStore){
  const directory=path.join(evidenceRoot,"runs",run.runId);await mkdir(directory,{recursive:true});
  const manifest=Buffer.from(JSON.stringify(replayManifest(run),null,2)),blobManifest=blobStore?await blobStore.putManifest(run.runId,run.observationDate,manifest):null;
  await writeFile(path.join(directory,"manifest.json"),manifest);
  await writeFile(path.join(directory,"run.json"),JSON.stringify({...run,observations:undefined,evidence:evidence(run),blobManifest},null,2));
  await writeFile(path.join(directory,"observations.jsonl"),run.observations.map(row=>JSON.stringify(row)).join("\n")+(run.observations.length?"\n":""));
  console.log(JSON.stringify({run_id:run.runId,...evidence(run)},null,2));
}

async function main(){
  const command=process.argv[2];
  if(command==="replay"){
    const manifest=requiredArgument("--manifest");
    if(/^https:\/\//i.test(manifest)){
      const blobStore=new VercelBlobRawObjectStore(),document=vehicleMarketReplayManifestV1Schema.parse(JSON.parse((await blobStore.read(manifest)).toString("utf8")));
      await saveRun(await replayVehicleMarketManifestValue(document,blobStore));return;
    }
    const run=await replayVehicleMarketManifest(manifest,localStore);await saveRun(run);if(has("--record-neon"))await persistVehicleMarketOperationalRun(run);return;
  }
  if(command==="smoke"){
    if(!has("--live"))throw new Error("--live is required for an explicit bounded source smoke");
    assertLiveAcquisitionAuthorized("smoke");
    const scope=vehicleMarketScopeV1Schema.parse(JSON.parse(await readFile(path.resolve(requiredArgument("--scope")),"utf8")));
    const liveStore=has("--blob")?new VercelBlobRawObjectStore():localStore;
    const run=await captureLiveVehicleMarket({mode:"smoke",scope,store:liveStore});await saveRun(run,liveStore instanceof VercelBlobRawObjectStore?liveStore:undefined);if(has("--record-neon"))await persistVehicleMarketOperationalRun(run);return;
  }
  if(command==="collect"){
    if(!has("--live")||!has("--full-wa-used"))throw new Error("--live and --full-wa-used are required for full collection");
    assertLiveAcquisitionAuthorized("full");
    const blobStore=new VercelBlobRawObjectStore();
    const run=await captureLiveVehicleMarket({mode:"full",store:blobStore});await saveRun(run,blobStore);await persistVehicleMarketOperationalRun(run);return;
  }
  if(command==="status"){
    const runId=requiredArgument("--run");if(!/^[A-Za-z0-9._-]+$/.test(runId))throw new Error("Invalid run ID");
    console.log(await readFile(path.join(evidenceRoot,"runs",runId,"run.json"),"utf8"));return;
  }
  throw new Error("Use replay, smoke, collect, or status");
}

main().catch(error=>{console.error(error instanceof Error?error.message:error);process.exitCode=1;});
