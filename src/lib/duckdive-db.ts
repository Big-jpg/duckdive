import type {UIMessage} from "ai";
import {database} from "./db";

export type DuckDiveRunStatus="running"|"clarification"|"applied"|"no_change"|"failed"|"aborted";
export type DuckDiveRun={
  run_id:string;workspace_id:string;user_id:string;chat_session_id:string;dive_id:string;request_text:string;
  status:DuckDiveRunStatus;before_version:number;after_version:number|null;source_hash_before:string;source_hash_after:string|null;
  model:string;assistant_summary:string|null;error_code:string|null;input_tokens:number;output_tokens:number;duration_ms:number|null;
  created_at:string;finished_at:string|null;
};

export class DuckDiveBusyError extends Error{constructor(){super("A DuckDive is already running for this view");this.name="DuckDiveBusyError";}}

export async function startDuckDiveRun(input:{runId:string;workspaceId:string;userId:string;chatId:string;diveId:string;requestText:string;beforeVersion:number;beforeHash:string;model:string}){
  const sql=database();try{return await sql.begin(async tx=>{
    await tx`SELECT pg_advisory_xact_lock(hashtext(${`duckdive:run:${input.workspaceId}:${input.diveId}`}))`;
    await tx`UPDATE app.duckdive_run SET status='failed',error_code='stale_run',finished_at=now(),duration_ms=round(extract(epoch FROM (now()-created_at))*1000)::int
      WHERE workspace_id=${input.workspaceId}::uuid AND dive_id=${input.diveId} AND status='running' AND created_at<now()-INTERVAL '6 minutes'`;
    const [active]=await tx`SELECT 1 FROM app.duckdive_run WHERE workspace_id=${input.workspaceId}::uuid AND dive_id=${input.diveId} AND status='running'`;
    if(active)throw new DuckDiveBusyError();
    const [run]=await tx<DuckDiveRun[]>`INSERT INTO app.duckdive_run(run_id,workspace_id,user_id,chat_session_id,dive_id,request_text,before_version,source_hash_before,model)
      VALUES(${input.runId}::uuid,${input.workspaceId}::uuid,${input.userId}::uuid,${input.chatId}::uuid,${input.diveId},${input.requestText},${input.beforeVersion},${input.beforeHash},${input.model}) RETURNING *`;
    return run;
  });}finally{await sql.end();}
}

export async function finishDuckDiveRun(runId:string,input:{status:Exclude<DuckDiveRunStatus,"running">;afterVersion?:number;afterHash?:string;summary?:string;errorCode?:string;inputTokens?:number;outputTokens?:number}){
  const sql=database();try{
    const [run]=await sql<DuckDiveRun[]>`UPDATE app.duckdive_run SET status=${input.status},after_version=${input.afterVersion??null},source_hash_after=${input.afterHash??null},assistant_summary=${input.summary?.slice(0,2000)||null},error_code=${input.errorCode||null},input_tokens=${input.inputTokens||0},output_tokens=${input.outputTokens||0},duration_ms=round(extract(epoch FROM (now()-created_at))*1000)::int,finished_at=now()
      WHERE run_id=${runId}::uuid AND (status='running' OR (status='aborted' AND ${input.status}='applied' AND ${input.afterVersion??null}::int IS NOT NULL)) RETURNING *`;
    return run||null;
  }finally{await sql.end();}
}

export async function abortDuckDiveRun(runId:string,userId:string){
  const sql=database();try{const [run]=await sql<DuckDiveRun[]>`UPDATE app.duckdive_run SET status='aborted',error_code='user_aborted',duration_ms=round(extract(epoch FROM (now()-created_at))*1000)::int,finished_at=now()
    WHERE run_id=${runId}::uuid AND user_id=${userId}::uuid AND status='running' RETURNING *`;return run||null;}finally{await sql.end();}
}

export async function duckDiveRunIsActive(runId:string){const sql=database();try{const [row]=await sql<{active:boolean}[]>`SELECT status='running' AS active FROM app.duckdive_run WHERE run_id=${runId}::uuid`;return Boolean(row?.active);}finally{await sql.end();}}

export async function getDuckDiveRun(runId:string,userId:string){const sql=database();try{const [run]=await sql<DuckDiveRun[]>`SELECT * FROM app.duckdive_run WHERE run_id=${runId}::uuid AND user_id=${userId}::uuid`;return run||null;}finally{await sql.end();}}

function textOf(message:UIMessage){return message.parts.filter((part):part is {type:"text";text:string}=>part.type==="text").map(part=>part.text).join("");}
function compactParts(message:UIMessage){return message.parts.map(part=>{
  if(part.type==="text")return part;
  const value=part as unknown as Record<string,unknown>;
  if(!String(part.type).startsWith("tool-"))return {type:part.type};
  const output=value.output&&typeof value.output==="object"?value.output as Record<string,unknown>:null;
  return {type:part.type,toolCallId:value.toolCallId,state:value.state,output:output?{saved:output.saved,beforeVersion:output.beforeVersion,afterVersion:output.afterVersion,rows:output.rows}:undefined};
});}

export async function saveChatMessages(chatId:string,messages:UIMessage[]){
  const sql=database();try{for(const message of messages){
    if(message.role!=="user"&&message.role!=="assistant")continue;
    await sql`INSERT INTO app.chat_message(message_id,chat_session_id,role,content,parts_json) VALUES(${message.id},${chatId}::uuid,${message.role},${textOf(message)},${sql.json(compactParts(message) as never)})
      ON CONFLICT(message_id) DO UPDATE SET content=excluded.content,parts_json=excluded.parts_json`;
  }await sql`UPDATE app.chat_session SET updated_at=now() WHERE chat_session_id=${chatId}::uuid`;}finally{await sql.end();}
}
