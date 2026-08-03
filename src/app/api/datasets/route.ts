import {currentUser} from "@/lib/auth";
import {listWorkspaceDatasets} from "@/lib/workspace-datasets";

const privateHeaders={"Cache-Control":"private, no-store"};
export async function GET(request:Request){const user=await currentUser(request);if(!user)return Response.json({error:"Authentication required"},{status:401,headers:privateHeaders});return Response.json({datasets:await listWorkspaceDatasets(user.user_id)},{headers:privateHeaders});}
