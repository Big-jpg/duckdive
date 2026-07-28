import {describe,expect,it} from "vitest";
import {estateConfig,sourceFileMetadata,suburbKey} from "./estate";

describe("estate configuration",()=>{
  it("defaults to the isolated VIC lab",()=>expect(estateConfig({})).toMatchObject({state:"VIC",name:"VIC House Data Lab",motherduckDatabase:"vic_house_data"}));
  it("extracts VIC and a four digit postcode",()=>expect(sourceFileMetadata("rea-sold-ABERFELDIE-VIC-_3040_.csv")).toEqual({state:"VIC",postcode:"3040"}));
  it("keeps WA metadata compatible",()=>expect(sourceFileMetadata("rea-sold-YOKINE-WA-_6060_.csv")).toEqual({state:"WA",postcode:"6060"}));
  it("creates state-qualified suburb keys",()=>expect(suburbKey("VIC","St Albans")).toBe("vic-st-albans"));
});
