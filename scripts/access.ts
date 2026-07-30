import {z} from "zod";
import {addAccess,listAccess,revokeAccess} from "../src/lib/app-db";
import {normalizeEmail} from "../src/lib/auth-policy";

const [command,emailArg,roleArg]=process.argv.slice(2).filter(value=>value!=="--");
const emailSchema=z.email().max(254);

if(command==="list"){
  const rows=await listAccess();
  console.table(rows.map(row=>({email:row.email,role:row.role,status:row.status,linked:Boolean(row.auth_subject),invited_at:row.invited_at,last_login_at:row.last_login_at,revoked_at:row.revoked_at})));
}else if(command==="add"){
  const parsed=emailSchema.safeParse(emailArg);if(!parsed.success)throw new Error("Usage: pnpm access:add -- user@example.com [member|admin]");
  const role=roleArg||"member";if(role!=="member"&&role!=="admin")throw new Error("Role must be member or admin");
  const row=await addAccess(normalizeEmail(parsed.data),role);
  console.log(`access active: ${row.email} (${row.role})`);
}else if(command==="revoke"){
  const parsed=emailSchema.safeParse(emailArg);if(!parsed.success)throw new Error("Usage: pnpm access:revoke -- user@example.com");
  const row=await revokeAccess(normalizeEmail(parsed.data));if(!row)throw new Error("No allowlist entry found for that email");
  console.log(`access revoked: ${row.email}`);
}else throw new Error("Usage: pnpm access:list | pnpm access:add -- user@example.com [member|admin] | pnpm access:revoke -- user@example.com");
