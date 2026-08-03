// @vitest-environment node
import JSZip from "jszip";
import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
import {openSemanticModelArchive,SEMANTIC_ARCHIVE_LIMITS,SemanticModelArchiveError,validateSemanticArchiveEntries} from "./semantic-model-archive";

const originalWindow=globalThis.window;

async function archive(entries:Record<string,string>,name="model.zip"){
  const zip=new JSZip();for(const [path,value] of Object.entries(entries))zip.file(path,value);
  return new File([await zip.generateAsync({type:"arraybuffer"})],name,{type:"application/zip"});
}

function valid(root="Ops.SemanticModel/"){
  return {
    [`${root}.platform`]:JSON.stringify({metadata:{displayName:"Operations"}}),
    [`${root}definition.pbism`]:JSON.stringify({version:"4.0"}),
    [`${root}definition/model.tmdl`]:"model Model\n\nref table Sales",
    [`${root}definition/relationships.tmdl`]:"",
    [`${root}definition/tables/Sales.tmdl`]:"table Sales\n\tcolumn SaleKey\n\t\tdataType: int64\n\t\tisKey",
  };
}

describe("semantic model archive",()=>{
  beforeEach(()=>{vi.stubGlobal("window",{});});
  afterEach(()=>{vi.unstubAllGlobals();if(originalWindow)vi.stubGlobal("window",originalWindow);});

  it("opens a nested Azure DevOps export and fingerprints it locally",async()=>{
    const result=await openSemanticModelArchive(await archive(valid("repo/project/Ops.SemanticModel/")));
    expect(result).toMatchObject({displayName:"Operations",tables:[{name:"Sales"}]});
    expect(result.archiveFingerprint).toMatch(/^[a-f0-9]{64}$/);
  });

  it.each([
    ["missing model",{"readme.txt":"none"},"No *.SemanticModel/.platform"],
    ["missing definition",((value)=>{delete value["Ops.SemanticModel/definition.pbism"];return value;})(valid()),"missing definition.pbism"],
    ["multiple models",{...valid("A.SemanticModel/"),...valid("B.SemanticModel/")},"multiple semantic models"],
  ])("rejects %s",async(_label,entries,message)=>{
    await expect(openSemanticModelArchive(await archive(entries))).rejects.toThrow(message);
  });

  it("rejects non-ZIP input before parsing",async()=>{
    await expect(openSemanticModelArchive(new File(["x"],"model.tmdl"))).rejects.toBeInstanceOf(SemanticModelArchiveError);
  });

  it("rejects malformed TMDL text",async()=>{
    const entries=valid();entries["Ops.SemanticModel/definition/tables/Sales.tmdl"]="table Sales\0\n\tcolumn Key";
    await expect(openSemanticModelArchive(await archive(entries))).rejects.toThrow("valid UTF-8 TMDL text");
  });

  it("enforces compressed, expanded, entry-count and path safety limits",async()=>{
    const oversized=await archive(valid());Object.defineProperty(oversized,"size",{value:SEMANTIC_ARCHIVE_LIMITS.compressedBytes+1});
    await expect(openSemanticModelArchive(oversized)).rejects.toThrow("50 MiB compressed limit");
    expect(()=>validateSemanticArchiveEntries([{name:"safe",uncompressedSize:SEMANTIC_ARCHIVE_LIMITS.expandedBytes+1}])).toThrow("250 MiB expanded limit");
    expect(()=>validateSemanticArchiveEntries(Array.from({length:SEMANTIC_ARCHIVE_LIMITS.fileCount+1},(_,index)=>({name:String(index),uncompressedSize:0})))).toThrow("too many entries");
    expect(()=>validateSemanticArchiveEntries([{name:"safe/file",originalName:"../safe/file",uncompressedSize:1}])).toThrow("unsafe path");
  });
});
