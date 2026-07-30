import {describe,expect,it} from "vitest";
import type {UIMessage} from "ai";
import {DUCKDIVE_MAX_CHARS,validateDuckDiveBrief} from "./duckdive-request";

function message(text:string):UIMessage{return {id:"message",role:"user",parts:[{type:"text",text}]};}
describe("DuckDive brief validation",()=>{
  it("accepts a precise 4,000 character brief",()=>expect(validateDuckDiveBrief(message("x".repeat(DUCKDIVE_MAX_CHARS))).ok).toBe(true));
  it("rejects blank and oversized briefs",()=>{
    expect(validateDuckDiveBrief(message("   "))).toMatchObject({ok:false});
    expect(validateDuckDiveBrief(message("x".repeat(DUCKDIVE_MAX_CHARS+1)))).toMatchObject({ok:false});
  });
});
