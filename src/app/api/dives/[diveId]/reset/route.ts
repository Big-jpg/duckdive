import {z} from "zod";
import {currentUser} from "@/lib/auth";
import {audit,getOwnedWorkspaceDive} from "@/lib/app-db";
import {assertSameOrigin} from "@/lib/csrf";
import {readDiveSnapshot,resetDiveToSource} from "@/lib/duckdive-runtime";
import {STARTER_DIVES} from "@/lib/dive-provisioning";
import {reportPurposeForStarter} from "@/lib/duckdive-report";
import {saveDiveReportVersion} from "@/lib/duckdive-report-db";
import {datasetContextForWorkspaceDiveRecord} from "@/lib/datasets";

const bodySchema=z.object({expectedVersion:z.number().int().positive()});

export async function POST(request:Request,{params}:{params:Promise<{diveId:string}>}){
  const csrf=assertSameOrigin(request);if(csrf)return csrf;
  const user=await currentUser(request),{diveId}=await params;if(!user)return Response.json({error:"Authentication required"},{status:401});
  const workspaceDive=await getOwnedWorkspaceDive(user.user_id,diveId);if(!workspaceDive)return Response.json({error:"Access denied"},{status:403});
  const dataset=datasetContextForWorkspaceDiveRecord(workspaceDive);if(!dataset||!dataset.dataset.capabilities.editing)return Response.json({error:"This Dive cannot be reset"},{status:400});
  const parsed=bodySchema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return Response.json({error:"A current version is required"},{status:400});
  const starterKey=workspaceDive.starter_key,sourceDiveId=workspaceDive.source_dive_id;
  const current=await readDiveSnapshot(diveId,workspaceDive.motherduck_username);if(current.version!==parsed.data.expectedVersion)return Response.json({error:"This Dive changed before reset. Refresh and try again.",code:"stale_version",version:current.version},{status:409});
  try{
    const result=await resetDiveToSource(diveId,sourceDiveId,workspaceDive.motherduck_username);
    let report=null;
    if(!result.noChange){
      const starter=STARTER_DIVES.find(item=>item.key===starterKey);if(!starter)return Response.json({error:"Report metadata unavailable"},{status:503});
      const purpose=reportPurposeForStarter({starterKey,title:starter.title,description:starter.description,contract:dataset.dataset.publicContract});
      report=await saveDiveReportVersion({workspaceId:workspaceDive.workspace_id,diveId,version:result.after.version,sourceHash:result.after.hash,purpose,manifest:{request:"Reset report",interpretedIntent:"Restore the registered starter report",requested:{added:["Starter report restored"],changed:[],removed:[],unchanged:[]},applied:{added:["Verified starter report source"],changed:[],removed:[],unchanged:["Governed data contract"]},validations:[{id:"reset-starter",label:"Starter report was restored",status:"passed"}],version:result.after.version,generatedAt:new Date().toISOString()}});
    }
    await audit(result.noChange?"duckdive.reset.no_change":"duckdive.reset",user.user_id,diveId,{beforeVersion:result.before.version,afterVersion:result.after.version,starterKey});
    return Response.json({beforeVersion:result.before.version,afterVersion:result.after.version,noChange:result.noChange,report});
  }catch(error){console.error("Dive reset failed",error);return Response.json({error:"The starter could not be restored"},{status:502});}
}
