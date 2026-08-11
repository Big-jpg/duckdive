import {sourceScopeFingerprint} from "./autotrader-adapter";
import {valueHash,type CanonicalListingObservationV1,type ProcessedVehicleMarketRun} from "./contracts";

export type VehicleMarketFactRow={
  runKey:string;listingKey:string;vehicleSpecKey:string;sellerVersionKey:string;locationKey:string;contentKey:string;
  observedAt:string;advertisedPrice:number|null;driveawayPrice:number|null;odometerKm:number|null;sourceStatus:string|null;
  sourceUpdatedAt:string|null;sourcePriorAdvertisedPrice:number|null;sourcePriorPriceEndedAt:string|null;sourceRecordHash:string;
};

export type VehicleMarketAnalyticalBatch={
  run:{runKey:string;runId:string;observationDate:string;observedAt:string;scopeFingerprint:string;runStatus:ProcessedVehicleMarketRun["quality"]["runStatus"]};
  listings:Map<string,Record<string,unknown>>;
  vehicleSpecs:Map<string,Record<string,unknown>>;
  sellerVersions:Map<string,Record<string,unknown>>;
  locations:Map<string,Record<string,unknown>>;
  contents:Map<string,Record<string,unknown>>;
  facts:Map<string,VehicleMarketFactRow>;
};

function mapByHash(rows:CanonicalListingObservationV1[],hash:(row:CanonicalListingObservationV1)=>string,value:(row:CanonicalListingObservationV1)=>Record<string,unknown>){const result=new Map<string,Record<string,unknown>>();for(const row of rows)result.set(hash(row),value(row));return result;}

export function buildVehicleMarketAnalyticalBatch(run:ProcessedVehicleMarketRun):VehicleMarketAnalyticalBatch{
  const scopeFingerprint=sourceScopeFingerprint(run.scope),runKey=valueHash({source:"autotrader",runId:run.runId,scopeFingerprint}),observedAt=`${run.observationDate}T00:00:00.000Z`;
  const accepted=run.observations.filter((row):row is CanonicalListingObservationV1&{listingKey:string;sourceListingId:string}=>Boolean(row.listingKey&&row.sourceListingId));
  const listings=new Map<string,Record<string,unknown>>();
  for(const row of accepted)listings.set(row.listingKey,{listingKey:row.listingKey,source:row.source,sourceListingId:row.sourceListingId,sourceRefId:row.sourceRefId,canonicalUrl:row.canonicalUrl,sourceCreatedAt:row.sourceCreatedAt});
  const vehicleSpecs=mapByHash(accepted,row=>row.vehicleSpecHash,row=>({vehicleSpecKey:row.vehicleSpecHash,manufacturerYear:row.manufacturerYear,make:row.make,model:row.model,series:row.series,variant:row.variant,vehicleClass:row.vehicleClass,bodyType:row.bodyType,bodyTypeGroup:row.bodyTypeGroup,segment:row.segment,transmission:row.transmission,driveType:row.driveType,fuelType:row.fuelType,engineSizeL:row.engineSizeL,cylinders:row.cylinders,powerKw:row.powerKw,seats:row.seats,doors:row.doors,safetyRating:row.safetyRating}));
  const sellerVersions=mapByHash(accepted,row=>row.sellerVersionHash,row=>({sellerVersionKey:row.sellerVersionHash,sourceDealerId:row.sourceDealerId,sellerType:row.sellerType,sellerName:row.sellerName,sellerCity:row.sellerCity,sellerState:row.sellerState,sellerSubscription:row.sellerSubscription,isDealer:row.isDealer,isPrivate:row.isPrivate}));
  const locations=mapByHash(accepted,row=>row.locationHash,row=>({locationKey:row.locationHash,suburb:row.suburb,locationState:row.locationState,latitude:row.latitude,longitude:row.longitude}));
  const contents=mapByHash(accepted,row=>row.contentHash,row=>({contentKey:row.contentHash,description:row.description,featureSetKey:row.featureSetHash,normalizedFeatureTerms:row.featureTerms,photoCount:row.photoCount,hasVideo:row.hasVideo}));
  const facts=new Map<string,VehicleMarketFactRow>();
  for(const row of accepted)facts.set(`${runKey}:${row.listingKey}`,{runKey,listingKey:row.listingKey,vehicleSpecKey:row.vehicleSpecHash,sellerVersionKey:row.sellerVersionHash,locationKey:row.locationHash,contentKey:row.contentHash,observedAt,advertisedPrice:row.advertisedPrice,driveawayPrice:row.driveawayPrice,odometerKm:row.odometerKm,sourceStatus:row.sourceStatus,sourceUpdatedAt:row.sourceUpdatedAt,sourcePriorAdvertisedPrice:row.sourcePriorAdvertisedPrice,sourcePriorPriceEndedAt:row.sourcePriorPriceEndedAt,sourceRecordHash:row.sourceRecordHash});
  return {run:{runKey,runId:run.runId,observationDate:run.observationDate,observedAt,scopeFingerprint,runStatus:run.quality.runStatus},listings,vehicleSpecs,sellerVersions,locations,contents,facts};
}

