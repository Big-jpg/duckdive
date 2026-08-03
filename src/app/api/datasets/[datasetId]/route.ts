import {z} from "zod";
import {currentUser} from "@/lib/auth";
import type {AppUser} from "@/lib/app-db";
import {assertSameOrigin} from "@/lib/csrf";
import {getOperationalDataset,updateOperationalDatasetState} from "@/lib/operational-datasets-db";

const idSchema=z.string().uuid(),bodySchema=z.object({state:z.literal("archived")}).strict(),privateHeaders={"Cache-Control":"private, no-store"};
async function authorize(request:Request,params:Promise<{datasetId:string}>):Promise<{error:Response}|{user:AppUser;datasetId:string}>{const user=await currentUser(request);if(!user)return {error:Response.json({error:"Authentication required"},{status:401,headers:privateHeaders})};const parsed=idSchema.safeParse((await params).datasetId);if(!parsed.success)return {error:Response.json({error:"Invalid operational dataset"},{status:400,headers:privateHeaders})};return {user,datasetId:parsed.data};}

export async function GET(request:Request,{params}:{params:Promise<{datasetId:string}>}):Promise<Response>{const result=await authorize(request,params);if("error" in result)return result.error;const dataset=await getOperationalDataset(result.user.user_id,result.datasetId);return dataset?Response.json({dataset},{headers:privateHeaders}):Response.json({error:"Operational dataset not found"},{status:404,headers:privateHeaders});}
export async function PATCH(request:Request,{params}:{params:Promise<{datasetId:string}>}):Promise<Response>{const csrf=assertSameOrigin(request);if(csrf)return csrf;const result=await authorize(request,params);if("error" in result)return result.error;const parsed=bodySchema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return Response.json({error:"Only archival is available before runtime binding"},{status:400,headers:privateHeaders});const dataset=await updateOperationalDatasetState(result.user.user_id,result.datasetId,parsed.data.state);return dataset?Response.json({dataset},{headers:privateHeaders}):Response.json({error:"Operational dataset not found"},{status:404,headers:privateHeaders});}
