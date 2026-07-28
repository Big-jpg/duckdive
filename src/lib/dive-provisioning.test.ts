import {describe,expect,it} from "vitest";
import {renderDiveSource} from "./dive-provisioning";

describe("Dive source rendering",()=>{
  it("injects only the approved share and analytics policy",()=>{
    const rendered=renderDiveSource("__MOTHERDUCK_SHARE_URL__ __PRICE_MIN__ __PRICE_MAX__ __LAND_MIN__ __LAND_MAX__","md:_share/vic/test");
    expect(rendered).toBe("md:_share/vic/test 50000 20000000 50 10000");
  });
});
