import {z} from "zod";
import {currentUser} from "@/lib/auth";
import {assertSameOrigin} from "@/lib/csrf";
import {normalizeEmail} from "@/lib/auth-policy";
import {adminRevokeAccess,adminUpsertAccess,type AdminAccessResult} from "@/lib/admin-db";

const upsertSchema=z.object({email:z.email().max(254),role:z.enum(["member","admin"])});
const revokeSchema=z.object({userId:z.uuid()});

async function admin(request:Request){const user=await currentUser(request);return user?.role==="admin"?user:null;}
function failure(result:AdminAccessResult){
  if(result.reason==="self")return Response.json({error:"You cannot remove your own administrator access."},{status:400});
  if(result.reason==="last_admin")return Response.json({error:"At least one active administrator is required."},{status:400});
  return Response.json({error:"Allowlist user not found."},{status:404});
}

export async function POST(request:Request){
  const csrf=assertSameOrigin(request);if(csrf)return csrf;const actor=await admin(request);if(!actor)return Response.json({error:"Administrator access required"},{status:403});
  const parsed=upsertSchema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return Response.json({error:"Enter a valid email and role."},{status:400});
  const result=await adminUpsertAccess(actor.user_id,normalizeEmail(parsed.data.email),parsed.data.role);if(!result.user)return failure(result);
  return Response.json({user:result.user},{headers:{"Cache-Control":"private, no-store"}});
}

export async function DELETE(request:Request){
  const csrf=assertSameOrigin(request);if(csrf)return csrf;const actor=await admin(request);if(!actor)return Response.json({error:"Administrator access required"},{status:403});
  const parsed=revokeSchema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return Response.json({error:"Invalid user."},{status:400});
  const result=await adminRevokeAccess(actor.user_id,parsed.data.userId);if(!result.user)return failure(result);
  return Response.json({user:result.user},{headers:{"Cache-Control":"private, no-store"}});
}
