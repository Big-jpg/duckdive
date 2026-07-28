import {openai} from "@ai-sdk/openai";
import {anthropic} from "@ai-sdk/anthropic";
import {gateway} from "ai";

export function aiModel(provider?:string){
  if(provider==="anthropic"){if(!process.env.ANTHROPIC_API_KEY)throw new Error("ANTHROPIC_API_KEY is not configured");return anthropic(process.env.AI_MODEL_ANTHROPIC||"claude-sonnet-4-6");}
  if(provider==="gateway"){if(!process.env.AI_GATEWAY_API_KEY)throw new Error("AI_GATEWAY_API_KEY is not configured");return gateway(process.env.AI_MODEL_GATEWAY||"openai/gpt-5.6-sol");}
  if(!process.env.OPENAI_API_KEY)throw new Error("OPENAI_API_KEY is not configured");
  return openai(process.env.AI_MODEL_OPENAI||"gpt-5.6-sol");
}
