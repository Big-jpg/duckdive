import {currentUser} from "@/lib/auth";
import {audit,createDiveShare,getActiveDiveShare,getWorkspace,revokeDiveShare,workspaceOwnsDive} from "@/lib/app-db";
import {assertSameOrigin} from "@/lib/csrf";
import {STARTER_DIVES} from "@/lib/dive-provisioning";

function publicUrl(request:Request,slug:string){
  const configured=process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/,"");
  return `${configured||new URL(request.url).origin}/share/${slug}`;
}

async function owned(request:Request,diveId:string){
  const user=await currentUser(request);if(!user)return {error:Response.json({error:"Authentication required"},{status:401})};
  const workspace=await getWorkspace(user.user_id);if(!workspace||!workspaceOwnsDive(workspace,diveId))return {error:Response.json({error:"Access denied"},{status:403})};
  const starter=STARTER_DIVES.find(item=>workspace.dive_ids[item.key]===diveId);if(!starter)return {error:Response.json({error:"Dive is not publishable"},{status:400})};
  return {user,workspace,starter};
}

export async function GET(request:Request,{params}:{params:Promise<{diveId:string}>}){
  const {diveId}=await params,result=await owned(request,diveId);if("error" in result)return result.error;
  const share=await getActiveDiveShare(result.workspace.workspace_id,diveId);
  return Response.json({share:share?{id:share.share_id,slug:share.slug,url:publicUrl(request,share.slug),viewCount:Number(share.view_count),createdAt:share.created_at}:null},{headers:{"Cache-Control":"private, no-store"}});
}

export async function POST(request:Request,{params}:{params:Promise<{diveId:string}>}){
  const csrf=assertSameOrigin(request);if(csrf)return csrf;
  const {diveId}=await params,result=await owned(request,diveId);if("error" in result)return result.error;
  const share=await createDiveShare(result.workspace,result.user.user_id,diveId,result.starter.key,result.starter.title,result.starter.description);
  await audit("dive.share.published",result.user.user_id,share.share_id,{diveId,slug:share.slug});
  return Response.json({share:{id:share.share_id,slug:share.slug,url:publicUrl(request,share.slug),viewCount:Number(share.view_count),createdAt:share.created_at}},{status:201,headers:{"Cache-Control":"private, no-store"}});
}

export async function DELETE(request:Request,{params}:{params:Promise<{diveId:string}>}){
  const csrf=assertSameOrigin(request);if(csrf)return csrf;
  const {diveId}=await params,result=await owned(request,diveId);if("error" in result)return result.error;
  const share=await revokeDiveShare(result.workspace.workspace_id,diveId);if(!share)return Response.json({error:"No active share link"},{status:404});
  await audit("dive.share.revoked",result.user.user_id,share.share_id,{diveId,slug:share.slug});
  return Response.json({ok:true});
}
