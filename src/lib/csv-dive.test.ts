import {describe,expect,it} from "vitest";
import {buildCsvDive,clearCsvDiveStorage,CsvDiveError,csvDiveStorageKey,parseCsv,restoreCsvDive} from "./csv-dive";

const source='Region,Sales,Note\nNorth,10,"Good, steady"\nSouth,20,"Line 1\nLine 2"\nNorth,5,\n';
function dive(ownerScope="owner-a"){return buildCsvDive({ownerScope,fileName:"sales.csv",fileSize:source.length,lastModified:1,sha256:"a".repeat(64),source,importedAt:"2026-08-06T08:00:00.000Z"});}

describe("CSV Dive",()=>{
  it("parses quoted commas and newlines",()=>{expect(parseCsv(source)).toEqual([["Region","Sales","Note"],["North","10","Good, steady"],["South","20","Line 1\nLine 2"],["North","5",""]]);});
  it("derives a useful profile and chart",()=>{const result=dive();expect(result).toMatchObject({ownerScope:"owner-a",rowCount:3,completeness:8/9,chart:{title:"Sales by Region",labels:["South","North"],values:[20,15]}});expect(result.columns[1]).toMatchObject({kind:"number",minimum:5,maximum:20,mean:35/3});});
  it("fails closed across owners",()=>{const serialized=JSON.stringify(dive());expect(restoreCsvDive(serialized,"owner-a")?.file.name).toBe("sales.csv");expect(restoreCsvDive(serialized,"owner-b")).toBeNull();expect(csvDiveStorageKey("owner-a")).not.toBe(csvDiveStorageKey("owner-b"));});
  it("clears every local CSV Dive on sign-out",()=>{const values=new Map([[csvDiveStorageKey("owner-a"),"a"],[csvDiveStorageKey("owner-b"),"b"],["unrelated","keep"]]);const storage={get length(){return values.size;},key:(index:number)=>[...values.keys()][index]??null,removeItem:(key:string)=>{values.delete(key);}};clearCsvDiveStorage(storage);expect([...values]).toEqual([["unrelated","keep"]]);});
  it("rejects malformed input",()=>{expect(()=>parseCsv('a,b\n"unfinished')).toThrow(CsvDiveError);expect(()=>parseCsv("a,b")).toThrow("header row");});
});
