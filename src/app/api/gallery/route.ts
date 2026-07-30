import {workspaceGallery} from "@/lib/dive-provisioning";
import {currentUser} from "@/lib/auth";
export const dynamic="force-dynamic";
export async function GET(request:Request){
  const user=await currentUser(request);if(!user)return Response.json({error:"Authentication required"},{status:401});
  try{return Response.json({viewer:{kind:"editor",email:user.email},dives:await workspaceGallery(user)},{headers:{"Cache-Control":"private, no-store"}});}catch(error){console.error("gallery provisioning failed",error);return Response.json({error:"Live Dives are temporarily unavailable."},{status:503,headers:{"Retry-After":"60"}});}
}
