import {z} from "zod";
import {currentUser} from "@/lib/auth";
import {assertSameOrigin} from "@/lib/csrf";
import {MotherDuckOperationalRuntimeAdapter} from "@/lib/motherduck-operational-runtime";
import {degradeOperationalRuntimeBinding,getOperationalRuntimeContext} from "@/lib/operational-runtime-db";
import {compileOperationalQuery,OperationalRuntimePolicyError} from "@/lib/operational-runtime-policy";

const idSchema=z.string().uuid(),privateHeaders={"Cache-Control":"private, no-store"};
export async function POST(request:Request,{params}:{params:Promise<{datasetId:string}>}){
  const csrf=assertSameOrigin(request);if(csrf)return csrf;
  const user=await currentUser(request);if(!user)return Response.json({error:"Authentication required"},{status:401,headers:privateHeaders});
  const datasetId=idSchema.safeParse((await params).datasetId);if(!datasetId.success)return Response.json({error:"Invalid operational dataset"},{status:400,headers:privateHeaders});
  const context=await getOperationalRuntimeContext(user.user_id,datasetId.data);if(!context)return Response.json({error:"Operational runtime is unavailable"},{status:404,headers:privateHeaders});
  try{const compiled=compileOperationalQuery(context,await request.json().catch(()=>null)),rows=await new MotherDuckOperationalRuntimeAdapter().query(compiled);return Response.json({rows,limit:compiled.limit},{headers:privateHeaders});}
  catch(error){if(error instanceof OperationalRuntimePolicyError)return Response.json({error:error.message},{status:400,headers:privateHeaders});await degradeOperationalRuntimeBinding(user.user_id,datasetId.data,"query-failed");throw error;}
}
