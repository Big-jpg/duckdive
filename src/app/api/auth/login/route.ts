import {createHash} from "node:crypto";
import {NextResponse} from "next/server";
import {z} from "zod";
import {audit,consumeLoginQuota,findUserByEmail} from "@/lib/app-db";
import {verifyPassword} from "@/lib/password";
import {assertSameOrigin} from "@/lib/csrf";
import {createSessionToken,sessionCookie} from "@/lib/auth";

const bodySchema=z.object({email:z.email().max(254),password:z.string().min(1).max(256)}).strict();
export async function POST(request:Request){
  const csrf=assertSameOrigin(request);if(csrf)return csrf;
  const parsed=bodySchema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return NextResponse.json({error:"Invalid email or password"},{status:401});
  const ip=request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()||"unknown";
  const keyHash=createHash("sha256").update(`${parsed.data.email.toLowerCase()}|${ip}|${process.env.AUTH_SECRET||"missing"}`).digest("hex");
  if(!await consumeLoginQuota(keyHash))return NextResponse.json({error:"Too many sign-in attempts. Try again in 15 minutes."},{status:429,headers:{"Retry-After":"900"}});
  const user=await findUserByEmail(parsed.data.email);
  if(!user||!await verifyPassword(parsed.data.password,user.password_hash))return NextResponse.json({error:"Invalid email or password"},{status:401});
  const response=NextResponse.json({user:{id:user.user_id,email:user.email}});response.cookies.set(sessionCookie(createSessionToken(user.user_id)));
  await audit("auth.login",user.user_id,null);return response;
}
