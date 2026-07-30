import {describe,expect,it} from "vitest";
import {assertDiveRevisionChanged,type DiveSnapshot} from "./duckdive-runtime";

const before:DiveSnapshot={version:5,content:"before",hash:"aaa"};
describe("DuckDive revision verification",()=>{
  it("requires both a newer version and changed source hash",()=>{
    expect(()=>assertDiveRevisionChanged(before,{version:6,content:"after",hash:"bbb"})).not.toThrow();
    expect(()=>assertDiveRevisionChanged(before,{version:5,content:"after",hash:"bbb"})).toThrow("version did not advance");
    expect(()=>assertDiveRevisionChanged(before,{version:6,content:"before",hash:"aaa"})).toThrow("source did not change");
  });
});
