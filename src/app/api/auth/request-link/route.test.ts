import {beforeEach,describe,expect,it,vi} from "vitest";

const mocks=vi.hoisted(()=>({authorize:vi.fn(),handlerPost:vi.fn()}));
vi.mock("@/lib/app-db",()=>({authorizeMagicLinkRequest:mocks.authorize}));
vi.mock("@/lib/neon-auth",()=>({neonAuth:()=>({handler:()=>({POST:mocks.handlerPost})})}));
import {POST} from "./route";

function request(email="member@example.com"){
  return new Request("https://duckdive.gold/api/auth/request-link",{method:"POST",headers:{"Content-Type":"application/json",origin:"https://duckdive.gold",host:"duckdive.gold","x-forwarded-for":"203.0.113.2"},body:JSON.stringify({email,next:"/workspace"})});
}

describe("magic-link request route",()=>{
  beforeEach(()=>{
    vi.clearAllMocks();
    process.env.NEON_AUTH_COOKIE_SECRET="test-only-cookie-secret-with-at-least-32-characters";
    mocks.authorize.mockResolvedValue({allowlisted:true,quotaAllowed:true});
    mocks.handlerPost.mockResolvedValue(Response.json({status:true}));
  });

  it("seeds the canonical challenge through Neon and returns it as a secure browser cookie",async()=>{
    const response=await POST(request());
    expect(response.status).toBe(202);
    const setCookies=(response.headers as Headers&{getSetCookie:()=>string[]}).getSetCookie();
    expect(setCookies).toHaveLength(2);
    const canonical=setCookies.find(cookie=>cookie.startsWith("__Secure-neon-auth.session_challenge="))??"";
    const legacy=setCookies.find(cookie=>cookie.startsWith("__Secure-neon-auth.session_challange="))??"";
    const setCookie=canonical;
    expect(canonical).toMatch(/^__Secure-neon-auth\.session_challenge=[A-Za-z0-9_-]{43};/);
    expect(legacy).toMatch(/^__Secure-neon-auth\.session_challange=[A-Za-z0-9_-]{43};/);
    expect(setCookie).toContain("Path=/");
    expect(setCookie).toContain("Max-Age=600");
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("Secure");
    expect(setCookie).toContain("SameSite=lax");

    expect(mocks.handlerPost).toHaveBeenCalledOnce();
    const [authRequest,context]=mocks.handlerPost.mock.calls[0] as [Request,{params:Promise<{path:string[]}>}];
    const upstreamCookie=authRequest.headers.get("cookie")??"";
    expect(authRequest.headers.get("origin")).toBe("https://duckdive.gold");
    expect(upstreamCookie).toMatch(/^__Secure-neon-auth\.session_challenge=[A-Za-z0-9_-]{43}; __Secure-neon-auth\.session_challange=[A-Za-z0-9_-]{43}$/);
    const challenge=setCookie.match(/^__Secure-neon-auth\.session_challenge=([^;]+)/)?.[1];
    expect(upstreamCookie).toContain(`__Secure-neon-auth.session_challenge=${challenge}`);
    expect(upstreamCookie).toContain(`__Secure-neon-auth.session_challange=${challenge}`);
    expect(await context.params).toEqual({path:["sign-in","magic-link"]});
    expect(await authRequest.json()).toEqual({email:"member@example.com",callbackURL:"https://duckdive.gold/auth/complete?next=%2Fworkspace",errorCallbackURL:"https://duckdive.gold/login?error=link_failed"});
  });

  it("keeps denied requests generic and cookie-free",async()=>{
    mocks.authorize.mockResolvedValue({allowlisted:false,quotaAllowed:true});
    const response=await POST(request("denied@example.com"));
    expect(response.status).toBe(202);
    expect(response.headers.has("set-cookie")).toBe(false);
    expect(mocks.handlerPost).not.toHaveBeenCalled();
  });

  it("does not issue a challenge when Neon rejects the request",async()=>{
    mocks.handlerPost.mockResolvedValue(Response.json({error:"upstream"},{status:500}));
    const response=await POST(request());
    expect(response.status).toBe(502);
    expect(response.headers.has("set-cookie")).toBe(false);
  });

  it("prefers an upstream challenge when Neon resumes issuing one",async()=>{
    const upstream=new Response(JSON.stringify({status:true}),{headers:{"Set-Cookie":"__Secure-neon-auth.session_challenge=upstream-bound-value; Path=/; HttpOnly; Secure"}});
    mocks.handlerPost.mockResolvedValue(upstream);
    const response=await POST(request());
    const setCookies=(response.headers as Headers&{getSetCookie:()=>string[]}).getSetCookie();
    expect(setCookies).toHaveLength(2);
    expect(setCookies.every(cookie=>cookie.includes("=upstream-bound-value;"))).toBe(true);
  });
});
