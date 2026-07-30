import {describe,expect,it} from "vitest";
import {shareSlug,validShareSlug} from "./dive-share";

describe("Dive share slugs",()=>{
  it("creates readable, URL-safe capability slugs",()=>{
    const slug=shareSlug("suburb-story");
    expect(slug).toMatch(/^suburb-story-[a-f0-9]{20}$/);
    expect(validShareSlug(slug)).toBe(true);
  });

  it("rejects path traversal and malformed slugs",()=>{
    for(const value of ["../secret","Suburb-Story","suburb_story","share/other",""]){
      expect(validShareSlug(value)).toBe(false);
    }
  });
});
