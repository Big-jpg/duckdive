import {database} from "./db";
import type {AppUser} from "./app-db";

export type AdminOverview={
  active_users:number;revoked_users:number;linked_users:number;ai_requests_hour:number;ai_requests_day:number;
  login_attempts_15m:number;public_share_loads_hour:number;active_shares:number;share_views:number;chats_day:number;audit_events_day:number;
};
export type AdminUser=AppUser&{ai_requests_hour:number;ai_requests_day:number;audit_events_day:number;chat_sessions:number;active_shares:number;share_views:number};
export type AdminAuditEvent={event_id:string;event_type:string;actor_email:string|null;target_email:string|null;occurred_at:string};
export type AdminAccessResult={user:AppUser|null;reason:"self"|"last_admin"|"not_found"|null};

export async function getAdminDashboard(){
  const sql=database();try{
    const overviewPromise=sql<AdminOverview[]>`
      SELECT
        (SELECT count(*)::int FROM app.app_user WHERE status='active') AS active_users,
        (SELECT count(*)::int FROM app.app_user WHERE status='revoked') AS revoked_users,
        (SELECT count(*)::int FROM app.app_user WHERE auth_subject IS NOT NULL) AS linked_users,
        (SELECT count(*)::int FROM app.ai_request WHERE occurred_at>=now()-INTERVAL '1 hour') AS ai_requests_hour,
        (SELECT count(*)::int FROM app.ai_request WHERE occurred_at>=now()-INTERVAL '24 hours') AS ai_requests_day,
        (SELECT count(*)::int FROM app.auth_attempt WHERE occurred_at>=now()-INTERVAL '15 minutes') AS login_attempts_15m,
        (SELECT count(*)::int FROM app.public_share_request WHERE occurred_at>=now()-INTERVAL '1 hour') AS public_share_loads_hour,
        (SELECT count(*)::int FROM app.dive_share WHERE status='active' AND (expires_at IS NULL OR expires_at>now())) AS active_shares,
        (SELECT coalesce(sum(view_count),0)::int FROM app.dive_share) AS share_views,
        (SELECT count(*)::int FROM app.chat_session WHERE created_at>=now()-INTERVAL '24 hours') AS chats_day,
        (SELECT count(*)::int FROM app.audit_event WHERE occurred_at>=now()-INTERVAL '24 hours') AS audit_events_day`;
    const usersPromise=sql<AdminUser[]>`
      WITH ai AS (
        SELECT user_id,count(*) FILTER(WHERE occurred_at>=now()-INTERVAL '1 hour')::int ai_requests_hour,
          count(*) FILTER(WHERE occurred_at>=now()-INTERVAL '24 hours')::int ai_requests_day
        FROM app.ai_request WHERE occurred_at>=now()-INTERVAL '24 hours' GROUP BY user_id
      ), events AS (
        SELECT user_id,count(*)::int audit_events_day FROM app.audit_event
        WHERE occurred_at>=now()-INTERVAL '24 hours' AND user_id IS NOT NULL GROUP BY user_id
      ), chats AS (
        SELECT w.user_id,count(c.chat_session_id)::int chat_sessions FROM app.workspace w
        LEFT JOIN app.chat_session c ON c.workspace_id=w.workspace_id GROUP BY w.user_id
      ), shares AS (
        SELECT created_by,count(*) FILTER(WHERE status='active' AND (expires_at IS NULL OR expires_at>now()))::int active_shares,
          coalesce(sum(view_count),0)::int share_views FROM app.dive_share GROUP BY created_by
      )
      SELECT u.user_id,u.email,u.auth_subject,u.role,u.status,u.invited_at,u.last_login_at,u.revoked_at,
        coalesce(ai.ai_requests_hour,0)::int ai_requests_hour,coalesce(ai.ai_requests_day,0)::int ai_requests_day,
        coalesce(events.audit_events_day,0)::int audit_events_day,coalesce(chats.chat_sessions,0)::int chat_sessions,
        coalesce(shares.active_shares,0)::int active_shares,coalesce(shares.share_views,0)::int share_views
      FROM app.app_user u LEFT JOIN ai USING(user_id) LEFT JOIN events USING(user_id) LEFT JOIN chats USING(user_id) LEFT JOIN shares ON shares.created_by=u.user_id
      ORDER BY CASE WHEN u.status='active' THEN 0 ELSE 1 END,lower(u.email)`;
    const auditPromise=sql<AdminAuditEvent[]>`
      SELECT a.event_id::text,a.event_type,actor.email actor_email,target.email target_email,a.occurred_at
      FROM app.audit_event a LEFT JOIN app.app_user actor ON actor.user_id=a.user_id
      LEFT JOIN app.app_user target ON target.user_id::text=a.target_id
      ORDER BY a.occurred_at DESC LIMIT 40`;
    const [overviewRows,users,audit]=await Promise.all([overviewPromise,usersPromise,auditPromise]);
    return {overview:overviewRows[0],users,audit};
  }finally{await sql.end();}
}

