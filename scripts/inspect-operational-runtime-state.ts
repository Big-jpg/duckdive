import {database} from "../src/lib/db";

const email="qa-phase2cc-runtime@invalid.local",sql=database();
try{
  const [qa]=await sql<{users:number;datasets:number;bindings:number}[]>`SELECT (SELECT count(*)::int FROM app.app_user WHERE lower(email)=lower(${email})) users,(SELECT count(*)::int FROM app.operational_dataset d JOIN app.app_user u ON u.user_id=d.owner_user_id WHERE lower(u.email)=lower(${email})) datasets,(SELECT count(*)::int FROM app.operational_dataset_binding b JOIN app.operational_dataset d USING(operational_dataset_id) JOIN app.app_user u ON u.user_id=d.owner_user_id WHERE lower(u.email)=lower(${email})) bindings`;
  const migrations=await sql<{version:string;applied_at:string}[]>`SELECT version,applied_at FROM ops.schema_migration WHERE version IN ('017_operational_runtime.sql','018_operational_runtime_resource_reference.sql') ORDER BY version`;
  console.log(JSON.stringify({qa,migrations},null,2));
}finally{await sql.end();}
