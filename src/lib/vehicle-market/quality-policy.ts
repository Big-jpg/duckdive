import type {ProcessedVehicleMarketRun} from "./contracts";

export const VEHICLE_MARKET_BOUNDED_DUPLICATE_MAX_HITS=10;
export const VEHICLE_MARKET_BOUNDED_DUPLICATE_MAX_RATE=0.001;

type RunQuality=ProcessedVehicleMarketRun["quality"];

function reconcilesObservedHits(quality:RunQuality){
  return quality.rawHits===quality.uniqueListingIds+quality.duplicateHits;
}

export function hasBoundedVehicleMarketDuplicateDrift(quality:RunQuality){
  return quality.duplicateHits>0
    &&quality.duplicateHits<=VEHICLE_MARKET_BOUNDED_DUPLICATE_MAX_HITS
    &&quality.duplicateHits/quality.rawHits<=VEHICLE_MARKET_BOUNDED_DUPLICATE_MAX_RATE;
}

export function isVehicleMarketSnapshotComparable(quality:RunQuality){
  const fullyEnumerated=quality.pagesExpected>0
    &&quality.pagesFetched===quality.pagesExpected
    &&quality.uniqueListingIds>0
    &&quality.scopeViolations===0
    &&reconcilesObservedHits(quality);
  if(!fullyEnumerated)return false;
  if(quality.duplicateHits===0)return quality.runStatus==="COMPLETE"||quality.runStatus==="CHANGED_DURING_CAPTURE";
  return quality.runStatus==="INVALID"
    &&hasBoundedVehicleMarketDuplicateDrift(quality)
    &&quality.errors.length>0
    &&quality.errors.every(error=>error==="Source creation ordering decreased during capture");
}

export function isVehicleMarketPopulationComparable(quality:RunQuality){
  return quality.runStatus==="COMPLETE"
    &&isVehicleMarketSnapshotComparable(quality)
    &&quality.duplicateHits===0
    &&quality.sourceTotalStart===quality.sourceTotalEnd
    &&quality.rawHits===quality.sourceTotalStart
    &&quality.uniqueListingIds===quality.sourceTotalStart;
}
