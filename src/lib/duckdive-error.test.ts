import {describe,expect,it} from "vitest";
import {readableDuckDiveError} from "./duckdive-error";

describe("DuckDive client errors",()=>{
  it("extracts API errors without exposing raw JSON",()=>expect(readableDuckDiveError(new Error('{"error":"Invalid request"}'))).toBe("Invalid request"));
  it("turns a run collision into actionable product copy",()=>expect(readableDuckDiveError(new Error('{"error":"A DuckDive is already running for this view"}'))).toBe("Another update is still being verified. Wait a moment, then try again."));
});
