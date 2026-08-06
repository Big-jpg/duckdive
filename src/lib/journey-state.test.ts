import {describe,expect,it} from "vitest";
import {advanceJourneyState,emptyJourneyState,intakeJourneyFiles,JOURNEY_LIMITS,restoreJourneyState,stableNumber} from "./journey-state";

const candidate=(name:string,size=10,lastModified=1)=>({name,size,lastModified});
const ids=(_value:unknown,index:number)=>`file-${index}`;

describe("journey state",()=>{
  it("accepts arbitrary file types and rejects invalid siblings independently",()=>{
    const result=intakeJourneyFiles([candidate("table.csv"),candidate("mystery.bin"),candidate("huge.zip",JOURNEY_LIMITS.fileBytes+1)],[],1_000,ids);
    expect(result.accepted.map(file=>file.extension)).toEqual(["CSV","BIN"]);
    expect(result.rejected).toEqual([{name:"huge.zip",reason:"file_too_large"}]);
  });
  it("enforces duplicate, count, and aggregate limits",()=>{
    const existing=intakeJourneyFiles([candidate("same.csv")],[],0,ids).accepted;
    expect(intakeJourneyFiles([candidate("same.csv")],existing,0,ids).rejected[0].reason).toBe("duplicate");
    const ten=Array.from({length:10},(_,index)=>candidate(`${index}.csv`));
    const full=intakeJourneyFiles(ten,[],0,ids).accepted;
    expect(intakeJourneyFiles([candidate("more.csv")],full,0,ids).rejected[0].reason).toBe("file_limit");
    const large=intakeJourneyFiles(Array.from({length:5},(_,index)=>candidate(`large-${index}`,JOURNEY_LIMITS.fileBytes)),[],0,ids).accepted;
    expect(intakeJourneyFiles([candidate("b",1)],large,0,ids).rejected[0].reason).toBe("batch_too_large");
  });
  it("runs one deterministic duck worker sequentially",()=>{
    const files=intakeJourneyFiles([candidate("a.csv"),candidate("b.json")],[],0,ids).accepted;
    const mid=advanceJourneyState({...emptyJourneyState(),files},5_000);
    expect(mid.files.filter(file=>file.status==="diving"||file.status==="transforming")).toHaveLength(1);
    const done=advanceJourneyState(mid,60_000);
    expect(done.files.every(file=>file.status==="lake_ready")).toBe(true);
    expect(stableNumber("file-0:transform")).toBe(stableNumber("file-0:transform"));
  });
  it("restores elapsed work and rejects malformed or obsolete storage",()=>{
    const files=intakeJourneyFiles([candidate("a.pdf")],[],0,ids).accepted,state={...emptyJourneyState(7),files};
    expect(restoreJourneyState(JSON.stringify(state),60_000).files[0].status).toBe("lake_ready");
    expect(restoreJourneyState("not json").files).toEqual([]);
    expect(restoreJourneyState(JSON.stringify({...state,version:2})).files).toEqual([]);
  });
});
