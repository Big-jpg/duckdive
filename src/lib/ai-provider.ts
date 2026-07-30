import {openai} from "@ai-sdk/openai";
import {anthropic} from "@ai-sdk/anthropic";
import {gateway} from "ai";

export function aiModel(provider?:string){
  const selected=provider||process.env.AI_DEFAULT_PROVIDER||(process.env.AI_GATEWAY_API_KEY||process.env.VERCEL_OIDC_TOKEN?"gateway":process.env.OPENAI_API_KEY?"openai":process.env.ANTHROPIC_API_KEY?"anthropic":"gateway");
  if(selected==="anthropic"){if(!process.env.ANTHROPIC_API_KEY)throw new Error("ANTHROPIC_API_KEY is not configured");return anthropic(process.env.AI_MODEL_ANTHROPIC||"claude-sonnet-4-6");}
  if(selected==="gateway"){if(!process.env.AI_GATEWAY_API_KEY&&!process.env.VERCEL_OIDC_TOKEN)throw new Error("AI Gateway authentication is not configured");return gateway(process.env.AI_MODEL_GATEWAY||"openai/gpt-5.4");}
  if(!process.env.OPENAI_API_KEY)throw new Error("OPENAI_API_KEY is not configured");
  return openai(process.env.AI_MODEL_OPENAI||"gpt-5.4");
}
