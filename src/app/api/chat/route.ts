import {convertToModelMessages,stepCountIs,streamText,type UIMessage} from "ai";
import {randomUUID} from "node:crypto";
import {currentUser} from "@/lib/auth";
import {assertSameOrigin} from "@/lib/csrf";
import {consumeAiQuota,ensureChat,getWorkspace,saveMessage,workspaceOwnsDive,audit} from "@/lib/app-db";
import {motherduckMcp} from "@/lib/motherduck-access";
import {constrainedTools} from "@/lib/mcp-tools";
import {aiModel} from "@/lib/ai-provider";

const MAX_TURNS=5,MAX_STEPS=5,MAX_WORDS=100,MAX_CHARS=1000;
function textOf(message:UIMessage){return message.parts.filter((part):part is {type:"text";text:string}=>part.type==="text").map(part=>part.text).join("");}
export async function POST(request:Request){
 const csrf=assertSameOrigin(request);if(csrf)return csrf;const user=await currentUser(request);if(!user)return Response.json({error:"Authentication required"},{status:401});
 const body=await request.json() as {messages:UIMessage[];provider?:string;chatId?:string;activeDiveId?:string};
 if(!body.activeDiveId)return Response.json({error:"activeDiveId is required"},{status:400});
 const workspace=await getWorkspace(user.user_id);if(!workspace||!workspaceOwnsDive(workspace,body.activeDiveId))return Response.json({error:"Access denied"},{status:403});
 const userMessages=body.messages.filter(message=>message.role==="user");if(userMessages.length>MAX_TURNS)return Response.json({error:"Chat turn limit reached"},{status:429});
 const latest=userMessages.at(-1),latestText=latest?textOf(latest):"";if(latestText.length>MAX_CHARS||latestText.trim().split(/\s+/).length>MAX_WORDS)return Response.json({error:`Message limit is ${MAX_WORDS} words / ${MAX_CHARS} characters`},{status:400});
 if(!await consumeAiQuota(user.user_id,Number(process.env.AI_REMIX_REQUESTS_PER_HOUR||20)))return Response.json({error:"Hourly remix limit reached"},{status:429});
 const chatId=await ensureChat(workspace.workspace_id,body.chatId,body.activeDiveId,latestText);if(latest)await saveMessage(chatId,latest.id||randomUUID(),"user",latestText,latest.parts);
 const client=await motherduckMcp(workspace.motherduck_username),tools=constrainedTools(await client.tools(),body.activeDiveId);
 const result=streamText({model:aiModel(body.provider),system:`You edit exactly one MotherDuck Dive: ${body.activeDiveId}. First inspect relevant tables and current Dive content. Use read-only query for data exploration. Only edit when requested, using edit_dive_content for the active Dive. Never access, list, share, delete, or modify any other Dive or data object. State findings concisely and preserve sample-size caveats.`,messages:await convertToModelMessages(body.messages),tools,stopWhen:stepCountIs(MAX_STEPS),async onFinish({response,usage}){for(const message of response.messages){if(message.role!=="assistant")continue;const content=typeof message.content==="string"?message.content:Array.isArray(message.content)?message.content.filter((part):part is {type:"text";text:string}=>typeof part==="object"&&part.type==="text").map(part=>part.text).join(""):"";if(content)await saveMessage(chatId,randomUUID(),"assistant",content);}await audit("ai.completed",user.user_id,body.activeDiveId,{chatId,inputTokens:usage?.inputTokens||0,outputTokens:usage?.outputTokens||0});}});
 return result.toUIMessageStreamResponse({headers:{"X-Chat-Id":chatId}});
}