export async function adminUpsertAccess(actorId:string,email:string,role:"member"|"admin"):Promise<AdminAccessResult>{
  const sql=database();try{return await sql.begin(async tx=>{
    await tx`SELECT pg_advisory_xact_lock(hashtext('duckdive:admin:access'))`;
    const [existing]=await tx<AppUser[]>`SELECT user_id,email,auth_subject,role,status,invited_at,last_login_at,revoked_at FROM app.app_user WHERE lower(email)=lower(${email}) FOR UPDATE`;
    if(existing?.user_id===actorId&&role!=="admin")return {user:null,reason:"self"};
    if(existing?.role==="admin"&&role!=="admin"){
      const [{count}]=await tx<{count:number}[]>`SELECT count(*)::int count FROM app.app_user WHERE role='admin' AND status='active'`;
      if(Number(count)<=1)return {user:null,reason:"last_admin"};
    }
    const [user]=await tx<AppUser[]>`INSERT INTO app.app_user(email,password_hash,role,status,invited_at) VALUES(lower(${email}),NULL,${role},'active',now())
      ON CONFLICT((lower(email))) DO UPDATE SET role=excluded.role,status='active',revoked_at=NULL,invited_at=coalesce(app.app_user.invited_at,now()),updated_at=now()
      RETURNING user_id,email,auth_subject,role,status,invited_at,last_login_at,revoked_at`;
    await tx`INSERT INTO app.audit_event(user_id,event_type,target_id,details) VALUES(${actorId}::uuid,'admin.access.upserted',${user.user_id},${tx.json({email:user.email,role:user.role} as never)})`;
    return {user,reason:null};
  });}finally{await sql.end();}
}

export async function adminRevokeAccess(actorId:string,targetUserId:string):Promise<AdminAccessResult>{
  const sql=database();try{return await sql.begin(async tx=>{
    await tx`SELECT pg_advisory_xact_lock(hashtext('duckdive:admin:access'))`;
    const [target]=await tx<AppUser[]>`SELECT user_id,email,auth_subject,role,status,invited_at,last_login_at,revoked_at FROM app.app_user WHERE user_id=${targetUserId}::uuid FOR UPDATE`;
    if(!target)return {user:null,reason:"not_found"};
    if(target.user_id===actorId)return {user:null,reason:"self"};
    if(target.role==="admin"&&target.status==="active"){
      const [{count}]=await tx<{count:number}[]>`SELECT count(*)::int count FROM app.app_user WHERE role='admin' AND status='active'`;
      if(Number(count)<=1)return {user:null,reason:"last_admin"};
    }
    const [user]=await tx<AppUser[]>`UPDATE app.app_user SET status='revoked',revoked_at=now(),updated_at=now() WHERE user_id=${targetUserId}::uuid RETURNING user_id,email,auth_subject,role,status,invited_at,last_login_at,revoked_at`;
    await tx`INSERT INTO app.audit_event(user_id,event_type,target_id,details) VALUES(${actorId}::uuid,'admin.access.revoked',${user.user_id},${tx.json({email:user.email,role:user.role} as never)})`;
    return {user,reason:null};
  });}finally{await sql.end();}
}
