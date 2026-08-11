import {readFile} from "node:fs/promises";
import path from "node:path";
import postgres,{type TransactionSql} from "postgres";
import {AutotraderVehicleMarketAdapter,sourceScopeFingerprint} from "./autotrader-adapter";
import {buildVehicleMarketAnalyticalBatch} from "./analytical-model";
import {VEHICLE_MARKET_ADAPTER_VERSION,VEHICLE_MARKET_MODEL_VERSION,VEHICLE_MARKET_PARSER_VERSION,VEHICLE_MARKET_SCHEMA_VERSION,canonicalJson,sha256Hex,type ProcessedVehicleMarketRun} from "./contracts";
import type {RawObjectStore} from "./raw-object-store";

type StageRows={
  dimObservationRun:Record<string,unknown>[];
  dimListing:Record<string,unknown>[];
  dimVehicleSpec:Record<string,unknown>[];
  dimSellerVersion:Record<string,unknown>[];
  dimLocation:Record<string,unknown>[];
  dimListingContent:Record<string,unknown>[];
  factListingObservation:Record<string,unknown>[];
};

export type VehicleMarketStageBatch={loadId:string;runKey:string;rawManifestSha256:string;rows:StageRows};
export type PublishedVehicleMarketRun={runId:string;runKey:string;runStatus:"COMPLETE";sourceRows:number;factRows:number;dimensionCounts:{listings:number;vehicleSpecs:number;sellerVersions:number;locations:number;contents:number};rawManifestSha256:string};

function timestamp(value:string|null|undefined){
  if(!value)return null;
  const normalized=value.includes("T")?value:value.replace(" ","T"),withZone=/[zZ]|[+-]\d\d:?\d\d$/.test(normalized)?normalized:`${normalized}Z`,date=new Date(withZone);
  return Number.isFinite(date.getTime())?date.toISOString():null;
}

function dateOnly(value:string|null|undefined){const parsed=timestamp(value);return parsed?.slice(0,10)??null;}
function rowValues<T>(values:Map<string,T>){return [...values.values()];}

