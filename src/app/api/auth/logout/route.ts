import {assertSameOrigin} from "@/lib/csrf";
import {audit} from "@/lib/app-db";
import {currentUser} from "@/lib/auth";
import {neonAuth} from "@/lib/neon-auth";

export async function POST(request:Request){
  const csrf=assertSameOrigin(request);if(csrf)return csrf;
  const user=await currentUser(request);
  const result=await neonAuth().signOut();
  if(result.error)return Response.json({error:"Sign out failed"},{status:502});
  if(user)await audit("auth.logout",user.user_id,null);
  return Response.json({ok:true});
}
