import {beforeEach,describe,expect,it,vi} from "vitest";
import {expectedSemanticContractFingerprint} from "@/lib/dataset-draft-contract";
import type {ReviewedSemanticContractV1} from "@/lib/semantic-model-types";

const mocks=vi.hoisted(()=>({currentUser:vi.fn(),getDatasetDraft:vi.fn()}));
vi.mock("@/lib/auth",()=>({currentUser:mocks.currentUser}));
vi.mock("@/lib/dataset-drafts-db",()=>({getDatasetDraft:mocks.getDatasetDraft}));

import {GET} from "./route";

const draftId="22222222-2222-4222-8222-222222222222",userId="11111111-1111-4111-8111-111111111111",context={params:Promise.resolve({draftId})};
function request(){return new Request(`https://duckdive.gold/api/dataset-drafts/${draftId}/activation-preview`);}
function contract():ReviewedSemanticContractV1{
  const value:ReviewedSemanticContractV1={schemaVersion:"semantic-contract/v1",identity:{displayName:"Air quality",sourceFormat:"fabric-tmdl",archiveFingerprint:"a".repeat(64),contractFingerprint:"0".repeat(64)},entities:[{name:"ambient_air_quality",description:"",purpose:"Compare air quality",grain:"One observation",provenance:{purpose:"user-confirmed",grain:"user-confirmed"},columns:[{name:"country_name",description:"",dataType:"string",isHidden:false,isKey:false,provenance:"declared"}]}],measures:[],relationships:[],sourceSummary:"Import",diagnostics:[]};
  value.identity.contractFingerprint=expectedSemanticContractFingerprint(value);return value;
}

describe("dataset activation preview route",()=>{
  beforeEach(()=>{vi.clearAllMocks();mocks.currentUser.mockResolvedValue({user_id:userId});mocks.getDatasetDraft.mockResolvedValue(null);});
  it("requires authentication before looking up a draft",async()=>{mocks.currentUser.mockResolvedValue(null);expect((await GET(request(),context)).status).toBe(401);expect(mocks.getDatasetDraft).not.toHaveBeenCalled();});
  it("fails closed when the owner-scoped lookup cannot see another user's draft",async()=>{const response=await GET(request(),context);expect(response.status).toBe(404);expect(mocks.getDatasetDraft).toHaveBeenCalledWith(userId,draftId);expect(await response.text()).not.toContain("contract");});
  it("returns a private non-persisted preview for the owner",async()=>{const value=contract();mocks.getDatasetDraft.mockResolvedValue({contract_json:value});const response=await GET(request(),context),body=await response.json();expect(response.status).toBe(200);expect(response.headers.get("cache-control")).toBe("private, no-store");expect(body.candidate.activation.state).toBe("preview-only");expect(body.candidate.provenance.reviewedContractFingerprint).toBe(value.identity.contractFingerprint);});
  it("returns an explicit compiler failure for inconsistent stored evidence",async()=>{const value=contract();value.entities[0].columns[0].name="country name";value.identity.contractFingerprint=expectedSemanticContractFingerprint(value);mocks.getDatasetDraft.mockResolvedValue({contract_json:value});const response=await GET(request(),context),body=await response.json();expect(response.status).toBe(422);expect(body.issues[0]).toContain("not a supported operational identifier");});
});
