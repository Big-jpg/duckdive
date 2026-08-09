import {workspaceDivePreview} from "@/lib/dive-provisioning";
import {currentUser} from "@/lib/auth";
import {starterByKey} from "@/lib/datasets";
export const dynamic="force-dynamic";
export async function GET(request:Request){
  const user=await currentUser(request);if(!user)return Response.json({error:"Authentication required"},{status:401});
  const starter=new URL(request.url).searchParams.get("starter")?.trim()||"";
  if(!starterByKey(starter))return Response.json({error:"Report not found"},{status:404,headers:{"Cache-Control":"private, no-store"}});
  try{return Response.json({viewer:{kind:"editor",email:user.email},...await workspaceDivePreview(user,starter)},{headers:{"Cache-Control":"private, no-store"}});}catch(error){console.error("gallery provisioning failed",error);return Response.json({error:"This report is temporarily unavailable. Try again in a minute."},{status:503,headers:{"Retry-After":"60"}});}
}
