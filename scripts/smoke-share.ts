import {database} from "../src/lib/db";
import {createDiveShare,getWorkspace,revokeDiveShare,type AppUser,type Workspace} from "../src/lib/app-db";

const QA_EMAIL="qa-share-link@invalid.local";
const action=process.argv.slice(2).find(value=>value!=="--")||"create";
const sql=database(process.env.DATABASE_URL_UNPOOLED||process.env.DATABASE_URL,process.env.DATABASE_URL_UNPOOLED?"DATABASE_URL_UNPOOLED":"DATABASE_URL");

try{
  if(action==="cleanup"){
    const rows=await sql`DELETE FROM app.app_user WHERE email=${QA_EMAIL} RETURNING user_id`;
    console.log(JSON.stringify({action,deleted:rows.length}));
  }else{
    const [source]=await sql<{value:string}[]>`SELECT value FROM app.setting WHERE key='source_dive:suburb-story'`;
    if(!source?.value)throw new Error("Source Suburb Story Dive is not provisioned");
    const [user]=await sql<AppUser[]>`INSERT INTO app.app_user(email,password_hash) VALUES(${QA_EMAIL},'disabled:share-smoke') ON CONFLICT(email) DO UPDATE SET updated_at=now() RETURNING user_id,email,password_hash`;
    const diveIds={"suburb-story":source.value};
    const [workspace]=await sql<Workspace[]>`INSERT INTO app.workspace(user_id,motherduck_username,dive_ids,source_dive_ids) VALUES(${user.user_id}::uuid,${process.env.MOTHERDUCK_SHARED_SERVICE_ACCOUNT_USERNAME||"vic_house_lab"},${sql.json(diveIds)},${sql.json(diveIds)}) ON CONFLICT(user_id) DO UPDATE SET dive_ids=excluded.dive_ids,source_dive_ids=excluded.source_dive_ids,updated_at=now() RETURNING workspace_id,user_id,motherduck_username,dive_ids,source_dive_ids`;
    if(action==="create"){
      const share=await createDiveShare(workspace,user.user_id,source.value,"suburb-story","Suburb Story","Eight-year suburb history and transparent bedroom samples.");
      console.log(JSON.stringify({action,slug:share.slug}));
    }else if(action==="revoke"){
      const current=await getWorkspace(user.user_id);if(!current)throw new Error("QA workspace is missing");
      const share=await revokeDiveShare(current.workspace_id,source.value);
      console.log(JSON.stringify({action,slug:share?.slug||null,revoked:Boolean(share)}));
    }else throw new Error("Usage: pnpm smoke:share -- create|revoke|cleanup");
  }
}finally{await sql.end();}
