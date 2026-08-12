import {describe,expect,it} from "vitest";
import type {DatasetDefinition} from "./dataset-types";
import {
  DATASETS,VIC_HOUSING_DATASET,WA_VEHICLE_MARKET_DATASET,datasetByKey,datasetContextForWorkspaceDive,datasetContextForWorkspaceDiveRecord,datasetContractPrompt,datasetForStarterKey,datasetWorkspaceManifest,defaultDataset,resolveDatasetRuntime,validateDatasetRegistry,
} from "./datasets";
import {renderDiveSource} from "./dive-provisioning";

const env={MOTHERDUCK_DATABASE:"vic_house_data",MOTHERDUCK_SHARE_URL:"md:_share/vic/test",MOTHERDUCK_SHARED_SERVICE_ACCOUNT_USERNAME:"vic_house_lab",WA_VEHICLE_MARKET_MOTHERDUCK_DATABASE:"wa_vehicle_market",WA_VEHICLE_MARKET_SHARE_URL:"md:_share/wa/vehicles",WA_VEHICLE_MARKET_SERVICE_ACCOUNT_USERNAME:"wa_vehicle_lab"};
const nonHousingDataset:DatasetDefinition={
  ...VIC_HOUSING_DATASET,
  key:"service-operations",
  default:true,
  title:"Service Operations",
  description:"Reviewed service events.",
  contractVersion:"service-operations/v1",
  contract:{tables:["service_events"]},
  publicContract:{scope:"Reviewed service events",grains:[{name:"service_events",grain:"One row per service event"}],measures:{incidents:"Count of incidents"},dimensions:["service","event date"],caveats:["Descriptive operations history only."]},
  presentation:{badge:"Included dataset",summary:"Explore service operations.",boundary:"Historical service events, not a reliability forecast."},
  starters:[{key:"service-health",title:"Service Health",label:"Operations pulse",description:"Incident activity by service.",outcome:"See where incident activity is changing.",entryPrompt:"Start with service health",questions:["Which services changed most?"],file:"service-health.tsx",accent:"teal"}],
  reportPolicy:{capabilities:[{id:"incident-volume",label:"Compare incident activity",examples:["Which service had more incidents?"]}],limitations:[{id:"no-forecast",label:"Reliability forecasts",reason:"The contract is descriptive."}],assumptions:[{id:"reviewed-events",label:"Only reviewed events are included",source:"data-contract",material:true}],scopeItems:[{id:"event-kind",label:"Event kind",values:["Incidents"]}],dateRange:{start:"2025-01-01",end:"2025-12-31",basis:"calendar-year"}},
  sourceTemplateValues:runtime=>({"__MOTHERDUCK_SHARE_URL__":runtime.motherduckShareUrl}),
};

