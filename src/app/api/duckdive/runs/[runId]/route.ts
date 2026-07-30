import {z} from "zod";
import {currentUser} from "@/lib/auth";
import {abortDuckDiveRun,getDuckDiveRun} from "@/lib/duckdive-db";
import {audit} from "@/lib/app-db";
import {assertSameOrigin} from "@/lib/csrf";

const idSchema=z.string().uuid();

export async function GET(request:Request,{params}:{params:Promise<{runId:string}>}){
  const user=await currentUser(request);if(!user)return Response.json({error:"Authentication required"},{status:401});
  const parsed=idSchema.safeParse((await params).runId);if(!parsed.success)return Response.json({error:"Invalid run"},{status:400});
  const run=await getDuckDiveRun(parsed.data,user.user_id);if(!run)return Response.json({error:"Run not found"},{status:404});
  return Response.json({run:{runId:run.run_id,diveId:run.dive_id,status:run.status,beforeVersion:run.before_version,afterVersion:run.after_version,sourceChanged:Boolean(run.source_hash_after&&run.source_hash_after!==run.source_hash_before),summary:run.assistant_summary,errorCode:run.error_code,durationMs:run.duration_ms,inputTokens:Number(run.input_tokens),outputTokens:Number(run.output_tokens),createdAt:run.created_at,finishedAt:run.finished_at}},{headers:{"Cache-Control":"private, no-store"}});
}

export async function DELETE(request:Request,{params}:{params:Promise<{runId:string}>}){
  const csrf=assertSameOrigin(request);if(csrf)return csrf;
  const user=await currentUser(request);if(!user)return Response.json({error:"Authentication required"},{status:401});
  const parsed=idSchema.safeParse((await params).runId);if(!parsed.success)return Response.json({error:"Invalid run"},{status:400});
  const run=await abortDuckDiveRun(parsed.data,user.user_id);if(!run)return Response.json({error:"No active run"},{status:404});
  await audit("duckdive.aborted",user.user_id,run.dive_id,{runId:run.run_id});
  return Response.json({ok:true});
}
