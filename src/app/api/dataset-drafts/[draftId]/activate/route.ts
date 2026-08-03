import {z} from "zod";
import {currentUser} from "@/lib/auth";
import {assertSameOrigin} from "@/lib/csrf";
import {getDatasetDraft} from "@/lib/dataset-drafts-db";
import {compileOperationalDatasetCandidate,OperationalDatasetCandidateError} from "@/lib/operational-dataset-candidate";
import {activateOperationalDataset,OperationalDatasetConflictError} from "@/lib/operational-datasets-db";

const idSchema=z.string().uuid(),privateHeaders={"Cache-Control":"private, no-store"};

export async function POST(request:Request,{params}:{params:Promise<{draftId:string}>}){
  const csrf=assertSameOrigin(request);if(csrf)return csrf;
  const user=await currentUser(request);if(!user)return Response.json({error:"Authentication required"},{status:401,headers:privateHeaders});
  const parsed=idSchema.safeParse((await params).draftId);if(!parsed.success)return Response.json({error:"Invalid dataset draft"},{status:400,headers:privateHeaders});
  const draft=await getDatasetDraft(user.user_id,parsed.data);if(!draft)return Response.json({error:"Dataset draft not found"},{status:404,headers:privateHeaders});
  let candidate;try{candidate=compileOperationalDatasetCandidate(draft.contract_json);}catch(error){if(error instanceof OperationalDatasetCandidateError)return Response.json({error:error.message,issues:error.issues},{status:422,headers:privateHeaders});throw error;}
  try{
    const result=await activateOperationalDataset(user.user_id,parsed.data,candidate);if(!result)return Response.json({error:"A workspace is required before activation"},{status:409,headers:privateHeaders});
    return Response.json({dataset:result.dataset,created:result.created},{status:result.created?201:200,headers:privateHeaders});
  }catch(error){if(error instanceof OperationalDatasetConflictError)return Response.json({error:error.message},{status:409,headers:privateHeaders});throw error;}
}
