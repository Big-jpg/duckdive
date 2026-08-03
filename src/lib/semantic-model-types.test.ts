import {describe,expect,it} from "vitest";
import {canonicalJson,reviewedSemanticContractV1Schema,semanticContractPrivacyIssues} from "./semantic-model-types";

describe("reviewed semantic contract",()=>{
  it("canonicalizes object keys without changing array order",()=>{
    expect(canonicalJson({b:2,a:{d:4,c:3},items:[2,1]})).toBe('{"a":{"c":3,"d":4},"b":2,"items":[2,1]}');
  });

  it("rejects connectivity details even when hidden in otherwise valid fields",()=>{
    expect(semanticContractPrivacyIssues({description:"https://private.example/path"})).toEqual(["contract.description contains connectivity detail"]);
    expect(semanticContractPrivacyIssues({rawTmdl:"table Secret"})[0]).toContain("not an allowed persisted field");
  });

  it("accepts the minimum reviewed v1 wire shape",()=>{
    const hash="a".repeat(64);
    expect(reviewedSemanticContractV1Schema.safeParse({
      schemaVersion:"semantic-contract/v1",
      identity:{displayName:"Operations",sourceFormat:"fabric-tmdl",archiveFingerprint:hash,contractFingerprint:hash},
      entities:[{name:"Sales",description:"",purpose:"Recorded sales",grain:"One row per sale",provenance:{purpose:"user-confirmed",grain:"user-confirmed"},columns:[{name:"SaleKey",description:"",dataType:"int64",isHidden:false,isKey:true,provenance:"declared"}]}],
      measures:[],relationships:[],sourceSummary:"Import",diagnostics:[],
    }).success).toBe(true);
  });
});
