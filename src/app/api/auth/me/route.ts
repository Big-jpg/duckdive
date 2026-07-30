import {currentUser} from "@/lib/auth";
export async function GET(request:Request){const user=await currentUser(request);return user?Response.json({user:{id:user.user_id,email:user.email,role:user.role}}):Response.json({error:"Authentication required"},{status:401});}
