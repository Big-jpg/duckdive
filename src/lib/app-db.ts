import {randomUUID} from "node:crypto";
import {database} from "./db";
import {shareSlug} from "./dive-share";
import {buildWorkspaceDives,type WorkspaceDive} from "./workspace-dives";

export type AppUser={user_id:string;email:string;auth_subject:string|null;role:"member"|"admin";status:"active"|"revoked";invited_at:string|null;last_login_at:string|null;revoked_at:string|null};
export type Workspace={workspace_id:string;user_id:string;motherduck_username:string;dive_ids:Record<string,string>;source_dive_ids:Record<string,string>};
export type OwnedWorkspaceDive=WorkspaceDive&{user_id:string;motherduck_username:string};
export type DiveShare={share_id:string;workspace_id:string;created_by:string;dive_id:string;starter_key:string;slug:string;title:string;description:string;status:"active"|"revoked";expires_at:string|null;view_count:number;last_viewed_at:string|null;created_at:string;updated_at:string;revoked_at:string|null};
export type PublicDiveShare=DiveShare&{motherduck_username:string};

export async function findActiveAllowlistedUserByEmail(email:string){const sql=database();try{const [row]=await sql<AppUser[]>`SELECT user_id,email,auth_subject,role,status,invited_at,last_login_at,revoked_at FROM app.app_user WHERE lower(email)=lower(${email}) AND status='active'`;return row||null;}finally{await sql.end();}}
export async function linkActiveAllowlistedUser(authSubject:string,email:string){
  const sql=database();try{
    const [row]=await sql<AppUser[]>`UPDATE app.app_user SET auth_subject=coalesce(auth_subject,${authSubject}),last_login_at=CASE WHEN last_login_at IS NULL OR last_login_at<now()-INTERVAL '15 minutes' THEN now() ELSE last_login_at END,updated_at=now()
      WHERE lower(email)=lower(${email}) AND status='active' AND (auth_subject IS NULL OR auth_subject=${authSubject})
      RETURNING user_id,email,auth_subject,role,status,invited_at,last_login_at,revoked_at`;
    return row||null;
  }catch(error){if((error as {code?:string}).code==="23505")return null;throw error;}finally{await sql.end();}
}
export async function addAccess(email:string,role:"member"|"admin"="member"){
  const sql=database();try{const [row]=await sql<AppUser[]>`INSERT INTO app.app_user(email,password_hash,role,status,invited_at) VALUES(lower(${email}),NULL,${role},'active',now())
    ON CONFLICT((lower(email))) DO UPDATE SET role=excluded.role,status='active',revoked_at=NULL,invited_at=coalesce(app.app_user.invited_at,now()),updated_at=now()
    RETURNING user_id,email,auth_subject,role,status,invited_at,last_login_at,revoked_at`;return row;}finally{await sql.end();}
}
export async function revokeAccess(email:string){const sql=database();try{const [row]=await sql<AppUser[]>`UPDATE app.app_user SET status='revoked',revoked_at=now(),updated_at=now() WHERE lower(email)=lower(${email}) RETURNING user_id,email,auth_subject,role,status,invited_at,last_login_at,revoked_at`;return row||null;}finally{await sql.end();}}
export async function listAccess(){const sql=database();try{return await sql<AppUser[]>`SELECT user_id,email,auth_subject,role,status,invited_at,last_login_at,revoked_at FROM app.app_user ORDER BY lower(email)`;}finally{await sql.end();}}
export async function claimAuthWebhook(eventId:string,eventType:string){
  const sql=database();try{
    const [claimed]=await sql<{status:string}[]>`INSERT INTO app.auth_webhook_event(event_id,event_type) VALUES(${eventId}::uuid,${eventType})
      ON CONFLICT(event_id) DO UPDATE SET status='processing',attempt_count=app.auth_webhook_event.attempt_count+1,last_error_code=NULL,updated_at=now()
      WHERE app.auth_webhook_event.status='failed' OR app.auth_webhook_event.updated_at<now()-INTERVAL '30 seconds' RETURNING status`;
    if(claimed)return {state:"claimed" as const,response:null};
    const [existing]=await sql<{status:string;response_json:Record<string,unknown>|null}[]>`SELECT status,response_json FROM app.auth_webhook_event WHERE event_id=${eventId}::uuid`;
    return existing?.status==="succeeded"?{state:"succeeded" as const,response:existing.response_json}:{state:"busy" as const,response:null};
  }finally{await sql.end();}
}
export async function finishAuthWebhook(eventId:string,status:"succeeded"|"failed",errorCode:string|null=null,response:Record<string,unknown>|null=null){const sql=database();try{await sql`UPDATE app.auth_webhook_event SET status=${status},last_error_code=${errorCode},response_json=${response?sql.json(response as never):null},updated_at=now() WHERE event_id=${eventId}::uuid`;}finally{await sql.end();}}
export async function getWorkspace(userId:string){const sql=database();try{const [row]=await sql<Workspace[]>`SELECT workspace_id,user_id,motherduck_username,dive_ids,source_dive_ids FROM app.workspace WHERE user_id=${userId}::uuid`;return row;}finally{await sql.end();}}
export async function getWorkspaceDives(workspaceId:string){const sql=database();try{return await sql<WorkspaceDive[]>`SELECT workspace_id,dataset_key,starter_key,dive_id,source_dive_id FROM app.workspace_dive WHERE workspace_id=${workspaceId}::uuid ORDER BY dataset_key,starter_key`;}finally{await sql.end();}}
export async function getOwnedWorkspaceDive(userId:string,diveId:string){const sql=database();try{const [row]=await sql<OwnedWorkspaceDive[]>`SELECT wd.workspace_id,w.user_id,w.motherduck_username,wd.dataset_key,wd.starter_key,wd.dive_id,wd.source_dive_id FROM app.workspace_dive wd JOIN app.workspace w USING(workspace_id) WHERE w.user_id=${userId}::uuid AND wd.dive_id=${diveId}`;return row||null;}finally{await sql.end();}}
export async function saveWorkspace(userId:string,username:string,diveIds:Record<string,string>,sourceDiveIds:Record<string,string>){
  const mappings=buildWorkspaceDives(diveIds,sourceDiveIds),sql=database();
  try{return await sql.begin(async tx=>{
    const [row]=await tx<Workspace[]>`INSERT INTO app.workspace(user_id,motherduck_username,dive_ids,source_dive_ids) VALUES(${userId}::uuid,${username},${tx.json(diveIds)},${tx.json(sourceDiveIds)}) ON CONFLICT(user_id) DO UPDATE SET motherduck_username=excluded.motherduck_username,dive_ids=excluded.dive_ids,source_dive_ids=excluded.source_dive_ids,updated_at=now() RETURNING workspace_id,user_id,motherduck_username,dive_ids,source_dive_ids`;
    for(const mapping of mappings)await tx`INSERT INTO app.workspace_dive(workspace_id,dataset_key,starter_key,dive_id,source_dive_id) VALUES(${row.workspace_id}::uuid,${mapping.dataset_key},${mapping.starter_key},${mapping.dive_id},${mapping.source_dive_id}) ON CONFLICT(workspace_id,starter_key) DO UPDATE SET dataset_key=excluded.dataset_key,dive_id=excluded.dive_id,source_dive_id=excluded.source_dive_id,updated_at=now()`;
    return row;
  });}finally{await sql.end();}
}
export async function getActiveDiveShare(workspaceId:string,diveId:string){const sql=database();try{const [row]=await sql<DiveShare[]>`SELECT share_id,workspace_id,created_by,dive_id,starter_key,slug,title,description,status,expires_at,view_count,last_viewed_at,created_at,updated_at,revoked_at FROM app.dive_share WHERE workspace_id=${workspaceId}::uuid AND dive_id=${diveId} AND status='active' AND (expires_at IS NULL OR expires_at>now())`;return row||null;}finally{await sql.end();}}
export async function createDiveShare(workspaceId:string,userId:string,diveId:string,starterKey:string,title:string,description:string){
  const sql=database();try{
    for(let attempt=0;attempt<3;attempt++){
      try{const slug=shareSlug(starterKey),[row]=await sql<DiveShare[]>`INSERT INTO app.dive_share(workspace_id,created_by,dive_id,starter_key,slug,title,description) VALUES(${workspaceId}::uuid,${userId}::uuid,${diveId},${starterKey},${slug},${title},${description}) ON CONFLICT(workspace_id,dive_id) WHERE status='active' DO UPDATE SET title=excluded.title,description=excluded.description,updated_at=now() RETURNING share_id,workspace_id,created_by,dive_id,starter_key,slug,title,description,status,expires_at,view_count,last_viewed_at,created_at,updated_at,revoked_at`;return row;}catch(error){if((error as {code?:string}).code!=="23505"||attempt===2)throw error;}
    }
    throw new Error("Could not allocate a share slug");
  }finally{await sql.end();}
}
export async function revokeDiveShare(workspaceId:string,diveId:string){const sql=database();try{const [row]=await sql<DiveShare[]>`UPDATE app.dive_share SET status='revoked',revoked_at=now(),updated_at=now() WHERE workspace_id=${workspaceId}::uuid AND dive_id=${diveId} AND status='active' RETURNING share_id,workspace_id,created_by,dive_id,starter_key,slug,title,description,status,expires_at,view_count,last_viewed_at,created_at,updated_at,revoked_at`;return row||null;}finally{await sql.end();}}
export async function findPublicDiveShare(slug:string){const sql=database();try{const [row]=await sql<PublicDiveShare[]>`SELECT s.share_id,s.workspace_id,s.created_by,s.dive_id,s.starter_key,s.slug,s.title,s.description,s.status,s.expires_at,s.view_count,s.last_viewed_at,s.created_at,s.updated_at,s.revoked_at,w.motherduck_username FROM app.dive_share s JOIN app.workspace w ON w.workspace_id=s.workspace_id WHERE s.slug=${slug} AND s.status='active' AND (s.expires_at IS NULL OR s.expires_at>now())`;return row||null;}finally{await sql.end();}}
export async function recordDiveShareView(shareId:string){const sql=database();try{await sql`UPDATE app.dive_share SET view_count=view_count+1,last_viewed_at=now(),updated_at=now() WHERE share_id=${shareId}::uuid AND status='active'`;}finally{await sql.end();}}
export async function consumePublicShareQuota(shareId:string,keyHash:string,perVisitorLimit:number,globalLimit:number){const sql=database();try{return await sql.begin(async tx=>{await tx`SELECT pg_advisory_xact_lock(hashtext('duckdive:share:global'))`;await tx`DELETE FROM app.public_share_request WHERE occurred_at<now()-INTERVAL '24 hours'`;const [counts]=await tx<{visitor_count:number;global_count:number}[]>`SELECT count(*) FILTER(WHERE key_hash=${keyHash})::int visitor_count,count(*)::int global_count FROM app.public_share_request WHERE occurred_at>=now()-INTERVAL '1 hour'`;if(Number(counts.visitor_count)>=perVisitorLimit||Number(counts.global_count)>=globalLimit)return false;await tx`INSERT INTO app.public_share_request(share_id,key_hash) VALUES(${shareId}::uuid,${keyHash})`;return true;});}finally{await sql.end();}}
export async function getSetting(key:string){const sql=database();try{const [row]=await sql<{value:string}[]>`SELECT value FROM app.setting WHERE key=${key}`;return row?.value||null;}finally{await sql.end();}}
export async function setSetting(key:string,value:string){const sql=database();try{await sql`INSERT INTO app.setting(key,value) VALUES(${key},${value}) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=now()`;}finally{await sql.end();}}
export async function consumeAiQuota(userId:string,userLimit:number,globalLimit:number){const sql=database();try{return await sql.begin(async tx=>{await tx`SELECT pg_advisory_xact_lock(hashtext('duckdive:ai:global'))`;await tx`DELETE FROM app.ai_request WHERE occurred_at<now()-INTERVAL '24 hours'`;const [counts]=await tx<{user_count:number;global_count:number}[]>`SELECT count(*) FILTER(WHERE user_id=${userId}::uuid)::int user_count,count(*)::int global_count FROM app.ai_request WHERE occurred_at>=now()-INTERVAL '1 hour'`;if(Number(counts.user_count)>=userLimit||Number(counts.global_count)>=globalLimit)return false;await tx`INSERT INTO app.ai_request(user_id) VALUES(${userId}::uuid)`;return true;});}finally{await sql.end();}}
export async function consumeLoginQuota(keyHash:string,limit=10){const sql=database();try{return await sql.begin(async tx=>{await tx`DELETE FROM app.auth_attempt WHERE occurred_at<now()-INTERVAL '24 hours'`;const [{count}]=await tx<{count:number}[]>`SELECT count(*)::int count FROM app.auth_attempt WHERE key_hash=${keyHash} AND occurred_at>=now()-INTERVAL '15 minutes'`;if(Number(count)>=limit)return false;await tx`INSERT INTO app.auth_attempt(key_hash) VALUES(${keyHash})`;return true;});}finally{await sql.end();}}
export async function authorizeMagicLinkRequest(email:string,keyHash:string,limit=10){
  const sql=database();try{
    const [result]=await sql<{quota_allowed:boolean;allowlisted:boolean}[]>`
      WITH recent AS (
        SELECT count(*)::int AS count FROM app.auth_attempt
        WHERE key_hash=${keyHash} AND occurred_at>=now()-INTERVAL '15 minutes'
      ), inserted AS (
        INSERT INTO app.auth_attempt(key_hash)
        SELECT ${keyHash} WHERE (SELECT count FROM recent)<${limit}
        RETURNING 1
      ), pruned AS (
        DELETE FROM app.auth_attempt WHERE occurred_at<now()-INTERVAL '24 hours'
      )
      SELECT EXISTS(SELECT 1 FROM inserted) AS quota_allowed,
        EXISTS(SELECT 1 FROM app.app_user WHERE lower(email)=lower(${email}) AND status='active') AS allowlisted`;
    return {quotaAllowed:Boolean(result?.quota_allowed),allowlisted:Boolean(result?.allowlisted)};
  }finally{await sql.end();}
}
export async function audit(eventType:string,userId:string|null,targetId:string|null|undefined,details:Record<string,unknown>={}){const sql=database();try{await sql`INSERT INTO app.audit_event(user_id,event_type,target_id,details) VALUES(${userId}::uuid,${eventType},${targetId??null},${sql.json(details as never)})`;}finally{await sql.end();}}
export async function ensureChat(workspaceId:string,chatId:string|undefined,diveId:string,title:string){const sql=database();try{const id=chatId||randomUUID();const [row]=await sql<{chat_session_id:string}[]>`INSERT INTO app.chat_session(chat_session_id,workspace_id,active_dive_id,title) VALUES(${id}::uuid,${workspaceId}::uuid,${diveId},${title.slice(0,100)||"New chat"}) ON CONFLICT(chat_session_id) DO UPDATE SET updated_at=now() WHERE app.chat_session.workspace_id=${workspaceId}::uuid AND app.chat_session.active_dive_id=${diveId} RETURNING chat_session_id`;if(!row)throw new Error("Chat session is not owned by this workspace and Dive");return row.chat_session_id;}finally{await sql.end();}}
export async function saveMessage(chatId:string,id:string,role:"user"|"assistant",content:string,parts:unknown=null){const sql=database();try{await sql`INSERT INTO app.chat_message(message_id,chat_session_id,role,content,parts_json) VALUES(${id},${chatId}::uuid,${role},${content},${parts?sql.json(parts as never):null}) ON CONFLICT(message_id) DO NOTHING`;await sql`UPDATE app.chat_session SET updated_at=now() WHERE chat_session_id=${chatId}::uuid`;}finally{await sql.end();}}
