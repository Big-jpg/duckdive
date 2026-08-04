import {z} from "zod";
import {currentUser} from "@/lib/auth";
import {assertSameOrigin} from "@/lib/csrf";
import {MotherDuckOperationalRuntimeAdapter} from "@/lib/motherduck-operational-runtime";
import {beginOperationalRuntimeBinding,degradeOperationalRuntimeBinding,finalizeOperationalRuntimeBinding,OperationalRuntimeConflictError,revokeOperationalRuntimeBinding} from "@/lib/operational-runtime-db";
import {reconcileRuntimeColumns} from "@/lib/operational-runtime-policy";
import {getOperationalDataset} from "@/lib/operational-datasets-db";

const idSchema=z.string().uuid(),bodySchema=z.discriminatedUnion("action",[
  z.object({action:z.literal("bind"),acknowledgedVarianceCodes:z.array(z.string().max(300)).max(100).default([])}).strict(),
  z.object({action:z.literal("revoke")}).strict(),
]),privateHeaders={"Cache-Control":"private, no-store"};

export async function POST(request:Request,{params}:{params:Promise<{datasetId:string}>}){
  const csrf=assertSameOrigin(request);if(csrf)return csrf;
  const user=await currentUser(request);if(!user)return Response.json({error:"Authentication required"},{status:401,headers:privateHeaders});
  const datasetId=idSchema.safeParse((await params).datasetId),body=bodySchema.safeParse(await request.json().catch(()=>null));
  if(!datasetId.success||!body.success)return Response.json({error:"Invalid operational runtime request"},{status:400,headers:privateHeaders});
  if(body.data.action==="revoke"){
    const binding=await revokeOperationalRuntimeBinding(user.user_id,datasetId.data);return binding?Response.json({binding},{headers:privateHeaders}):Response.json({error:"Operational dataset not found"},{status:404,headers:privateHeaders});
  }
  const dataset=await getOperationalDataset(user.user_id,datasetId.data);if(!dataset)return Response.json({error:"Operational dataset not found"},{status:404,headers:privateHeaders});
  let started=false;try{
    const binding=await beginOperationalRuntimeBinding(user.user_id,datasetId.data);if(!binding)return Response.json({error:"Operational dataset not found"},{status:404,headers:privateHeaders});started=true;
    const adapter=new MotherDuckOperationalRuntimeAdapter(),metadata=await adapter.inspect(binding.resource_reference),result=reconcileRuntimeColumns(dataset.public_contract_json,metadata,body.data.acknowledgedVarianceCodes);
    const readyBinding=await finalizeOperationalRuntimeBinding(user.user_id,datasetId.data,result);if(!readyBinding)return Response.json({error:"Operational runtime is unavailable"},{status:409,headers:privateHeaders});
    return Response.json({binding:readyBinding,reconciliation:result},{status:result.readyEligible?200:422,headers:privateHeaders});
  }catch(error){if(error instanceof OperationalRuntimeConflictError)return Response.json({error:error.message},{status:409,headers:privateHeaders});if(started)await degradeOperationalRuntimeBinding(user.user_id,datasetId.data,"inspection-failed");throw error;}
}
