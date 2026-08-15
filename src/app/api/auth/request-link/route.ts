import {createHash,randomBytes} from "node:crypto";
import {NextResponse} from "next/server";
import {z} from "zod";
import {assertSameOrigin} from "@/lib/csrf";
import {authorizeMagicLinkRequest} from "@/lib/app-db";
import {appUrl,normalizeEmail,safeNextPath} from "@/lib/auth-policy";
import {neonAuth} from "@/lib/neon-auth";

const bodySchema=z.object({email:z.email().max(254),next:z.string().max(1000).optional()}).strict();
const accepted={ok:true,message:"If this address has active access, a sign-in link is on its way."};
const sessionChallengeCookies=["__Secure-neon-auth.session_challenge","__Secure-neon-auth.session_challange"] as const;
const sessionChallengeMaxAge=10*60;

function upstreamChallenge(headers:Headers,fallback:string){
  const setCookies=(headers as Headers&{getSetCookie?:()=>string[]}).getSetCookie?.()??[];
  for(const name of sessionChallengeCookies){
    const header=setCookies.find(value=>value.startsWith(`${name}=`));
    const value=header?.slice(name.length+1).split(";",1)[0];
    if(value)return value;
  }
  return fallback;
}

export async function POST(request:Request){
  const csrf=assertSameOrigin(request);if(csrf)return csrf;
  const parsed=bodySchema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return Response.json({error:"Enter a valid email address."},{status:400});
  const email=normalizeEmail(parsed.data.email),ip=request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()||"unknown";
  const rateSecret=process.env.NEON_AUTH_COOKIE_SECRET||"unconfigured";
  const keyHash=createHash("sha256").update(`${email}|${ip}|${rateSecret}`).digest("hex");
  const authorization=await authorizeMagicLinkRequest(email,keyHash);
  if(!authorization.quotaAllowed)return Response.json(accepted,{status:202,headers:{"Retry-After":"900"}});
  if(!authorization.allowlisted)return Response.json(accepted,{status:202});
  const next=safeNextPath(parsed.data.next);
  const challenge=randomBytes(32).toString("base64url");
  const authRequest=new Request(new URL("/api/auth/sign-in/magic-link",request.url),{
    method:"POST",
    headers:{"Content-Type":"application/json",Origin:request.headers.get("origin")!,Cookie:sessionChallengeCookies.map(name=>`${name}=${challenge}`).join("; ")},
    body:JSON.stringify({email,callbackURL:appUrl(`/auth/complete?next=${encodeURIComponent(next)}`,request.url),errorCallbackURL:appUrl("/login?error=link_failed",request.url)}),
  });
  const authResponse=await neonAuth().handler().POST(authRequest,{params:Promise.resolve({path:["sign-in","magic-link"]})});
  const responseChallenge=upstreamChallenge(authResponse.headers,challenge),authStatus=authResponse.status;
  await authResponse.body?.cancel();
  if(authStatus<200||authStatus>=300){console.error("Neon Auth magic-link request failed",{status:authStatus});return Response.json({error:"Sign-in email is temporarily unavailable."},{status:502});}
  const response=NextResponse.json(accepted,{status:202});
  for(const name of sessionChallengeCookies)response.cookies.set(name,responseChallenge,{httpOnly:true,secure:true,sameSite:"lax",path:"/",maxAge:sessionChallengeMaxAge});
  return response;
}
