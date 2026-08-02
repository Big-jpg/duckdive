import {currentUser} from "@/lib/auth";
import {assertSameOrigin} from "@/lib/csrf";
import {workspaceEditorManifest} from "@/lib/dive-provisioning";

export async function POST(request:Request){
  const csrf=assertSameOrigin(request);if(csrf)return csrf;
  const user=await currentUser(request);if(!user)return Response.json({error:"Authentication required"},{status:401});
  try{return Response.json(await workspaceEditorManifest(user),{headers:{"Cache-Control":"private, no-store"}});}
  catch(error){console.error("editor workspace preparation failed",error);return Response.json({error:"Workspace unavailable"},{status:503});}
}
