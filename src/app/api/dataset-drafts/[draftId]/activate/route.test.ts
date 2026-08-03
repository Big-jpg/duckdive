import {beforeEach,describe,expect,it,vi} from "vitest";

const mocks=vi.hoisted(()=>({currentUser:vi.fn(),getDatasetDraft:vi.fn(),compile:vi.fn(),activate:vi.fn()}));
vi.mock("@/lib/auth",()=>({currentUser:mocks.currentUser}));
vi.mock("@/lib/dataset-drafts-db",()=>({getDatasetDraft:mocks.getDatasetDraft}));
vi.mock("@/lib/operational-dataset-candidate",()=>({OperationalDatasetCandidateError:class OperationalDatasetCandidateError extends Error{issues:string[]=[];},compileOperationalDatasetCandidate:mocks.compile}));
vi.mock("@/lib/operational-datasets-db",()=>({OperationalDatasetConflictError:class OperationalDatasetConflictError extends Error{},activateOperationalDataset:mocks.activate}));

import {OperationalDatasetConflictError} from "@/lib/operational-datasets-db";
import {POST} from "./route";

const userId="11111111-1111-4111-8111-111111111111",draftId="22222222-2222-4222-8222-222222222222",context={params:Promise.resolve({draftId})};
const candidate={schemaVersion:"operational-dataset-candidate/v1",provenance:{reviewedContractFingerprint:"a".repeat(64)}};
function request(origin="https://duckdive.gold"){return new Request(`https://duckdive.gold/api/dataset-drafts/${draftId}/activate`,{method:"POST",headers:{host:"duckdive.gold",origin}});}

describe("dataset activation route",()=>{
  beforeEach(()=>{vi.clearAllMocks();mocks.currentUser.mockResolvedValue({user_id:userId});mocks.getDatasetDraft.mockResolvedValue({contract_json:{safe:true}});mocks.compile.mockReturnValue(candidate);});
  it("rejects cross-origin activation before any lookup",async()=>{expect((await POST(request("https://attacker.example"),context)).status).toBe(403);expect(mocks.getDatasetDraft).not.toHaveBeenCalled();});
  it("fails closed when the owner cannot see the draft",async()=>{mocks.getDatasetDraft.mockResolvedValue(null);expect((await POST(request(),context)).status).toBe(404);expect(mocks.getDatasetDraft).toHaveBeenCalledWith(userId,draftId);expect(mocks.activate).not.toHaveBeenCalled();});
  it("creates once and returns the same owner-scoped dataset idempotently",async()=>{const dataset={operational_dataset_id:"33333333-3333-4333-8333-333333333333",dataset_key:"dataset-"+"a".repeat(32)};mocks.activate.mockResolvedValueOnce({dataset,created:true}).mockResolvedValueOnce({dataset,created:false});const first=await POST(request(),context),second=await POST(request(),context);expect(first.status).toBe(201);expect(second.status).toBe(200);expect(mocks.activate).toHaveBeenCalledWith(userId,draftId,candidate);expect((await second.json()).created).toBe(false);});
  it("returns conflict without exposing contract content",async()=>{mocks.activate.mockRejectedValue(new OperationalDatasetConflictError("Immutable activation differs"));const response=await POST(request(),context);expect(response.status).toBe(409);expect(await response.text()).not.toContain("safe");});
});
