import {createHash} from "node:crypto";
import {z} from "zod";
import {assertSameOrigin} from "@/lib/csrf";
import {consumeLoginQuota,findActiveAllowlistedUserByEmail} from "@/lib/app-db";
import {appUrl,normalizeEmail,safeNextPath} from "@/lib/auth-policy";
import {neonAuth} from "@/lib/neon-auth";

const bodySchema=z.object({email:z.email().max(254),next:z.string().max(1000).optional()}).strict();
const accepted={ok:true,message:"If this address has active access, a sign-in link is on its way."};

export async function POST(request:Request){
  const csrf=assertSameOrigin(request);if(csrf)return csrf;
  const parsed=bodySchema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return Response.json({error:"Enter a valid email address."},{status:400});
  const email=normalizeEmail(parsed.data.email),ip=request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()||"unknown";
  const rateSecret=process.env.NEON_AUTH_COOKIE_SECRET||"unconfigured";
  const keyHash=createHash("sha256").update(`${email}|${ip}|${rateSecret}`).digest("hex");
  if(!await consumeLoginQuota(keyHash))return Response.json(accepted,{status:202,headers:{"Retry-After":"900"}});
  if(!await findActiveAllowlistedUserByEmail(email))return Response.json(accepted,{status:202});
  const next=safeNextPath(parsed.data.next);
  const result=await neonAuth().signIn.magicLink({email,callbackURL:appUrl(`/auth/complete?next=${encodeURIComponent(next)}`,request.url),errorCallbackURL:appUrl("/login?error=link_failed",request.url)});
  if(result.error){console.error("Neon Auth magic-link request failed",{code:result.error.code,status:result.error.status});return Response.json({error:"Sign-in email is temporarily unavailable."},{status:502});}
  return Response.json(accepted,{status:202});
}