export type VehicleMarketAnalyticalState={runs:Map<string,VehicleMarketAnalyticalBatch["run"]>;listings:Map<string,Record<string,unknown>>;vehicleSpecs:Map<string,Record<string,unknown>>;sellerVersions:Map<string,Record<string,unknown>>;locations:Map<string,Record<string,unknown>>;contents:Map<string,Record<string,unknown>>;facts:Map<string,VehicleMarketFactRow>};
export function emptyVehicleMarketAnalyticalState():VehicleMarketAnalyticalState{return {runs:new Map(),listings:new Map(),vehicleSpecs:new Map(),sellerVersions:new Map(),locations:new Map(),contents:new Map(),facts:new Map()};}
function mergeMap<T>(target:Map<string,T>,source:Map<string,T>,label:string){for(const [key,value] of source){const existing=target.get(key);if(existing&&JSON.stringify(existing)!==JSON.stringify(value))throw new Error(`Conflicting ${label} lineage for ${key}`);if(!existing)target.set(key,value);}}
export function mergeVehicleMarketAnalyticalBatch(state:VehicleMarketAnalyticalState,batch:VehicleMarketAnalyticalBatch){
  const existing=state.runs.get(batch.run.runKey);if(existing&&JSON.stringify(existing)!==JSON.stringify(batch.run))throw new Error(`Conflicting run lineage for ${batch.run.runId}`);if(!existing)state.runs.set(batch.run.runKey,batch.run);
  mergeMap(state.listings,batch.listings,"listing");mergeMap(state.vehicleSpecs,batch.vehicleSpecs,"vehicle specification");mergeMap(state.sellerVersions,batch.sellerVersions,"seller version");mergeMap(state.locations,batch.locations,"location");mergeMap(state.contents,batch.contents,"content");mergeMap(state.facts,batch.facts,"observation fact");return state;
}

export type VehicleMarketDerivedEvent={runKey:string;listingKey:string;eventType:"NEWLY_OBSERVED"|"NO_LONGER_OBSERVED"|"PRICE_CHANGED"|"ODOMETER_CHANGED"|"CONTENT_CHANGED"|"SELLER_CHANGED"|"SPECIFICATION_CHANGED";priorValue?:number|null;currentValue?:number|null};
export function deriveVehicleMarketEvents(orderedBatches:VehicleMarketAnalyticalBatch[]){
  const events:VehicleMarketDerivedEvent[]=[];
  for(let index=1;index<orderedBatches.length;index++){
    const prior=orderedBatches[index-1],current=orderedBatches[index];
    if(prior.run.runStatus!=="COMPLETE"||current.run.runStatus!=="COMPLETE"||prior.run.scopeFingerprint!==current.run.scopeFingerprint)continue;
    const priorByListing=new Map([...prior.facts.values()].map(fact=>[fact.listingKey,fact])),currentByListing=new Map([...current.facts.values()].map(fact=>[fact.listingKey,fact]));
    for(const [listingKey,fact] of currentByListing){const before=priorByListing.get(listingKey);if(!before){events.push({runKey:current.run.runKey,listingKey,eventType:"NEWLY_OBSERVED"});continue;}if(before.advertisedPrice!==fact.advertisedPrice)events.push({runKey:current.run.runKey,listingKey,eventType:"PRICE_CHANGED",priorValue:before.advertisedPrice,currentValue:fact.advertisedPrice});if(before.odometerKm!==fact.odometerKm)events.push({runKey:current.run.runKey,listingKey,eventType:"ODOMETER_CHANGED",priorValue:before.odometerKm,currentValue:fact.odometerKm});if(before.contentKey!==fact.contentKey)events.push({runKey:current.run.runKey,listingKey,eventType:"CONTENT_CHANGED"});if(before.sellerVersionKey!==fact.sellerVersionKey)events.push({runKey:current.run.runKey,listingKey,eventType:"SELLER_CHANGED"});if(before.vehicleSpecKey!==fact.vehicleSpecKey)events.push({runKey:current.run.runKey,listingKey,eventType:"SPECIFICATION_CHANGED"});}
    for(const listingKey of priorByListing.keys())if(!currentByListing.has(listingKey))events.push({runKey:current.run.runKey,listingKey,eventType:"NO_LONGER_OBSERVED"});
  }
  return events;
}
