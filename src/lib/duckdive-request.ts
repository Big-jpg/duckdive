import {z} from "zod";
import type {UIMessage} from "ai";

export const DUCKDIVE_MAX_CHARS=4_000;
export const duckDiveRequestSchema=z.object({runId:z.uuid(),chatId:z.uuid(),activeDiveId:z.uuid(),expectedVersion:z.number().int().min(1),messages:z.array(z.custom<UIMessage>()).min(1)});

export function duckDiveMessageText(message:UIMessage){return message.parts.filter((part):part is {type:"text";text:string}=>part.type==="text").map(part=>part.text).join("");}

export function validateDuckDiveBrief(message:UIMessage){
  const text=duckDiveMessageText(message).trim();
  if(!text)return {ok:false as const,error:"Describe the change you want"};
  if(text.length>DUCKDIVE_MAX_CHARS)return {ok:false as const,error:`DuckDive briefs are limited to ${DUCKDIVE_MAX_CHARS.toLocaleString("en-AU")} characters`};
  return {ok:true as const,text};
}
