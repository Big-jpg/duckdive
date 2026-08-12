import {describe,expect,it,vi} from "vitest";

const mocks=vi.hoisted(()=>({createToken:vi.fn(),postgres:vi.fn()}));
vi.mock("./motherduck-api",()=>({createMotherDuckToken:mocks.createToken}));
vi.mock("postgres",()=>({default:mocks.postgres}));
vi.mock("@ai-sdk/mcp",()=>({createMCPClient:vi.fn()}));

import {motherduckServiceSql} from "./motherduck-access";

describe("MotherDuck service connection cache",()=>{
  it("shares one in-flight token request across concurrent snapshot reads",async()=>{
    let resolveToken:(value:{token:string})=>void=()=>{};
    mocks.createToken.mockReturnValueOnce(new Promise(resolve=>{resolveToken=resolve;}));
    const sql={end:vi.fn()};mocks.postgres.mockReturnValue(sql);

    const first=motherduckServiceSql("concurrent-owner");
    const second=motherduckServiceSql("concurrent-owner");
    await vi.waitFor(()=>expect(mocks.createToken).toHaveBeenCalledTimes(1));
    resolveToken({token:"short-lived"});

    await expect(Promise.all([first,second])).resolves.toEqual([sql,sql]);
    expect(mocks.postgres).toHaveBeenCalledTimes(1);
    expect(sql.end).not.toHaveBeenCalled();
  });
});
