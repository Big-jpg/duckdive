import {describe,expect,it} from "vitest";
import {AutotraderVehicleMarketAdapter} from "./autotrader-adapter";
import {buildVehicleMarketAnalyticalBatch,deriveVehicleMarketEvents,emptyVehicleMarketAnalyticalState,mergeVehicleMarketAnalyticalBatch} from "./analytical-model";
import {canonicalVehicleMarketScope,type ProcessedVehicleMarketRun,type VehicleMarketRunStatus} from "./contracts";

const adapter=new AutotraderVehicleMarketAdapter();
function processed(runId:string,date:string,status:VehicleMarketRunStatus,records:Record<string,unknown>[]):ProcessedVehicleMarketRun{return {runId,observationDate:date,scope:canonicalVehicleMarketScope(),requestAttempts:[],rawPages:[],observations:records.map(record=>adapter.normalizeListing({condition:"Used",location_state:"WA",...record})),quality:{schemaVersion:"vehicle-market-run-quality/v1",runId,sourceTotal:records.length,sourceTotalStart:records.length,sourceTotalEnd:records.length,rawHits:records.length,uniqueListingIds:records.length,duplicateHits:0,scopeViolations:0,pagesExpected:1,pagesFetched:1,runStatus:status,collectionDurationMs:1,vehicleClassProfile:{},missingVehicleClass:0,warnings:[],errors:[]}};}

describe("vehicle-market analytical model",()=>{
  it("keeps descriptions and feature strings in content, not the observation fact",()=>{
    const batch=buildVehicleMarketAnalyticalBatch(processed("11111111-1111-4111-8111-111111111111","2026-08-11","COMPLETE",[{id:1,description:"Evidence",featureSearchTerms:["ABS"],price:10000}]));
    expect([...batch.contents.values()][0]).toMatchObject({description:"Evidence",normalizedFeatureTerms:["ABS"]});
    expect([...batch.facts.values()][0]).not.toHaveProperty("description");
    expect([...batch.facts.values()][0]).not.toHaveProperty("featureTerms");
  });

  it("is idempotent for identical evidence and fails closed on conflicting lineage",()=>{
    const state=emptyVehicleMarketAnalyticalState(),batch=buildVehicleMarketAnalyticalBatch(processed("11111111-1111-4111-8111-111111111111","2026-08-11","COMPLETE",[{id:1,price:10000}]));
    mergeVehicleMarketAnalyticalBatch(state,batch);mergeVehicleMarketAnalyticalBatch(state,batch);expect(state.facts.size).toBe(1);
    const fact=[...batch.facts.entries()][0],conflicting={...batch,facts:new Map([[fact[0],{...fact[1],advertisedPrice:12000}]])};
    expect(()=>mergeVehicleMarketAnalyticalBatch(state,conflicting)).toThrow("Conflicting observation fact lineage");
  });

  it("derives adjacent COMPLETE events without sale inference",()=>{
    const first=buildVehicleMarketAnalyticalBatch(processed("11111111-1111-4111-8111-111111111111","2026-08-11","COMPLETE",[{id:1,price:10000,odometer:50000,description:"A"},{id:2,price:20000}]));
    const second=buildVehicleMarketAnalyticalBatch(processed("22222222-2222-4222-8222-222222222222","2026-08-12","COMPLETE",[{id:1,price:9000,odometer:51000,description:"B"},{id:3,price:30000}]));
    expect(deriveVehicleMarketEvents([first])).toEqual([]);
    const events=deriveVehicleMarketEvents([first,second]);
    expect(events.map(event=>event.eventType)).toEqual(expect.arrayContaining(["PRICE_CHANGED","ODOMETER_CHANGED","CONTENT_CHANGED","NEWLY_OBSERVED","NO_LONGER_OBSERVED"]));
    expect(events.map(event=>event.eventType)).not.toContain("SOLD");
  });

  it("does not compare through an incomplete observation",()=>{
    const first=buildVehicleMarketAnalyticalBatch(processed("11111111-1111-4111-8111-111111111111","2026-08-11","COMPLETE",[{id:1,price:10000}])),partial=buildVehicleMarketAnalyticalBatch(processed("22222222-2222-4222-8222-222222222222","2026-08-12","PARTIAL",[])),later=buildVehicleMarketAnalyticalBatch(processed("33333333-3333-4333-8333-333333333333","2026-08-13","COMPLETE",[]));
    expect(deriveVehicleMarketEvents([first,partial,later])).toEqual([]);
  });

  it("derives intersection changes but withholds set differences for snapshot-only observations",()=>{
    const firstRun=processed("11111111-1111-4111-8111-111111111111","2026-08-11","CHANGED_DURING_CAPTURE",[{id:1,price:10000},{id:2,price:20000}]);
    firstRun.quality.sourceTotalEnd=3;
    const secondRun=processed("22222222-2222-4222-8222-222222222222","2026-08-17","INVALID",[{id:1,price:9000},{id:3,price:30000}]);
    secondRun.quality={...secondRun.quality,sourceTotal:14746,sourceTotalStart:14746,sourceTotalEnd:14741,rawHits:14741,uniqueListingIds:14737,duplicateHits:4,errors:["Source creation ordering decreased during capture"]};
    const events=deriveVehicleMarketEvents([buildVehicleMarketAnalyticalBatch(firstRun),buildVehicleMarketAnalyticalBatch(secondRun)]);
    expect(events).toEqual([expect.objectContaining({listingKey:"autotrader:1",eventType:"PRICE_CHANGED",priorValue:10000,currentValue:9000})]);
    expect(events.map(event=>event.eventType)).not.toEqual(expect.arrayContaining(["NEWLY_OBSERVED","NO_LONGER_OBSERVED"]));
  });
});
