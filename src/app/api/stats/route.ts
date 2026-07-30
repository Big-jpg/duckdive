import { database } from "@/lib/db";
import {currentUser} from "@/lib/auth";
export const dynamic="force-dynamic";
export async function GET(request:Request){
  if(!await currentUser(request))return Response.json({error:"Authentication required"},{status:401});
  const sql=database(process.env.DATABASE_READ_URL||process.env.DATABASE_URL);
  try { const [stats]=await sql`SELECT (SELECT count(*) FROM core.property)::int properties,(SELECT count(*) FROM core.listing)::int listings,(SELECT count(*) FROM core.sale_event)::int sales,(SELECT min(sold_date) FROM core.sale_event) first_sale,(SELECT max(sold_date) FROM core.sale_event) last_sale`; return Response.json(stats); }
  finally { await sql.end(); }
}
