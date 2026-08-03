import {beforeEach,describe,expect,it,vi} from "vitest";

const mocks=vi.hoisted(()=>({currentUser:vi.fn(),getDatasetDraft:vi.fn(),deleteDatasetDraft:vi.fn(),audit:vi.fn()}));
vi.mock("@/lib/auth",()=>({currentUser:mocks.currentUser}));
vi.mock("@/lib/dataset-drafts-db",()=>({getDatasetDraft:mocks.getDatasetDraft,deleteDatasetDraft:mocks.deleteDatasetDraft}));
vi.mock("@/lib/app-db",()=>({audit:mocks.audit}));

import {DELETE,GET} from "./route";

const draftId="22222222-2222-4222-8222-222222222222",userId="11111111-1111-4111-8111-111111111111";
const context={params:Promise.resolve({draftId})};
function request(method:string){return new Request(`https://duckdive.gold/api/dataset-drafts/${draftId}`,{method,headers:{host:"duckdive.gold",origin:"https://duckdive.gold"}});}

describe("dataset draft item route",()=>{
  beforeEach(()=>{vi.clearAllMocks();mocks.currentUser.mockResolvedValue({user_id:userId});mocks.getDatasetDraft.mockResolvedValue(null);mocks.deleteDatasetDraft.mockResolvedValue(null);});
  it("returns 404 when the owner-scoped lookup cannot see another user's draft",async()=>{expect((await GET(request("GET"),context)).status).toBe(404);expect(mocks.getDatasetDraft).toHaveBeenCalledWith(userId,draftId);});
  it("requires authentication before delete",async()=>{mocks.currentUser.mockResolvedValue(null);expect((await DELETE(request("DELETE"),context)).status).toBe(401);expect(mocks.deleteDatasetDraft).not.toHaveBeenCalled();});
  it("deletes only through the owner-scoped query and audits no contract content",async()=>{mocks.deleteDatasetDraft.mockResolvedValue({dataset_draft_id:draftId});expect((await DELETE(request("DELETE"),context)).status).toBe(200);expect(mocks.deleteDatasetDraft).toHaveBeenCalledWith(userId,draftId);expect(mocks.audit).toHaveBeenCalledWith("dataset_draft.deleted",userId,draftId);});
});
