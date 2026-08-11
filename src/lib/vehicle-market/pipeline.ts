import {readFile} from "node:fs/promises";
import path from "node:path";
import {AutotraderVehicleMarketAdapter} from "./autotrader-adapter";
import {
  VEHICLE_MARKET_ADAPTER_VERSION,
  VEHICLE_MARKET_PARSER_VERSION,
  VEHICLE_MARKET_SCOPE_VERSION,
  VEHICLE_MARKET_SOURCE,
  vehicleMarketReplayManifestV1Schema,
  type CanonicalListingObservationV1,
  type ProcessedVehicleMarketRun,
  type VehicleMarketRawPageManifestV1,
  type VehicleMarketReplayManifestV1,
  type VehicleMarketRequestAttemptV1,
  type VehicleMarketRunStatus,
} from "./contracts";
import type {RawObjectStore} from "./raw-object-store";

export type RawPageInput={
  requestRole:"capture"|"consistency_probe";
  pageNumber:number;
  attemptNumber:number;
  requestUrl:string;
  requestedAt:string;
  responseReceivedAt:string;
  httpStatus:number;
  bytes:Buffer;
};

type ParsedInput={
  input:RawPageInput;
  manifest:VehicleMarketRawPageManifestV1;
  observations:CanonicalListingObservationV1[];
  metadata:{currentPage:number;lastPage:number;perPage:number;total:number;returned:number}|null;
  error?:string;
  errorKind?:"source_response"|"schema";
};

function requestDuration(input:RawPageInput){return Math.max(0,Date.parse(input.responseReceivedAt)-Date.parse(input.requestedAt));}

function validateRequestUrl(input:RawPageInput,scope:VehicleMarketReplayManifestV1["scope"]){
  const url=new URL(input.requestUrl),expected:Record<string,string>={state:scope.state,condition:scope.condition,sortBy:scope.sortBy,orderBy:scope.orderBy,paginate:String(scope.pageSize),page:String(input.pageNumber)};
  const optional:Record<string,string|undefined>={make:scope.make,model:scope.model,yearFrom:scope.yearFrom?.toString(),yearTo:scope.yearTo?.toString(),priceFrom:scope.priceFrom?.toString(),priceTo:scope.priceTo?.toString(),fuel_type:scope.fuelType,transmission_type:scope.transmissionType,drive_type:scope.driveType,body_type_group:scope.bodyTypeGroup};
  for(const [key,value] of Object.entries({...expected,...optional}))if(value!=null&&url.searchParams.get(key)!==value)throw new Error(`Request URL does not match ${key}`);
  for(const forbidden of ["kmsFrom","kmsTo"])if(url.searchParams.has(forbidden))throw new Error(`Unsupported source parameter: ${forbidden}`);
  const allowed=new Set([...Object.keys(expected),...Object.keys(optional)]);
  for(const key of url.searchParams.keys())if(!allowed.has(key))throw new Error(`Unsupported source parameter: ${key}`);
}

async function persistThenParse(input:RawPageInput,run:VehicleMarketReplayManifestV1,store:RawObjectStore,adapter:AutotraderVehicleMarketAdapter):Promise<ParsedInput>{
  const stored=await store.putImmutable({runId:run.runId,observationDate:run.observationDate,pageNumber:input.pageNumber,requestRole:input.requestRole,attemptNumber:input.attemptNumber,bytes:input.bytes});
  const manifest:VehicleMarketRawPageManifestV1={
    schemaVersion:"vehicle-market-raw-page/v1",runId:run.runId,source:VEHICLE_MARKET_SOURCE,scopeVersion:VEHICLE_MARKET_SCOPE_VERSION,requestRole:input.requestRole,pageNumber:input.pageNumber,attemptNumber:input.attemptNumber,requestUrl:input.requestUrl,requestedAt:input.requestedAt,responseReceivedAt:input.responseReceivedAt,durationMs:requestDuration(input),httpStatus:input.httpStatus,payloadSha256:stored.payloadSha256,responseBytes:stored.responseBytes,objectPath:stored.objectPath,adapterVersion:VEHICLE_MARKET_ADAPTER_VERSION,parserVersion:VEHICLE_MARKET_PARSER_VERSION,sourceCurrentPage:null,sourceLastPage:null,sourceTotal:null,sourceReturned:null,
  };
  try{validateRequestUrl(input,run.scope);}
  catch(error){return {input,manifest,observations:[],metadata:null,error:error instanceof Error?error.message:"Request validation failed",errorKind:"schema"};}
  if(input.httpStatus<200||input.httpStatus>=300)return {input,manifest,observations:[],metadata:null,error:`Source returned HTTP ${input.httpStatus}`,errorKind:"source_response"};
  try{
    const parsed=adapter.parsePage(input.bytes);
    Object.assign(manifest,{sourceCurrentPage:parsed.metadata.currentPage,sourceLastPage:parsed.metadata.lastPage,sourceTotal:parsed.metadata.total,sourceReturned:parsed.metadata.returned});
    if(parsed.metadata.currentPage!==input.pageNumber)return {input,manifest,observations:[],metadata:null,error:`Source current_page does not match requested page ${input.pageNumber}`,errorKind:"schema"};
    return {input,manifest,observations:parsed.observations,metadata:parsed.metadata};
  }catch(error){return {input,manifest,observations:[],metadata:null,error:error instanceof Error?error.message:"Raw page parsing failed",errorKind:"schema"};}
}

