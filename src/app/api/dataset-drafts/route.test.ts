import {beforeEach,describe,expect,it,vi} from "vitest";
import {expectedSemanticContractFingerprint} from "@/lib/dataset-draft-contract";
import type {ReviewedSemanticContractV1} from "@/lib/semantic-model-types";

const mocks=vi.hoisted(()=>({
  currentUser:vi.fn(),createDatasetDraft:vi.fn(),listDatasetDrafts:vi.fn(),audit:vi.fn(),
}));
vi.mock("@/lib/auth",()=>({currentUser:mocks.currentUser}));
vi.mock("@/lib/dataset-drafts-db",()=>({createDatasetDraft:mocks.createDatasetDraft,listDatasetDrafts:mocks.listDatasetDrafts}));
vi.mock("@/lib/app-db",()=>({audit:mocks.audit}));

import {GET,POST} from "./route";

function contract():ReviewedSemanticContractV1{
  const value:ReviewedSemanticContractV1={schemaVersion:"semantic-contract/v1",identity:{displayName:"Operations",sourceFormat:"fabric-tmdl",archiveFingerprint:"a".repeat(64),contractFingerprint:"0".repeat(64)},entities:[{name:"Sales",description:"",purpose:"Operating events",grain:"One row per event",provenance:{purpose:"user-confirmed",grain:"user-confirmed"},columns:[{name:"SaleKey",description:"",dataType:"int64",isHidden:false,isKey:true,provenance:"declared"}]}],measures:[],relationships:[],sourceSummary:"Import",diagnostics:[]};
  value.identity.contractFingerprint=expectedSemanticContractFingerprint(value);return value;
}

function request(method:string,body?:unknown,origin="https://duckdive.gold"){
  return new Request("https://duckdive.gold/api/dataset-drafts",{method,headers:{host:"duckdive.gold",origin,...(body?{"content-type":"application/json"}:{})},body:body?JSON.stringify(body):undefined});
}

describe("dataset draft collection route",()=>{
  beforeEach(()=>{vi.clearAllMocks();mocks.currentUser.mockResolvedValue({user_id:"11111111-1111-4111-8111-111111111111"});mocks.listDatasetDrafts.mockResolvedValue([]);});

  it("requires authentication for reads",async()=>{mocks.currentUser.mockResolvedValue(null);expect((await GET(request("GET"))).status).toBe(401);});
  it("rejects cross-origin writes before persistence",async()=>{expect((await POST(request("POST",contract(),"https://attacker.example"))).status).toBe(403);expect(mocks.createDatasetDraft).not.toHaveBeenCalled();});
  it("rejects connectivity detail and a mismatched fingerprint",async()=>{
    const unsafe=contract();unsafe.entities[0].description="https://private.example";
    expect((await POST(request("POST",unsafe))).status).toBe(400);
    const changed=contract();changed.entities[0].grain="Changed after hashing";
    expect((await POST(request("POST",changed))).status).toBe(400);
    expect(mocks.createDatasetDraft).not.toHaveBeenCalled();
  });
  it("saves and audits only a validated reviewed contract",async()=>{
    const value=contract(),row={dataset_draft_id:"22222222-2222-4222-8222-222222222222",user_id:"11111111-1111-4111-8111-111111111111",display_name:"Operations",source_kind:"fabric-tmdl",schema_version:"semantic-contract/v1",archive_fingerprint:value.identity.archiveFingerprint,contract_fingerprint:value.identity.contractFingerprint,contract_json:value,diagnostics_json:[],security_summary_json:null,created_at:"2026-08-03T06:00:00Z"};
    mocks.createDatasetDraft.mockResolvedValue(row);
    const response=await POST(request("POST",value));expect(response.status).toBe(201);
    expect(mocks.createDatasetDraft).toHaveBeenCalledWith("11111111-1111-4111-8111-111111111111",value);
    expect(mocks.audit).toHaveBeenCalledWith("dataset_draft.created",row.user_id,row.dataset_draft_id,{schemaVersion:"semantic-contract/v1",sourceKind:"fabric-tmdl"});
    expect(JSON.stringify(mocks.audit.mock.calls)).not.toContain("Operating events");
  });
});
