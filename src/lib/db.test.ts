import {describe,expect,it} from "vitest";
import {validateDatabaseUrl} from "./db";

describe("validateDatabaseUrl",()=>{
  it("accepts PostgreSQL URLs",()=>{
    expect(validateDatabaseUrl("postgresql://user:password@example.com/database")).toContain("example.com");
  });

  it("explains Vercel protected placeholders",()=>{
    expect(()=>validateDatabaseUrl("[SENSITIVE]","DATABASE_URL_UNPOOLED")).toThrow(/cannot be downloaded/i);
  });

  it("rejects non-PostgreSQL URLs",()=>{
    expect(()=>validateDatabaseUrl("https://example.com/database")).toThrow(/PostgreSQL URL/);
  });
});
