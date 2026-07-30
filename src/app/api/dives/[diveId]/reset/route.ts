import {z} from "zod";
import {currentUser} from "@/lib/auth";
import {audit,getWorkspace,workspaceOwnsDive} from "@/lib/app-db";
import {assertSameOrigin} from "@/lib/csrf";
import {readDiveSnapshot,resetDiveToSource} from "@/lib/duckdive-runtime";

const bodySchema=z.object({expectedVersion:z.number().int().positive()});

export async function POST(request:Request,{params}:{params:Promise<{diveId:string}>}){
  const csrf=assertSameOrigin(request);if(csrf)return csrf;
  const user=await currentUser(request),{diveId}=await params;if(!user)return Response.json({error:"Authentication required"},{status:401});
  const workspace=await getWorkspace(user.user_id);if(!workspace||!workspaceOwnsDive(workspace,diveId))return Response.json({error:"Access denied"},{status:403});
  const parsed=bodySchema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return Response.json({error:"A current version is required"},{status:400});
  const starterKey=Object.entries(workspace.dive_ids).find(([,id])=>id===diveId)?.[0],sourceDiveId=starterKey?workspace.source_dive_ids[starterKey]:undefined;
  if(!sourceDiveId)return Response.json({error:"Starter source unavailable"},{status:409});
  const current=await readDiveSnapshot(diveId,workspace.motherduck_username);if(current.version!==parsed.data.expectedVersion)return Response.json({error:"This Dive changed before reset. Refresh and try again.",code:"stale_version",version:current.version},{status:409});
  try{
    const result=await resetDiveToSource(diveId,sourceDiveId,workspace.motherduck_username);
    await audit(result.noChange?"duckdive.reset.no_change":"duckdive.reset",user.user_id,diveId,{beforeVersion:result.before.version,afterVersion:result.after.version,starterKey});
    return Response.json({beforeVersion:result.before.version,afterVersion:result.after.version,noChange:result.noChange});
  }catch(error){console.error("Dive reset failed",error);return Response.json({error:"The starter could not be restored"},{status:502});}
}
