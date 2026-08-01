import {describe,expect,it} from "vitest";
import {STARTER_DIVES} from "./dive-provisioning";
import {
  DATASETS,
  VIC_HOUSING_DATASET,
  datasetByKey,
  datasetContextForWorkspaceDive,
  datasetContractPrompt,
  datasetForStarterKey,
  resolveDatasetRuntime,
  validateDatasetRegistry,
} from "./datasets";

describe("dataset registry",()=>{
  it("registers every current starter exactly once under VIC Housing",()=>{
    expect(DATASETS.map(dataset=>dataset.key)).toEqual(["vic-housing"]);
    expect(VIC_HOUSING_DATASET.starterKeys).toEqual(STARTER_DIVES.map(starter=>starter.key));
    for(const starter of STARTER_DIVES)expect(datasetForStarterKey(starter.key)?.key).toBe("vic-housing");
    expect(datasetByKey("vic-housing")).toBe(VIC_HOUSING_DATASET);
  });

  it("resolves an owned Dive to its dataset and approved runtime configuration",()=>{
    const context=datasetContextForWorkspaceDive(
      {"market-pulse":"owned-dive"},
      "owned-dive",
      {MOTHERDUCK_DATABASE:"vic_house_data",MOTHERDUCK_SHARED_SERVICE_ACCOUNT_USERNAME:"vic_house_lab"},
    );
    expect(context).toMatchObject({
      starterKey:"market-pulse",
      dataset:{key:"vic-housing",contractVersion:"vic-housing/v1"},
      runtime:{motherduckDatabase:"vic_house_data",serviceAccountUsername:"vic_house_lab"},
    });
    expect(datasetContextForWorkspaceDive({"market-pulse":"owned-dive"},"another-dive",{})).toBeNull();
    expect(datasetContextForWorkspaceDive({"unknown-starter":"owned-dive"},"owned-dive",{})).toBeNull();
  });

  it("fails closed for an unsafe database selector",()=>{
    expect(()=>resolveDatasetRuntime(VIC_HOUSING_DATASET,{MOTHERDUCK_DATABASE:"vic_house_data; DROP TABLE x"})).toThrow("Invalid MotherDuck database");
  });

  it("rejects ambiguous dataset and starter registrations",()=>{
    expect(()=>validateDatasetRegistry([VIC_HOUSING_DATASET,{...VIC_HOUSING_DATASET}])).toThrow("Duplicate dataset key");
    expect(()=>validateDatasetRegistry([VIC_HOUSING_DATASET,{...VIC_HOUSING_DATASET,key:"wa-housing"}])).toThrow("Duplicate starter key");
  });

  it("serializes the registered contract without runtime configuration",()=>{
    const prompt=datasetContractPrompt(VIC_HOUSING_DATASET);
    expect(prompt).toContain("suburb_sale_facts");
    expect(prompt).toContain("Unpriced sales remain in volume");
    expect(prompt).not.toMatch(/token|password|motherduck_share_url|serviceAccount/i);
  });
});
