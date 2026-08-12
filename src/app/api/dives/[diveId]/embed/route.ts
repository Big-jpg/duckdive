import {currentUser} from "@/lib/auth";
import {getOwnedWorkspaceDive,audit} from "@/lib/app-db";
import {datasetContextForWorkspaceDiveRecord} from "@/lib/datasets";
import {createEmbedSession} from "@/lib/motherduck-api";

export async function GET(request:Request,{params}:{params:Promise<{diveId:string}>}){
  const user=await currentUser(request);if(!user)return Response.json({error:"Authentication required"},{status:401});
  const {diveId}=await params,workspaceDive=await getOwnedWorkspaceDive(user.user_id,diveId);if(!workspaceDive)return Response.json({error:"Access denied"},{status:403});
  const context=datasetContextForWorkspaceDiveRecord(workspaceDive);if(!context)return Response.json({error:"Dataset unavailable"},{status:400});
  try{
    const session=await createEmbedSession(diveId,workspaceDive.motherduck_username,[{url:context.runtime.motherduckShareUrl,alias:context.runtime.motherduckDatabase}]);
    await audit("embed.created",user.user_id,diveId);return Response.json({session},{headers:{"Cache-Control":"private, no-store"}});
  }catch(error){console.error("embed session failed",error);return Response.json({error:"Could not create embed session"},{status:502});}
}
