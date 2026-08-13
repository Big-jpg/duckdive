export const AI_GATEWAY_MODELS=[
  {id:"openai/gpt-5.6-sol",name:"GPT-5.6 Sol",description:"Flagship · most capable"},
  {id:"openai/gpt-5.6-terra",name:"GPT-5.6 Terra",description:"Balanced capability and cost"},
  {id:"openai/gpt-5.6-luna",name:"GPT-5.6 Luna",description:"Fast · lowest cost"},
] as const;

export type AiGatewayModelId=(typeof AI_GATEWAY_MODELS)[number]["id"];
export const DEFAULT_AI_GATEWAY_MODEL:AiGatewayModelId="openai/gpt-5.6-sol";

export function isAiGatewayModelId(value:unknown):value is AiGatewayModelId{
  return typeof value==="string"&&AI_GATEWAY_MODELS.some(model=>model.id===value);
}

export function configuredAiGatewayModel():AiGatewayModelId{
  const configured=process.env.AI_MODEL_GATEWAY||DEFAULT_AI_GATEWAY_MODEL;
  if(!isAiGatewayModelId(configured))throw new Error("AI_MODEL_GATEWAY must select an approved OpenAI GPT-5.6 model");
  return configured;
}
