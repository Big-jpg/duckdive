import {describe,expect,it} from "vitest";
import {analyticsPolicy,insightsQuerySchema,salesQuerySchema} from "./analytics-contract";

describe("analytics query contracts",()=>{
  it("accepts state-qualified VIC insight filters",()=>expect(insightsQuerySchema("VIC").safeParse({suburb_key:"vic-yarraville",from:"2024-01-01",to:"2024-12-31",bedrooms:"7"}).success).toBe(true));
  it("rejects inverted periods",()=>expect(insightsQuerySchema("VIC").safeParse({suburb_key:"vic-yarraville",from:"2025-01-01",to:"2024-01-01"}).success).toBe(false));
  it("rejects another estate's key",()=>expect(insightsQuerySchema("VIC").safeParse({suburb_key:"wa-yokine",from:"2024-01-01",to:"2024-12-31"}).success).toBe(false));
  it("rejects unknown and ambiguous period parameters",()=>expect(insightsQuerySchema("VIC").safeParse({suburb_key:"vic-yarraville",from:"2024-01-01",to:"2024-12-31",months:"12"}).success).toBe(false));
  it("accepts four-digit VIC postcodes and source bedroom values",()=>expect(salesQuerySchema("VIC").safeParse({postcode:"3000",bedrooms:String(analyticsPolicy.bedrooms.filterMaximum)}).success).toBe(true));
});
