import {database} from "./db";
import type {AppUser} from "./app-db";

export type AccessRequest={
  request_id:string;email:string;name:string;title:string|null;dataset_interest:string|null;
  status:"pending"|"approved"|"ignored";submitted_at:string;reviewed_at:string|null;
};

export async function submitAccessRequest(input:{email:string;name:string;title?:string;datasetInterest?:string;keyHash:string},limit=5){
  const sql=database();try{return await sql.begin(async tx=>{
    const [quota]=await tx<{allowed:boolean}[]>`
      WITH recent AS (
        SELECT count(*)::int AS count FROM app.access_request_attempt
        WHERE key_hash=${input.keyHash} AND occurred_at>=now()-INTERVAL '1 hour'
      ), inserted AS (
        INSERT INTO app.access_request_attempt(key_hash)
        SELECT ${input.keyHash} WHERE (SELECT count FROM recent)<${limit}
        RETURNING 1
      ), pruned AS (
        DELETE FROM app.access_request_attempt WHERE occurred_at<now()-INTERVAL '24 hours'
      )
      SELECT EXISTS(SELECT 1 FROM inserted) AS allowed`;
    if(!quota?.allowed)return {accepted:false as const,rateLimited:true as const};
    await tx`
      INSERT INTO app.access_request(email,name,title,dataset_interest)
      VALUES(lower(${input.email}),${input.name},${input.title||null},${input.datasetInterest||null})
      ON CONFLICT((lower(email))) DO UPDATE SET
        name=excluded.name,title=excluded.title,dataset_interest=excluded.dataset_interest,updated_at=now()
      WHERE app.access_request.status='pending'`;
    return {accepted:true as const,rateLimited:false as const};
  });}finally{await sql.end();}
}

export async function listPendingAccessRequests(){
  const sql=database();try{return await sql<AccessRequest[]>`
    SELECT request_id,email,name,title,dataset_interest,status,submitted_at,reviewed_at
    FROM app.access_request WHERE status='pending' ORDER BY submitted_at ASC`;
  }finally{await sql.end();}
}

export type ReviewAccessRequestResult={request:AccessRequest|null;user:AppUser|null;reason:"not_found"|"already_reviewed"|null};

export async function reviewAccessRequest(actorId:string,requestId:string,action:"approve"|"ignore"):Promise<ReviewAccessRequestResult>{
  const sql=database();try{return await sql.begin(async tx=>{
    await tx`SELECT pg_advisory_xact_lock(hashtext('duckdive:admin:access'))`;
    const [request]=await tx<AccessRequest[]>`
      SELECT request_id,email,name,title,dataset_interest,status,submitted_at,reviewed_at
      FROM app.access_request WHERE request_id=${requestId}::uuid FOR UPDATE`;
    if(!request)return {request:null,user:null,reason:"not_found"};
    if(request.status!=="pending")return {request:null,user:null,reason:"already_reviewed"};
    let user:AppUser|null=null;
    if(action==="approve"){
      [user]=await tx<AppUser[]>`
        INSERT INTO app.app_user(email,password_hash,role,status,invited_at)
        VALUES(lower(${request.email}),NULL,'member','active',now())
        ON CONFLICT((lower(email))) DO UPDATE SET status='active',revoked_at=NULL,
          invited_at=coalesce(app.app_user.invited_at,now()),updated_at=now()
        RETURNING user_id,email,auth_subject,role,status,invited_at,last_login_at,revoked_at`;
    }
    const [reviewed]=await tx<AccessRequest[]>`
      UPDATE app.access_request SET status=${action==="approve"?"approved":"ignored"},reviewed_at=now(),
        reviewed_by=${actorId}::uuid,approved_user_id=${user?.user_id??null}::uuid,updated_at=now()
      WHERE request_id=${requestId}::uuid
      RETURNING request_id,email,name,title,dataset_interest,status,submitted_at,reviewed_at`;
    await tx`INSERT INTO app.audit_event(user_id,event_type,target_id,details)
      VALUES(${actorId}::uuid,${action==="approve"?"admin.access_request.approved":"admin.access_request.ignored"},${user?.user_id??requestId},
        ${tx.json({requestId,email:request.email} as never)})`;
    return {request:reviewed,user,reason:null};
  });}finally{await sql.end();}
}
