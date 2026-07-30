import {neonAuth} from "@/lib/neon-auth";

type Context={params:Promise<{path:string[]}>};
export async function GET(request:Request,context:Context){return neonAuth().handler().GET(request,context);}

