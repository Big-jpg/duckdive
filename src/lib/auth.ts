import {createHmac,timingSafeEqual} from "node:crypto";
import {cookies} from "next/headers";
import {findUserById,type AppUser} from "./app-db";

const COOKIE="vic_lab_session";
const TTL_SECONDS=60*60*12;
type Session={userId:string;expires:number};

function secret(){const value=process.env.AUTH_SECRET;if(!value||value.length<32)throw new Error("AUTH_SECRET must be at least 32 characters");return value;}
function encode(value:string){return Buffer.from(value).toString("base64url");}
function sign(payload:string){return createHmac("sha256",secret()).update(payload).digest("base64url");}

export function createSessionToken(userId:string){const payload=encode(JSON.stringify({userId,expires:Date.now()+TTL_SECONDS*1000} satisfies Session));return `${payload}.${sign(payload)}`;}
export function verifySessionToken(token:string|undefined){
  if(!token)return null;const [payload,signature]=token.split(".");if(!payload||!signature)return null;
  const expected=sign(payload);if(expected.length!==signature.length||!timingSafeEqual(Buffer.from(expected),Buffer.from(signature)))return null;
  try{const session=JSON.parse(Buffer.from(payload,"base64url").toString()) as Session;return session.expires>Date.now()?session:null;}catch{return null;}
}
export function sessionCookie(token:string){return {name:COOKIE,value:token,httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax" as const,path:"/",maxAge:TTL_SECONDS};}
export function clearSessionCookie(){return {name:COOKIE,value:"",httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax" as const,path:"/",maxAge:0};}
export async function currentUser(request?:Request):Promise<AppUser|null>{
  const raw=request?.headers.get("cookie")?.split(";").map(v=>v.trim()).find(v=>v.startsWith(`${COOKIE}=`))?.slice(COOKIE.length+1)||(await cookies()).get(COOKIE)?.value;
  const session=verifySessionToken(raw);return session?await findUserById(session.userId)||null:null;
}