export async function buildVehicleMarketStageBatch(run:ProcessedVehicleMarketRun,store:RawObjectStore,adapter=new AutotraderVehicleMarketAdapter()):Promise<VehicleMarketStageBatch>{
  if(run.quality.runStatus!=="COMPLETE")throw new Error("Only a COMPLETE vehicle-market run may be published");
  const lineage=new Map<string,{rawPayloadSha256:string;rawObjectReference:string;rawPageNumber:number}>(),rawObservations=new Map<string,ProcessedVehicleMarketRun["observations"][number]>();
  for(const page of run.rawPages.filter(item=>item.requestRole==="capture"&&item.httpStatus>=200&&item.httpStatus<300&&item.sourceCurrentPage===item.pageNumber)){
    const bytes=await store.read(page.objectPath);
    if(sha256Hex(bytes)!==page.payloadSha256)throw new Error(`Raw payload hash mismatch for page ${page.pageNumber}`);
    const parsed=adapter.parsePage(bytes);
    if(parsed.metadata.currentPage!==page.pageNumber)throw new Error(`Raw page identity mismatch for page ${page.pageNumber}`);
    for(const observation of parsed.observations){lineage.set(observation.sourceRecordHash,{rawPayloadSha256:page.payloadSha256,rawObjectReference:page.objectPath,rawPageNumber:page.pageNumber});rawObservations.set(observation.sourceRecordHash,observation);}
  }
  for(const observation of run.observations){const raw=rawObservations.get(observation.sourceRecordHash);if(!raw||canonicalJson(raw)!==canonicalJson(observation))throw new Error(`Saved canonical observation conflicts with raw evidence for ${observation.listingKey??"unknown listing"}`);}
  const analytical=buildVehicleMarketAnalyticalBatch(run),loadId=run.runId,quality=run.quality;
  const dimObservationRun=[{load_id:loadId,run_key:analytical.run.runKey,run_id:run.runId,observation_date:run.observationDate,observed_at:analytical.run.observedAt,scope_version:run.scope.scopeVersion,scope_fingerprint:sourceScopeFingerprint(run.scope),source_total_start:quality.sourceTotalStart,source_total_end:quality.sourceTotalEnd,pages_expected:quality.pagesExpected,pages_fetched:quality.pagesFetched,raw_hits:quality.rawHits,unique_listing_ids:quality.uniqueListingIds,duplicate_hits:quality.duplicateHits,scope_violations:quality.scopeViolations,collection_duration_ms:quality.collectionDurationMs,run_status:quality.runStatus,adapter_version:VEHICLE_MARKET_ADAPTER_VERSION,parser_version:VEHICLE_MARKET_PARSER_VERSION,schema_version:VEHICLE_MARKET_SCHEMA_VERSION,model_version:VEHICLE_MARKET_MODEL_VERSION,raw_manifest_sha256:sha256Hex(canonicalJson(run.rawPages))}];
  const dimListing=rowValues(analytical.listings).map(value=>({load_id:loadId,listing_key:value.listingKey,source:value.source,source_listing_id:value.sourceListingId,source_ref_id:value.sourceRefId,canonical_url:value.canonicalUrl,source_created_at:timestamp(value.sourceCreatedAt as string|null),first_observed_at:analytical.run.observedAt}));
  const dimVehicleSpec=rowValues(analytical.vehicleSpecs).map(value=>({load_id:loadId,vehicle_spec_key:value.vehicleSpecKey,manufacturer_year:value.manufacturerYear,make:value.make,model:value.model,series:value.series,variant:value.variant,vehicle_class:value.vehicleClass,body_type:value.bodyType,body_type_group:value.bodyTypeGroup,segment:value.segment,transmission:value.transmission,drive_type:value.driveType,fuel_type:value.fuelType,engine_size_l:value.engineSizeL,cylinders:value.cylinders,power_kw:value.powerKw,seats:value.seats,doors:value.doors,safety_rating:value.safetyRating}));
  const dimSellerVersion=rowValues(analytical.sellerVersions).map(value=>({load_id:loadId,seller_version_key:value.sellerVersionKey,source_dealer_id:value.sourceDealerId,seller_type:value.sellerType,seller_name:value.sellerName,seller_city:value.sellerCity,seller_state:value.sellerState,seller_subscription:value.sellerSubscription,is_dealer:value.isDealer,is_private:value.isPrivate}));
  const dimLocation=rowValues(analytical.locations).map(value=>({load_id:loadId,location_key:value.locationKey,suburb:value.suburb,location_state:value.locationState,latitude:value.latitude,longitude:value.longitude}));
  const dimListingContent=rowValues(analytical.contents).map(value=>({load_id:loadId,content_key:value.contentKey,description:value.description,feature_set_key:value.featureSetKey,normalized_feature_terms:value.normalizedFeatureTerms,photo_count:value.photoCount,has_video:value.hasVideo}));
  const factListingObservation=rowValues(analytical.facts).map(value=>{
    const raw=lineage.get(value.sourceRecordHash);if(!raw)throw new Error(`Raw lineage is unavailable for ${value.listingKey}`);
    return {load_id:loadId,run_key:value.runKey,listing_key:value.listingKey,vehicle_spec_key:value.vehicleSpecKey,seller_version_key:value.sellerVersionKey,location_key:value.locationKey,content_key:value.contentKey,observed_at:value.observedAt,source_updated_at:timestamp(value.sourceUpdatedAt),source_status:value.sourceStatus,advertised_price:value.advertisedPrice,driveaway_price:value.driveawayPrice,odometer_km:value.odometerKm,rego_expiry:dateOnly(value.regoExpiry),colour:value.colour,is_registered:value.isRegistered,is_top_ad:value.isTopAd,is_auction:value.isAuction,source_prior_advertised_price:value.sourcePriorAdvertisedPrice,source_prior_price_ended_at:timestamp(value.sourcePriorPriceEndedAt),source_record_hash:value.sourceRecordHash,raw_payload_sha256:raw.rawPayloadSha256,raw_object_reference:raw.rawObjectReference,raw_page_number:raw.rawPageNumber};
  });
  if(factListingObservation.length!==quality.uniqueListingIds)throw new Error("Analytical fact count does not reconcile to unique listing IDs");
  return {loadId,runKey:analytical.run.runKey,rawManifestSha256:dimObservationRun[0].raw_manifest_sha256 as string,rows:{dimObservationRun,dimListing,dimVehicleSpec,dimSellerVersion,dimLocation,dimListingContent,factListingObservation}};
}

