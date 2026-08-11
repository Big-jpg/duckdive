import {readFile} from "node:fs/promises";
import path from "node:path";
import {describe,expect,it} from "vitest";
import {AutotraderVehicleMarketAdapter,buildAutotraderUrl} from "./autotrader-adapter";
import {canonicalVehicleMarketScope,vehicleMarketScopeV1Schema} from "./contracts";

const fixture=path.resolve("fixtures/vehicle-market/autotrader/wa-used-page-1.json");

describe("Autotrader vehicle-market adapter",()=>{
  it("constructs only the canonical acquisition query and fixes the page size",()=>{
    const url=new URL(buildAutotraderUrl(canonicalVehicleMarketScope(),295));
    expect(url.origin+url.pathname).toBe("https://listings.platform.autotrader.com.au/api/v3/search");
    expect(Object.fromEntries(url.searchParams)).toEqual({state:"wa",condition:"Used",sortBy:"listing_created",orderBy:"asc",paginate:"50",page:"295"});
  });

  it("forwards only empirically supported bounded filters and validates returned rows",()=>{
    const scope=vehicleMarketScopeV1Schema.parse({...canonicalVehicleMarketScope(),fuelType:"Diesel",transmissionType:"Automatic",driveType:"All Wheel Drive",bodyTypeGroup:"SUV",make:"Subaru",model:"Outback",yearFrom:2018,yearTo:2022,priceTo:25000});
    const url=new URL(buildAutotraderUrl(scope,1));
    expect(url.searchParams.get("fuel_type")).toBe("Diesel");
    expect(url.searchParams.get("transmission_type")).toBe("Automatic");
    expect(url.searchParams.has("kmsTo")).toBe(false);
    const listing=new AutotraderVehicleMarketAdapter().normalizeListing({id:1,condition:"Used",location_state:"WA",make:"Subaru",model:"Outback",manu_year:2020,price:24000,vehicle:{fuel_type:"Hybrid",transmission_type:"Automatic",drive_type:"All Wheel Drive",body_type_group:"SUV"}});
    expect(new AutotraderVehicleMarketAdapter().validateListing(listing,scope)).toMatchObject({valid:false,issues:["fuel-type-filter-violation"]});
  });

  it("unwraps wrapped and unwrapped records into source-neutral observations",async()=>{
    const page=new AutotraderVehicleMarketAdapter().parsePage(await readFile(fixture));
    expect(page.metadata).toEqual({currentPage:1,lastPage:1,perPage:50,total:2,returned:2});
    expect(page.observations.map(row=>row.listingKey)).toEqual(["autotrader:14329861","autotrader:15260143"]);
    expect(page.observations[0]).toMatchObject({locationState:"WA",condition:"Used",advertisedPrice:9999,featureTerms:["ABS","Cruise Control"]});
    expect(page.observations[1]).toMatchObject({advertisedPrice:29990,driveawayPrice:31500,sourcePriorAdvertisedPrice:31990});
  });

  it("keeps listing identity stable while mutable content hashes change",()=>{
    const adapter=new AutotraderVehicleMarketAdapter(),base={id:42,condition:"Used",location_state:"WA",created_at:"2026-08-11 00:00:00",price:10000,description:"First"};
    const first=adapter.normalizeListing(base),changed=adapter.normalizeListing({...base,price:12000,description:"Changed"});
    expect(changed.listingKey).toBe(first.listingKey);
    expect(changed.sourceRecordHash).not.toBe(first.sourceRecordHash);
    expect(changed.contentHash).not.toBe(first.contentHash);
  });

  it("normalizes feature sets deterministically without producing a feature bridge",()=>{
    const adapter=new AutotraderVehicleMarketAdapter();
    const a=adapter.normalizeListing({id:1,featureSearchTerms:["ABS","Cruise Control","ABS"]});
    const b=adapter.normalizeListing({id:1,featureSearchTerms:["Cruise Control","ABS"]});
    expect(a.featureTerms).toEqual(["ABS","Cruise Control"]);
    expect(a.featureSetHash).toBe(b.featureSetHash);
    expect(a).not.toHaveProperty("features");
  });

  it("rejects mileage and unknown scope fields before a request can be built",()=>{
    expect(()=>vehicleMarketScopeV1Schema.parse({...canonicalVehicleMarketScope(),kmsFrom:50000})).toThrow();
    expect(()=>vehicleMarketScopeV1Schema.parse({...canonicalVehicleMarketScope(),vehicleClass:"Car"})).toThrow();
  });
});
