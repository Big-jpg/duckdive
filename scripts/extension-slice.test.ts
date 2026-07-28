import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { describe, expect, it } from "vitest";

type SliceHelpers = {
  makeSliceId: (slice: Record<string, unknown>) => string;
  buildUrl: (slice: Record<string, unknown>, page: number) => string;
  recordInDateRange: (record: { soldDateISO: string | null }, slice: Record<string, unknown>) => boolean;
};

const context = vm.createContext({ URL });
vm.runInContext(await readFile(new URL("../rea-sold-scraper/slice.js", import.meta.url), "utf8"), context);
const helpers = context.ReaSlice as SliceHelpers;

const slice = {
  suburb: "Yokine", stateAbbr: "WA", postcode: "6060", propertyType: "house",
  includeSurrounding: false, bedroomsMin: 3, bedroomsMax: 3,
  priceMin: 700000, priceMax: 1200000, maxSoldAge: "12-month",
  soldDateFrom: "2025-01-01", soldDateTo: "2025-12-31"
};

describe("extension slice helpers", () => {
  it("builds the expected bounded REA query", () => {
    const url = new URL(helpers.buildUrl(slice, 4));
    expect(url.pathname).toBe("/sold/property-house-with-3-bedrooms-between-700000-1200000-in-yokine,+wa+6060/list-4");
    expect(url.searchParams.get("includeSurrounding")).toBe("false");
    expect(url.searchParams.get("activeSort")).toBe("solddate");
    expect(url.searchParams.get("maxBeds")).toBe("3");
    expect(url.searchParams.get("maxSoldAge")).toBe("12-month");
    expect(() => helpers.buildUrl(slice, 81)).toThrow("Page must be between 1 and 80");
  });

  it("keeps IDs deterministic and applies client-side date bounds", () => {
    expect(helpers.makeSliceId(slice)).toBe(helpers.makeSliceId({ ...slice }));
    expect(helpers.recordInDateRange({ soldDateISO: "2025-06-01" }, slice)).toBe(true);
    expect(helpers.recordInDateRange({ soldDateISO: "2026-01-01" }, slice)).toBe(false);
    expect(helpers.recordInDateRange({ soldDateISO: null }, slice)).toBe(false);
  });
});
