import {z} from "zod";
import {currentUser} from "@/lib/auth";
import {assertSameOrigin} from "@/lib/csrf";
import {reviewAccessRequest} from "@/lib/access-request-db";

const bodySchema=z.object({requestId:z.uuid(),action:z.enum(["approve","ignore"])}).strict();

export async function PATCH(request:Request){
  const csrf=assertSameOrigin(request);if(csrf)return csrf;
  const actor=await currentUser(request);if(actor?.role!=="admin")return Response.json({error:"Administrator access required"},{status:403});
  const parsed=bodySchema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return Response.json({error:"Invalid access request action."},{status:400});
  const result=await reviewAccessRequest(actor.user_id,parsed.data.requestId,parsed.data.action);
  if(result.reason==="not_found")return Response.json({error:"Access request not found."},{status:404});
  if(result.reason==="already_reviewed")return Response.json({error:"This access request has already been reviewed."},{status:409});
  return Response.json({request:result.request,user:result.user},{headers:{"Cache-Control":"private, no-store"}});
}
