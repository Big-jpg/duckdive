import {z} from "zod";
import {currentUser} from "@/lib/auth";
import {getDatasetDraft} from "@/lib/dataset-drafts-db";
import {compileOperationalDatasetCandidate,OperationalDatasetCandidateError} from "@/lib/operational-dataset-candidate";

const idSchema=z.string().uuid(),privateHeaders={"Cache-Control":"private, no-store"};

export async function GET(request:Request,{params}:{params:Promise<{draftId:string}>}){
  const user=await currentUser(request);if(!user)return Response.json({error:"Authentication required"},{status:401,headers:privateHeaders});
  const parsed=idSchema.safeParse((await params).draftId);if(!parsed.success)return Response.json({error:"Invalid dataset draft"},{status:400,headers:privateHeaders});
  const draft=await getDatasetDraft(user.user_id,parsed.data);if(!draft)return Response.json({error:"Dataset draft not found"},{status:404,headers:privateHeaders});
  try{return Response.json({candidate:compileOperationalDatasetCandidate(draft.contract_json)},{headers:privateHeaders});}
  catch(reason){
    if(reason instanceof OperationalDatasetCandidateError)return Response.json({error:reason.message,issues:reason.issues},{status:422,headers:privateHeaders});
    throw reason;
  }
}
