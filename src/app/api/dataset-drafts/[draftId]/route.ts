import {z} from "zod";
import {currentUser} from "@/lib/auth";
import {audit} from "@/lib/app-db";
import type {AppUser} from "@/lib/app-db";
import {assertSameOrigin} from "@/lib/csrf";
import {deleteDatasetDraft,getDatasetDraft} from "@/lib/dataset-drafts-db";
import {datasetDraftResponse} from "@/lib/dataset-draft-contract";

const idSchema=z.string().uuid(),privateHeaders={"Cache-Control":"private, no-store"};

async function authorize(request:Request,params:Promise<{draftId:string}>):Promise<{error:Response}|{user:AppUser;draftId:string}>{
  const user=await currentUser(request);if(!user)return {error:Response.json({error:"Authentication required"},{status:401})};
  const parsed=idSchema.safeParse((await params).draftId);if(!parsed.success)return {error:Response.json({error:"Invalid dataset draft"},{status:400})};
  return {user,draftId:parsed.data};
}

export async function GET(request:Request,{params}:{params:Promise<{draftId:string}>}){
  const result=await authorize(request,params);if("error" in result)return result.error;
  const draft=await getDatasetDraft(result.user.user_id,result.draftId);if(!draft)return Response.json({error:"Dataset draft not found"},{status:404});
  return Response.json({draft:datasetDraftResponse(draft)},{headers:privateHeaders});
}

export async function DELETE(request:Request,{params}:{params:Promise<{draftId:string}>}){
  const csrf=assertSameOrigin(request);if(csrf)return csrf;
  const result=await authorize(request,params);if("error" in result)return result.error;
  const deleted=await deleteDatasetDraft(result.user.user_id,result.draftId);if(!deleted)return Response.json({error:"Dataset draft not found"},{status:404});
  await audit("dataset_draft.deleted",result.user.user_id,result.draftId);
  return Response.json({ok:true},{headers:privateHeaders});
}
