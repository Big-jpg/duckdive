import {currentUser} from "@/lib/auth";
import {audit} from "@/lib/app-db";
import {assertSameOrigin} from "@/lib/csrf";
import {createDatasetDraft,listDatasetDrafts} from "@/lib/dataset-drafts-db";
import {DATASET_DRAFT_BODY_LIMIT,datasetDraftResponse,datasetDraftSummaryResponse,validateDatasetDraftPayload} from "@/lib/dataset-draft-contract";

const privateHeaders={"Cache-Control":"private, no-store"};

export async function GET(request:Request){
  const user=await currentUser(request);if(!user)return Response.json({error:"Authentication required"},{status:401});
  return Response.json({drafts:(await listDatasetDrafts(user.user_id)).map(datasetDraftSummaryResponse)},{headers:privateHeaders});
}

export async function POST(request:Request){
  const csrf=assertSameOrigin(request);if(csrf)return csrf;
  const user=await currentUser(request);if(!user)return Response.json({error:"Authentication required"},{status:401});
  const length=Number(request.headers.get("content-length")||0);if(length>DATASET_DRAFT_BODY_LIMIT)return Response.json({error:"The reviewed contract is too large"},{status:413});
  let body:unknown;try{const text=await request.text();if(new TextEncoder().encode(text).byteLength>DATASET_DRAFT_BODY_LIMIT)return Response.json({error:"The reviewed contract is too large"},{status:413});body=JSON.parse(text);}catch{return Response.json({error:"Request body must be valid JSON"},{status:400});}
  const validated=validateDatasetDraftPayload(body);if(!validated.ok)return Response.json({error:validated.error,issues:validated.issues},{status:400});
  const draft=await createDatasetDraft(user.user_id,validated.contract);
  await audit("dataset_draft.created",user.user_id,draft.dataset_draft_id,{schemaVersion:draft.schema_version,sourceKind:draft.source_kind});
  return Response.json({draft:datasetDraftResponse(draft)},{status:201,headers:privateHeaders});
}