function motherduckDatabase(){const value=process.env.WA_VEHICLE_MARKET_MOTHERDUCK_DATABASE??"wa_vehicle_market";if(value!=="wa_vehicle_market")throw new Error("WA_VEHICLE_MARKET_MOTHERDUCK_DATABASE must be wa_vehicle_market");return value;}
function connection(database:string){const token=process.env.MOTHERDUCK_TOKEN;if(!token)throw new Error("MOTHERDUCK_TOKEN is required");return postgres({host:process.env.MOTHERDUCK_PG_HOST||"pg.us-east-1-aws.motherduck.com",port:5432,database,username:"ducky",password:token,ssl:"require",max:2,prepare:false});}
type StageTable="stage.dim_observation_run"|"stage.dim_listing"|"stage.dim_vehicle_spec"|"stage.dim_seller_version"|"stage.dim_location"|"stage.dim_listing_content"|"stage.fact_listing_observation";
async function insertChunks(tx:TransactionSql,table:StageTable,rows:Record<string,unknown>[],size=1000){
  for(let index=0;index<rows.length;index+=size){
    const chunk=rows.slice(index,index+size);
    if(table==="stage.dim_observation_run")await tx`INSERT INTO stage.dim_observation_run ${tx(chunk)}`;
    else if(table==="stage.dim_listing")await tx`INSERT INTO stage.dim_listing ${tx(chunk)}`;
    else if(table==="stage.dim_vehicle_spec")await tx`INSERT INTO stage.dim_vehicle_spec ${tx(chunk)}`;
    else if(table==="stage.dim_seller_version")await tx`INSERT INTO stage.dim_seller_version ${tx(chunk)}`;
    else if(table==="stage.dim_location")await tx`INSERT INTO stage.dim_location ${tx(chunk)}`;
    else if(table==="stage.dim_listing_content")await tx`INSERT INTO stage.dim_listing_content ${tx(chunk)}`;
    else await tx`INSERT INTO stage.fact_listing_observation ${tx(chunk)}`;
  }
}

export async function initializeVehicleMarketDuckLake(){
  const name=motherduckDatabase(),catalog=connection("md:");
  try{await catalog.unsafe(`CREATE DATABASE IF NOT EXISTS ${name} (TYPE DUCKLAKE)`);}finally{await catalog.end();}
  const target=connection(`md:${name}`);
  try{
    await target.unsafe(await readFile(path.resolve("db/ducklake/wa_vehicle_market.sql"),"utf8"));
    await target.unsafe("CREATE SHARE IF NOT EXISTS wa_vehicle_market_app FROM wa_vehicle_market (ACCESS RESTRICTED, VISIBILITY DISCOVERABLE, UPDATE AUTOMATIC)");
    await target.unsafe("GRANT READ ON SHARE wa_vehicle_market_app TO ROLE explorer");
  }finally{await target.end();}
  return {database:name,share:"wa_vehicle_market_app",initialized:true};
}

export async function publishVehicleMarketRun(run:ProcessedVehicleMarketRun,store:RawObjectStore):Promise<PublishedVehicleMarketRun>{
  const batch=await buildVehicleMarketStageBatch(run,store),target=connection(`md:${motherduckDatabase()}`),tables:[StageTable,Record<string,unknown>[]][]=[
    ["stage.dim_observation_run",batch.rows.dimObservationRun],["stage.dim_listing",batch.rows.dimListing],["stage.dim_vehicle_spec",batch.rows.dimVehicleSpec],["stage.dim_seller_version",batch.rows.dimSellerVersion],["stage.dim_location",batch.rows.dimLocation],["stage.dim_listing_content",batch.rows.dimListingContent],["stage.fact_listing_observation",batch.rows.factListingObservation],
  ];
  try{
    await target.begin(async tx=>{for(const [table,rows] of tables){await tx.unsafe(`DELETE FROM ${table} WHERE load_id=CAST('${batch.loadId}' AS UUID)`);await insertChunks(tx,table,rows);}});
    const promotion=(await readFile(path.resolve("db/ducklake/load_vehicle_market_run.sql"),"utf8")).replaceAll("__LOAD_ID__",batch.loadId);await target.unsafe(promotion);
    const [counts]=await target<{facts:number;runs:number}[]>`SELECT (SELECT count(*) FROM core.fact_listing_observation WHERE run_key=${batch.runKey})::BIGINT AS facts,(SELECT count(*) FROM core.dim_observation_run WHERE run_key=${batch.runKey})::BIGINT AS runs`;
    if(Number(counts?.facts)!==run.quality.uniqueListingIds||Number(counts?.runs)!==1)throw new Error("Published DuckLake rows do not reconcile to the COMPLETE run");
    return {runId:run.runId,runKey:batch.runKey,runStatus:"COMPLETE",sourceRows:run.quality.uniqueListingIds,factRows:Number(counts.facts),dimensionCounts:{listings:batch.rows.dimListing.length,vehicleSpecs:batch.rows.dimVehicleSpec.length,sellerVersions:batch.rows.dimSellerVersion.length,locations:batch.rows.dimLocation.length,contents:batch.rows.dimListingContent.length},rawManifestSha256:batch.rawManifestSha256};
  }finally{await target.end();}
}
