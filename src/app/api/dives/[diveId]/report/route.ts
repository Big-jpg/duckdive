import {currentUser} from "@/lib/auth";
import {getOwnedWorkspaceDive} from "@/lib/app-db";
import {STARTER_DIVES} from "@/lib/dive-provisioning";
import {readDiveSnapshot} from "@/lib/duckdive-runtime";
import {datasetContextForWorkspaceDiveRecord} from "@/lib/datasets";
import {ensureStarterReportVersion,getDiveReportVersion} from "@/lib/duckdive-report-db";

export async function GET(request:Request,{params}:{params:Promise<{diveId:string}>}){
  const user=await currentUser(request),{diveId}=await params;if(!user)return Response.json({error:"Authentication required"},{status:401});
  const owned=await getOwnedWorkspaceDive(user.user_id,diveId);if(!owned)return Response.json({error:"Access denied"},{status:403});
  const context=datasetContextForWorkspaceDiveRecord(owned),starter=context&&STARTER_DIVES.find(item=>item.key===owned.starter_key);if(!context||!starter)return Response.json({error:"Report unavailable"},{status:404});
  try{
    const snapshot=await readDiveSnapshot(diveId,owned.motherduck_username);
    const report=await ensureStarterReportVersion({userId:user.user_id,workspaceId:owned.workspace_id,diveId,version:snapshot.version,sourceHash:snapshot.hash,starterKey:starter.key,title:starter.title,description:starter.description,contract:context.dataset.publicContract});
    const current=await getDiveReportVersion(user.user_id,diveId,snapshot.version);
    return Response.json({report:current||report},{headers:{"Cache-Control":"private, no-store"}});
  }catch(error){console.error("report metadata unavailable",error);return Response.json({error:"Report metadata unavailable"},{status:503});}
}
