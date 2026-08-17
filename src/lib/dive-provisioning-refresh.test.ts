import {beforeEach,describe,expect,it,vi} from "vitest";

const mocks=vi.hoisted(()=>({
  audit:vi.fn(),
  createMotherDuckUser:vi.fn(),
  getSetting:vi.fn(),
  getWorkspace:vi.fn(),
  getWorkspaceDives:vi.fn(),
  saveWorkspace:vi.fn(),
  setSetting:vi.fn(),
  unsafe:vi.fn(),
}));

vi.mock("./app-db",()=>({
  audit:mocks.audit,
  getSetting:mocks.getSetting,
  getWorkspace:mocks.getWorkspace,
  getWorkspaceDives:mocks.getWorkspaceDives,
  saveWorkspace:mocks.saveWorkspace,
  setSetting:mocks.setSetting,
}));
vi.mock("./motherduck-api",()=>({createMotherDuckUser:mocks.createMotherDuckUser,createEmbedSession:vi.fn()}));
vi.mock("./motherduck-access",()=>({motherduckServiceSql:vi.fn(async()=>({unsafe:mocks.unsafe}))}));

import {WA_VEHICLE_MARKET_DATASET} from "./datasets";
import {ensureWorkspaceDataset} from "./dive-provisioning";

describe("Dive source refresh",()=>{
  beforeEach(()=>{
    vi.clearAllMocks();
    process.env.WA_VEHICLE_MARKET_MOTHERDUCK_DATABASE="wa_vehicle_market";
    process.env.WA_VEHICLE_MARKET_SHARE_URL="md:_share/wa/current";
    process.env.WA_VEHICLE_MARKET_SERVICE_ACCOUNT_USERNAME="vic_house_lab";
    mocks.getWorkspace.mockResolvedValue({workspace_id:"workspace",user_id:"user",motherduck_username:"vic_house_lab",dive_ids:{},source_dive_ids:{}});
    mocks.getWorkspaceDives.mockResolvedValue(WA_VEHICLE_MARKET_DATASET.starters.map((starter,index)=>({workspace_id:"workspace",dataset_key:WA_VEHICLE_MARKET_DATASET.key,starter_key:starter.key,dive_id:`owned-${index}`,source_dive_id:`source-${index}`})));
    mocks.getSetting.mockImplementation(async(key:string)=>key.startsWith("source_dive:")?`source-${key}`:"stale-hash");
  });

  it("refreshes registered source Dives even when the workspace already has every mapping",async()=>{
    const existing=await ensureWorkspaceDataset({user_id:"user",email:"owner@example.com",auth_subject:"auth-user",role:"admin",status:"active",invited_at:null,last_login_at:null,revoked_at:null},WA_VEHICLE_MARKET_DATASET);
    expect(existing.workspace_id).toBe("workspace");
    expect(mocks.unsafe).toHaveBeenCalledTimes(4);
    expect(mocks.unsafe.mock.calls.every(([sql])=>String(sql).includes("MD_UPDATE_DIVE_CONTENT"))).toBe(true);
    expect(mocks.setSetting).toHaveBeenCalledTimes(4);
    expect(mocks.saveWorkspace).not.toHaveBeenCalled();
  });
});
