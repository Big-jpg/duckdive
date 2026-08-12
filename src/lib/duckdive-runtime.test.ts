import {describe,expect,it} from "vitest";
import {motherduckConnectionEnded} from "./motherduck-access";
import {assertDiveRevisionChanged,canonicalDiveSource,type DiveSnapshot} from "./duckdive-runtime";

const before:DiveSnapshot={version:5,content:"before",hash:"aaa"};
describe("DuckDive revision verification",()=>{
  it("requires both a newer version and changed source hash",()=>{
    expect(()=>assertDiveRevisionChanged(before,{version:6,content:"after",hash:"bbb"})).not.toThrow();
    expect(()=>assertDiveRevisionChanged(before,{version:5,content:"after",hash:"bbb"})).toThrow("version did not advance");
    expect(()=>assertDiveRevisionChanged(before,{version:6,content:"before",hash:"aaa"})).toThrow("source did not change");
  });
  it("canonicalizes source hashing inputs without treating line endings or trailing spaces as semantic changes",()=>{
    expect(canonicalDiveSource("<x>\r\n  value  \r\n</x> ")).toBe("<x>\n  value\n</x>");
  });
  it("recognizes only the ended-connection error as retryable",()=>{
    expect(motherduckConnectionEnded({code:"CONNECTION_ENDED"})).toBe(true);
    expect(motherduckConnectionEnded({code:"ETIMEDOUT"})).toBe(false);
    expect(motherduckConnectionEnded(new Error("CONNECTION_ENDED"))).toBe(false);
  });
});
