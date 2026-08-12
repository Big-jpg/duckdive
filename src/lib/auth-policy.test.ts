import {describe,expect,it} from "vitest";
import {appUrl,normalizeEmail,postAuthNextPath,safeNextPath,verifiedIdentity} from "./auth-policy";

describe("auth policy",()=>{
  it("normalizes allowlist identity and requires verified email",()=>{
    expect(verifiedIdentity({user:{id:"subject-1",email:" Ross@Example.COM ",emailVerified:true}})).toEqual({subject:"subject-1",email:"ross@example.com",emailVerified:true});
    expect(verifiedIdentity({user:{id:"subject-1",email:"ross@example.com",emailVerified:false}})).toBeNull();
    expect(normalizeEmail(" A@Example.com ")).toBe("a@example.com");
  });
  it("sends completed sign-ins to the workspace unless a protected destination is explicit",()=>{
    expect(postAuthNextPath(undefined)).toBe("/workspace");
    expect(postAuthNextPath("/")).toBe("/workspace");
    expect(postAuthNextPath("//attacker.test")).toBe("/workspace");
    expect(postAuthNextPath("/admin")).toBe("/admin");
  });
  it("allows only local redirect paths",()=>{
    expect(safeNextPath("/edit?key=pulse")).toBe("/edit?key=pulse");
    expect(safeNextPath("//attacker.example")).toBe("/");
    expect(safeNextPath("https://attacker.example")).toBe("/");
  });
  it("builds callbacks on the configured canonical origin",()=>{
    const previous=process.env.NEXT_PUBLIC_SITE_URL;
    process.env.NEXT_PUBLIC_SITE_URL="https://duckdive.gold";
    expect(appUrl("/auth/complete?next=%2Fedit","https://preview.example.test/login")).toBe("https://duckdive.gold/auth/complete?next=%2Fedit");
    if(previous===undefined)delete process.env.NEXT_PUBLIC_SITE_URL;else process.env.NEXT_PUBLIC_SITE_URL=previous;
  });
});
