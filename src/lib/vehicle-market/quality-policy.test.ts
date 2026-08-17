import {describe,expect,it} from "vitest";
import type {ProcessedVehicleMarketRun} from "./contracts";
import {isVehicleMarketPopulationComparable,isVehicleMarketSnapshotComparable} from "./quality-policy";

function quality(overrides:Partial<ProcessedVehicleMarketRun["quality"]>={}):ProcessedVehicleMarketRun["quality"]{
  return {schemaVersion:"vehicle-market-run-quality/v1",runId:"11111111-1111-4111-8111-111111111111",sourceTotal:2,sourceTotalStart:2,sourceTotalEnd:2,rawHits:2,uniqueListingIds:2,duplicateHits:0,scopeViolations:0,pagesExpected:1,pagesFetched:1,runStatus:"COMPLETE",collectionDurationMs:1,vehicleClassProfile:{Car:2},missingVehicleClass:0,warnings:[],errors:[],...overrides};
}

describe("vehicle-market temporal quality policy",()=>{
  it("distinguishes snapshot comparison from exact population comparison",()=>{
    expect(isVehicleMarketSnapshotComparable(quality())).toBe(true);
    expect(isVehicleMarketPopulationComparable(quality())).toBe(true);
    const changed=quality({runStatus:"CHANGED_DURING_CAPTURE",sourceTotalEnd:3});
    expect(isVehicleMarketSnapshotComparable(changed)).toBe(true);
    expect(isVehicleMarketPopulationComparable(changed)).toBe(false);
    const bounded=quality({runStatus:"INVALID",sourceTotalStart:14746,sourceTotalEnd:14741,sourceTotal:14746,rawHits:14741,uniqueListingIds:14737,duplicateHits:4,errors:["Source creation ordering decreased during capture"]});
    expect(isVehicleMarketSnapshotComparable(bounded)).toBe(true);
    expect(isVehicleMarketPopulationComparable(bounded)).toBe(false);
  });

  it("fails closed for partial, scoped, unreconciled, excessive, or differently invalid evidence",()=>{
    expect(isVehicleMarketSnapshotComparable(quality({pagesFetched:0}))).toBe(false);
    expect(isVehicleMarketSnapshotComparable(quality({scopeViolations:1}))).toBe(false);
    expect(isVehicleMarketSnapshotComparable(quality({rawHits:3}))).toBe(false);
    expect(isVehicleMarketSnapshotComparable(quality({runStatus:"INVALID",rawHits:13,uniqueListingIds:2,duplicateHits:11,errors:["Source creation ordering decreased during capture"]}))).toBe(false);
    expect(isVehicleMarketSnapshotComparable(quality({runStatus:"INVALID",rawHits:3,uniqueListingIds:2,duplicateHits:1,errors:["Schema mismatch"]}))).toBe(false);
  });
});
