import {describe,expect,it} from "vitest";
import {duckDiveContract,duckDiveContractPrompt,duckDivePublicContract} from "./duckdive-contract";

describe("DuckDive semantic contract",()=>{
  it("serializes the governed estate without credentials",()=>{
    const serialized=duckDiveContractPrompt();
    expect(JSON.parse(serialized)).toEqual(duckDiveContract);
    expect(serialized).toContain("suburb_sale_facts");
    expect(serialized).toContain("Unpriced sales remain in volume");
    expect(serialized).not.toMatch(/token|password|motherduck_share_url/i);
  });

  it("exposes semantic meaning without physical columns in the public drawer",()=>{
    expect(duckDivePublicContract.measures.price).toContain("20,000,000");
    expect(duckDivePublicContract.grains).toHaveLength(3);
    expect(duckDivePublicContract).not.toHaveProperty("tables.0.columns");
  });
});