function latestObservation(existing:CanonicalListingObservationV1,candidate:CanonicalListingObservationV1){
  const existingTime=Date.parse(existing.sourceUpdatedAt??"")||0,candidateTime=Date.parse(candidate.sourceUpdatedAt??"")||0;
  if(candidateTime!==existingTime)return candidateTime>existingTime?candidate:existing;
  return candidate.sourceRecordHash.localeCompare(existing.sourceRecordHash)>=0?candidate:existing;
}

function collectionDuration(inputs:RawPageInput[]){
  const starts=inputs.map(input=>Date.parse(input.requestedAt)).filter(Number.isFinite),ends=inputs.map(input=>Date.parse(input.responseReceivedAt)).filter(Number.isFinite);
  return starts.length&&ends.length?Math.max(0,Math.max(...ends)-Math.min(...starts)):0;
}

export async function processVehicleMarketRawPages(run:VehicleMarketReplayManifestV1,inputs:RawPageInput[],store:RawObjectStore,adapter=new AutotraderVehicleMarketAdapter()):Promise<ProcessedVehicleMarketRun>{
  const persisted:ParsedInput[]=[],errors:string[]=[],warnings:string[]=[];
  for(const input of inputs){
    try{persisted.push(await persistThenParse(input,run,store,adapter));}
    catch(error){errors.push(error instanceof Error?error.message:"Raw page processing failed");}
  }
  for(const page of persisted){
    if(page.errorKind==="schema"&&page.error)errors.push(page.error);
    if(page.errorKind==="source_response"&&page.error)warnings.push(page.error);
  }
  const allManifests=persisted.map(page=>page.manifest),successfulCapture=persisted.filter(page=>page.input.requestRole==="capture"&&page.metadata),capturePages=new Map<number,ParsedInput>();
  for(const page of successfulCapture)capturePages.set(page.input.pageNumber,page);
  const first=capturePages.get(1),pagesExpected=first?.metadata?.lastPage??0,pagesFetched=capturePages.size;
  if(!first)warnings.push("Capture page 1 is unavailable");
  const attemptedCapturePages=new Set(persisted.filter(page=>page.input.requestRole==="capture").map(page=>page.input.pageNumber));
  const failedCapture=[...attemptedCapturePages].some(page=>!capturePages.has(page));
  const missingPages=pagesExpected?Array.from({length:pagesExpected},(_,index)=>index+1).filter(page=>!capturePages.has(page)):[];
  if(missingPages.length)warnings.push(`Missing capture pages: ${missingPages.slice(0,10).join(",")}${missingPages.length>10?"…":""}`);
  const orderedPages=[...capturePages.values()].sort((a,b)=>a.input.pageNumber-b.input.pageNumber),captureObservations=orderedPages.flatMap(page=>page.observations),rawHits=captureObservations.length;
  const unique=new Map<string,CanonicalListingObservationV1>(),classProfile:Record<string,number>={},validationIssues:string[]=[];
  let scopeViolations=0;
  let missingVehicleClass=0,lastCreated=Number.NEGATIVE_INFINITY,orderingInvalid=false;
  for(const observation of captureObservations){
    const validation=adapter.validateListing(observation,run.scope);validationIssues.push(...validation.issues);if(!validation.valid)scopeViolations++;
    if(observation.sourceListingId){const existing=unique.get(observation.sourceListingId);unique.set(observation.sourceListingId,existing?latestObservation(existing,observation):observation);}
    if(observation.vehicleClass)classProfile[observation.vehicleClass]=(classProfile[observation.vehicleClass]??0)+1;else missingVehicleClass++;
    if(observation.sourceCreatedAt){const timestamp=Date.parse(observation.sourceCreatedAt.replace(" ","T")+(/[zZ]|[+-]\d\d:?\d\d$/.test(observation.sourceCreatedAt)?"":"Z"));if(Number.isFinite(timestamp)){if(timestamp<lastCreated)orderingInvalid=true;lastCreated=Math.max(lastCreated,timestamp);}else warnings.push(`Unparseable source creation timestamp for ${observation.listingKey??"unknown listing"}`);}
  }
  if(orderingInvalid)errors.push("Source creation ordering decreased during capture");
  const probe=[...persisted].reverse().find(page=>page.input.requestRole==="consistency_probe"&&page.metadata),sourceTotalStart=first?.metadata?.total??0,sourceTotalEnd=probe?.metadata?.total??orderedPages.at(-1)?.metadata?.total??sourceTotalStart;
  if(!probe)warnings.push("End-of-run consistency probe is unavailable");
  const populationMetadataChanged=Boolean(first&&(
    orderedPages.some(page=>page.metadata?.lastPage!==first.metadata?.lastPage||page.metadata?.perPage!==first.metadata?.perPage||page.metadata?.total!==first.metadata?.total)
    ||(probe&&(first.metadata?.lastPage!==probe.metadata?.lastPage||first.metadata?.perPage!==probe.metadata?.perPage||first.metadata?.total!==probe.metadata?.total))
  ));
  const uniqueListingIds=unique.size,duplicateHits=Math.max(0,captureObservations.filter(item=>item.sourceListingId).length-uniqueListingIds);
  const partial=failedCapture||!first||!probe||missingPages.length>0||pagesFetched!==pagesExpected;
  const invalid=errors.length>0||scopeViolations>0||duplicateHits>0;
  const changed=!partial&&!invalid&&(sourceTotalStart!==sourceTotalEnd||populationMetadataChanged);
  const stableMismatch=!partial&&!invalid&&!changed&&(rawHits!==sourceTotalStart||uniqueListingIds!==sourceTotalStart||duplicateHits!==0);
  if(stableMismatch)errors.push("Stable run counts do not reconcile to the source total");
  let runStatus:VehicleMarketRunStatus=invalid||stableMismatch?"INVALID":partial?"PARTIAL":changed?"CHANGED_DURING_CAPTURE":"COMPLETE";
  if(runStatus==="COMPLETE"&&scopeViolations!==0)runStatus="INVALID";
  return {
    runId:run.runId,observationDate:run.observationDate,scope:run.scope,
    requestAttempts:allManifests.map((page):VehicleMarketRequestAttemptV1=>({requestRole:page.requestRole,pageNumber:page.pageNumber,attemptNumber:page.attemptNumber,requestUrl:page.requestUrl,requestedAt:page.requestedAt,completedAt:page.responseReceivedAt,durationMs:page.durationMs,httpStatus:page.httpStatus,objectPath:page.objectPath,payloadSha256:page.payloadSha256,networkErrorCode:null})),
    rawPages:allManifests,observations:[...unique.values()].sort((a,b)=>(a.sourceListingId??"").localeCompare(b.sourceListingId??"",undefined,{numeric:true})),
    quality:{schemaVersion:"vehicle-market-run-quality/v1",runId:run.runId,sourceTotal:sourceTotalStart,sourceTotalStart,sourceTotalEnd,rawHits,uniqueListingIds,duplicateHits,scopeViolations,pagesExpected,pagesFetched,runStatus,collectionDurationMs:collectionDuration(inputs),vehicleClassProfile:classProfile,missingVehicleClass,warnings,errors:[...errors,...new Set(validationIssues)]},
  };
}

export async function replayVehicleMarketManifest(manifestPath:string,store:RawObjectStore,adapter=new AutotraderVehicleMarketAdapter()){
  const absolute=path.resolve(manifestPath),manifest=vehicleMarketReplayManifestV1Schema.parse(JSON.parse(await readFile(absolute,"utf8"))),base=path.dirname(absolute);
  return replayVehicleMarketManifestValue(manifest,store,adapter,base);
}

export async function replayVehicleMarketManifestValue(manifest:VehicleMarketReplayManifestV1,store:RawObjectStore,adapter=new AutotraderVehicleMarketAdapter(),localBase?:string){
  const inputs:RawPageInput[]=[];
  for(const page of manifest.pages){
    const bytes=page.file?await readFile(path.resolve(localBase??process.cwd(),page.file)):await store.read(page.objectPath as string);
    inputs.push({requestRole:page.requestRole,pageNumber:page.pageNumber,attemptNumber:page.attemptNumber??1,requestUrl:page.requestUrl,requestedAt:page.requestedAt,responseReceivedAt:page.responseReceivedAt,httpStatus:page.httpStatus,bytes});
  }
  return processVehicleMarketRawPages(manifest,inputs,store,adapter);
}