describe("dataset registry",()=>{
  it("registers exactly one default included dataset and every current starter once",()=>{
    expect(DATASETS.map(dataset=>dataset.key)).toEqual(["wa-vehicle-market"]);
    expect(defaultDataset()).toBe(WA_VEHICLE_MARKET_DATASET);
    expect(WA_VEHICLE_MARKET_DATASET.starters.map(starter=>starter.key)).toEqual(["vehicle-market-atlas","vehicle-lens","data-observatory"]);
    for(const starter of WA_VEHICLE_MARKET_DATASET.starters)expect(datasetForStarterKey(starter.key)?.key).toBe("wa-vehicle-market");
    expect(datasetByKey("vic-housing")).toBeNull();
  });

  it("resolves an owned Dive to its dataset and approved runtime configuration",()=>{
    const context=datasetContextForWorkspaceDive({"vehicle-market-atlas":"owned-dive"},"owned-dive",env);
    expect(context).toMatchObject({starterKey:"vehicle-market-atlas",dataset:{key:"wa-vehicle-market",contractVersion:"wa-vehicle-market/v1"},runtime:{motherduckDatabase:"wa_vehicle_market",motherduckShareUrl:"md:_share/wa/vehicles",serviceAccountUsername:"wa_vehicle_lab"}});
    expect(datasetContextForWorkspaceDive({"vehicle-market-atlas":"owned-dive"},"another-dive",env)).toBeNull();
    expect(datasetContextForWorkspaceDive({"unknown-starter":"owned-dive"},"owned-dive",env)).toBeNull();
  });

  it("fails closed for unsafe or missing runtime selectors",()=>{
    expect(()=>resolveDatasetRuntime(VIC_HOUSING_DATASET,{...env,MOTHERDUCK_DATABASE:"vic_house_data; DROP TABLE x"})).toThrow("Invalid MotherDuck database");
    expect(()=>resolveDatasetRuntime(VIC_HOUSING_DATASET,{...env,MOTHERDUCK_SHARE_URL:"https://example.com/share"})).toThrow("Missing or invalid MotherDuck share");
    expect(()=>resolveDatasetRuntime(VIC_HOUSING_DATASET,{...env,MOTHERDUCK_SHARE_URL:"md:_share/vic/test\";DROP"})).toThrow("Missing or invalid MotherDuck share");
    expect(()=>resolveDatasetRuntime(VIC_HOUSING_DATASET,{...env,MOTHERDUCK_SHARED_SERVICE_ACCOUNT_USERNAME:"owner;DROP"})).toThrow("Missing or invalid MotherDuck service account");
  });

  it("resolves relational ownership and rejects a mismatched dataset/starter pair",()=>{
    expect(datasetContextForWorkspaceDiveRecord({dataset_key:"wa-vehicle-market",starter_key:"vehicle-market-atlas"},env)?.dataset.key).toBe("wa-vehicle-market");
    expect(datasetContextForWorkspaceDiveRecord({dataset_key:"unknown",starter_key:"vehicle-market-atlas"},env)).toBeNull();
    expect(datasetContextForWorkspaceDiveRecord({dataset_key:"wa-vehicle-market",starter_key:"unknown"},env)).toBeNull();
  });

  it("rejects ambiguous defaults, dataset keys and starter keys",()=>{
    expect(()=>validateDatasetRegistry([WA_VEHICLE_MARKET_DATASET,{...WA_VEHICLE_MARKET_DATASET}])).toThrow("Duplicate dataset key");
    expect(()=>validateDatasetRegistry([{...WA_VEHICLE_MARKET_DATASET,default:false}])).toThrow("exactly one default");
    expect(()=>validateDatasetRegistry([WA_VEHICLE_MARKET_DATASET,{...nonHousingDataset,default:true}])).toThrow("exactly one default");
    expect(()=>validateDatasetRegistry([WA_VEHICLE_MARKET_DATASET,{...nonHousingDataset,default:false,starters:[{...nonHousingDataset.starters[0],key:"vehicle-market-atlas"}]}])).toThrow("Duplicate starter key");
    expect(()=>validateDatasetRegistry([{...nonHousingDataset,motherduck:{...nonHousingDataset.motherduck,shareUrlEnv:"MOTHERDUCK_SHARE_URL;DROP"}}])).toThrow("unsafe runtime selector");
    expect(()=>validateDatasetRegistry([{...nonHousingDataset,starters:[{...nonHousingDataset.starters[0],file:"../vic.tsx"}]}])).toThrow("unsafe source file");
    expect(()=>validateDatasetRegistry([nonHousingDataset])).not.toThrow();
  });

  it("projects a credential-free manifest and lets a non-housing definition replace the UI copy",()=>{
    const manifest=datasetWorkspaceManifest(nonHousingDataset),serialized=JSON.stringify(manifest);
    expect(manifest).toMatchObject({key:"service-operations",title:"Service Operations",starters:[{key:"service-health",title:"Service Health"}]});
    expect(serialized).not.toMatch(/\.tsx|databaseEnv|shareUrl|serviceAccount|token|password/i);
    expect(serialized).not.toMatch(/\bVIC\b|housing|suburb/i);
    const runtime=resolveDatasetRuntime(nonHousingDataset,{MOTHERDUCK_DATABASE:"service_operations",MOTHERDUCK_SHARE_URL:"md:_share/service/operations",MOTHERDUCK_SHARED_SERVICE_ACCOUNT_USERNAME:"service_lab"});
    expect(renderDiveSource("export const source=\"__MOTHERDUCK_SHARE_URL__\";",nonHousingDataset,runtime)).toBe("export const source=\"md:_share/service/operations\";");
  });

  it("serializes the registered contract without runtime configuration",()=>{
    const prompt=datasetContractPrompt(WA_VEHICLE_MARKET_DATASET);
    expect(prompt).toContain("fact_listing_observation");expect(prompt).toContain("saleInference");expect(prompt).not.toMatch(/token|password|motherduck_share_url|serviceAccount/i);
    expect(prompt).toContain("latest publishable current observation");
    expect(prompt).toContain("Adjacent COMPLETE runs");
    expect(prompt).not.toContain("latest COMPLETE observation");
  });
});
