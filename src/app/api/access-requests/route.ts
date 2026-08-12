import {createHash} from "node:crypto";
import {z} from "zod";
import {assertSameOrigin} from "@/lib/csrf";
import {normalizeEmail} from "@/lib/auth-policy";
import {submitAccessRequest} from "@/lib/access-request-db";

const bodySchema=z.object({
  name:z.string().trim().min(1).max(100),
  email:z.string().trim().pipe(z.email().max(254)),
  title:z.string().trim().max(120).optional().default(""),
  datasetInterest:z.string().trim().max(1000).optional().default(""),
  website:z.string().max(200).optional().default("")
}).strict();
const accepted={ok:true,message:"Thanks — your request has been received for review."};

export async function POST(request:Request){
  const csrf=assertSameOrigin(request);if(csrf)return csrf;
  const parsed=bodySchema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return Response.json({error:"Enter your name and a valid email address."},{status:400});
  if(parsed.data.website)return Response.json(accepted,{status:202});
  const email=normalizeEmail(parsed.data.email),ip=request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()||"unknown";
  const rateSecret=process.env.NEON_AUTH_COOKIE_SECRET||"unconfigured";
  const keyHash=createHash("sha256").update(`${email}|${ip}|${rateSecret}`).digest("hex");
  const result=await submitAccessRequest({email,name:parsed.data.name,title:parsed.data.title,datasetInterest:parsed.data.datasetInterest,keyHash});
  return Response.json(accepted,{status:202,headers:result.rateLimited?{"Retry-After":"3600"}:undefined});
}
