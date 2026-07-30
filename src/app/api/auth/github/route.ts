import {z} from "zod";
import {assertSameOrigin} from "@/lib/csrf";
import {appUrl,safeNextPath} from "@/lib/auth-policy";
import {neonAuth} from "@/lib/neon-auth";

const bodySchema=z.object({next:z.string().max(1000).optional()}).strict();

export async function POST(request:Request){
  const csrf=assertSameOrigin(request);if(csrf)return csrf;
  const parsed=bodySchema.safeParse(await request.json().catch(()=>({})));
  if(!parsed.success)return Response.json({error:"Invalid sign-in request"},{status:400});
  const next=safeNextPath(parsed.data.next);
  const completeUrl=appUrl(`/auth/complete?next=${encodeURIComponent(next)}`,request.url);
  const result=await neonAuth().signIn.social({provider:"github",callbackURL:completeUrl,newUserCallbackURL:completeUrl,errorCallbackURL:appUrl("/login?error=github_failed",request.url),disableRedirect:true});
  if(result.error){console.error("Neon Auth GitHub sign-in failed",{code:result.error.code,status:result.error.status});return Response.json({error:"GitHub sign-in is temporarily unavailable."},{status:502});}
  const url=result.data?.url;
  return typeof url==="string"&&url?Response.json({url}):Response.json({error:"GitHub sign-in did not return a redirect."},{status:502});
}
