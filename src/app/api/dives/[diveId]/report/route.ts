import {currentUser} from "@/lib/auth";
import {getOwnedWorkspaceDive} from "@/lib/app-db";
import {readDiveSnapshot} from "@/lib/duckdive-runtime";
import {datasetContextForWorkspaceDiveRecord} from "@/lib/datasets";
import {getDiveReportVersion,reportMetadataSchemaUnavailable,saveDiveReportVersion,starterReportVersion} from "@/lib/duckdive-report-db";

export async function GET(request:Request,{params}:{params:Promise<{diveId:string}>}){
  const user=await currentUser(request),{diveId}=await params;if(!user)return Response.json({error:"Authentication required"},{status:401});
  const owned=await getOwnedWorkspaceDive(user.user_id,diveId);if(!owned)return Response.json({error:"Access denied"},{status:403});
  const context=datasetContextForWorkspaceDiveRecord(owned),starter=context?.dataset.starters.find(item=>item.key===owned.starter_key);if(!context||!starter)return Response.json({error:"Report unavailable"},{status:404});
  try{
    const [snapshot,source]=await Promise.all([readDiveSnapshot(diveId,owned.motherduck_username),readDiveSnapshot(owned.source_dive_id,owned.motherduck_username)]),matchesStarter=snapshot.hash===source.hash;
    const fallback=matchesStarter?starterReportVersion({workspaceId:owned.workspace_id,diveId,version:snapshot.version,sourceHash:snapshot.hash,title:starter.title,description:starter.description,policy:context.dataset.reportPolicy}):null;
    try{
      const current=await getDiveReportVersion(user.user_id,diveId,snapshot.version);if(current)return Response.json({report:current,persisted:true},{headers:{"Cache-Control":"private, no-store"}});
      if(!fallback)return Response.json({report:null,reason:"legacy-version"},{headers:{"Cache-Control":"private, no-store"}});
      const report=await saveDiveReportVersion({workspaceId:owned.workspace_id,diveId,version:snapshot.version,sourceHash:snapshot.hash,purpose:fallback.purpose,manifest:fallback.manifest});return Response.json({report,persisted:true},{headers:{"Cache-Control":"private, no-store"}});
    }catch(error){if(reportMetadataSchemaUnavailable(error))return Response.json({report:fallback,persisted:false,reason:fallback?"schema-unavailable":"legacy-version"},{headers:{"Cache-Control":"private, no-store"}});throw error;}
  }catch(error){console.error("report loading unavailable",error);return Response.json({error:"Report unavailable"},{status:503});}
}
