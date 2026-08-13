import {z} from "zod";
import {currentUser} from "@/lib/auth";
import {assertSameOrigin} from "@/lib/csrf";
import {AI_GATEWAY_MODELS} from "@/lib/ai-gateway-models";
import {setAiGatewayModel} from "@/lib/ai-gateway-settings-db";

const modelSchema=z.object({model:z.enum(AI_GATEWAY_MODELS.map(model=>model.id) as [typeof AI_GATEWAY_MODELS[number]["id"],...typeof AI_GATEWAY_MODELS[number]["id"][]])});

export async function PATCH(request:Request){
  const csrf=assertSameOrigin(request);if(csrf)return csrf;
  const actor=await currentUser(request);if(actor?.role!=="admin")return Response.json({error:"Administrator access required"},{status:403});
  const parsed=modelSchema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return Response.json({error:"Choose an approved OpenAI GPT-5.6 model."},{status:400});
  const setting=await setAiGatewayModel(actor.user_id,parsed.data.model);
  return Response.json({setting},{headers:{"Cache-Control":"private, no-store"}});
}

