import {describe,expect,it} from "vitest";
import {DUCKDIVE_DRAFT_MAX_AGE_MS,clearDuckDiveDraft,duckDiveDraftKey,loadDuckDiveDraft,saveDuckDiveDraft} from "./duckdive-draft";

function memoryStorage(){
  const values=new Map<string,string>();
  return {
    getItem:(key:string)=>values.get(key)??null,
    setItem:(key:string,value:string)=>{values.set(key,value);},
    removeItem:(key:string)=>{values.delete(key);},
  };
}

describe("DuckDive homepage drafts",()=>{
  it("stores only a versioned, trimmed question for one starter",()=>{
    const storage=memoryStorage();
    expect(saveDuckDiveDraft(storage,"suburb-story","  What changed in Yarraville?  ",100)).toBe(true);
    expect(loadDuckDiveDraft(storage,"suburb-story",101)).toBe("What changed in Yarraville?");
    expect(loadDuckDiveDraft(storage,"market-pulse",101)).toBe("");
    expect(storage.getItem(duckDiveDraftKey("suburb-story"))).toContain('"version":"v1"');
  });

  it("rejects empty, malformed, or expired drafts and clears consumed drafts",()=>{
    const storage=memoryStorage();
    expect(saveDuckDiveDraft(storage,"market-pulse","   ",100)).toBe(false);
    storage.setItem(duckDiveDraftKey("market-pulse"),"not-json");
    expect(loadDuckDiveDraft(storage,"market-pulse",101)).toBe("");
    saveDuckDiveDraft(storage,"market-pulse","Show the statewide trend",100);
    expect(loadDuckDiveDraft(storage,"market-pulse",100+DUCKDIVE_DRAFT_MAX_AGE_MS+1)).toBe("");
    saveDuckDiveDraft(storage,"market-pulse","Show the statewide trend",100);
    clearDuckDiveDraft(storage,"market-pulse");
    expect(loadDuckDiveDraft(storage,"market-pulse",101)).toBe("");
  });
});
