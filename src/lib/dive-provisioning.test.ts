import {describe,expect,it} from "vitest";
import {readFile} from "node:fs/promises";
import path from "node:path";
import {renderDiveSource} from "./dive-provisioning";

describe("Dive source rendering",()=>{
  it("injects only the approved share and analytics policy",()=>{
    const rendered=renderDiveSource("__MOTHERDUCK_SHARE_URL__ __PRICE_MIN__ __PRICE_MAX__ __LAND_MIN__ __LAND_MAX__","md:_share/vic/test");
    expect(rendered).toBe("md:_share/vic/test 50000 20000000 50 10000");
  });

  it("uses sandbox-safe time aliases in starter queries",async()=>{
    const files=["market-pulse.tsx","suburb-story.tsx"];
    const sources=await Promise.all(files.map(file=>readFile(path.join(process.cwd(),"src","dives",file),"utf8")));
    expect(sources.join("\n")).not.toMatch(/\)\s+(?:month|year)\s*,/i);
    expect(sources[0]).toContain("AS sale_month");
    expect(sources[1]).toContain("AS sale_year");
  });
});
