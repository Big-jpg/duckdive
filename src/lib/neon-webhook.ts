import {createPublicKey,verify} from "node:crypto";
import {z} from "zod";

const userSchema=z.object({id:z.string().optional(),email:z.email().optional(),email_verified:z.boolean().optional()}).passthrough();
const eventSchema=z.object({
  event_id:z.uuid(),
  event_type:z.enum(["send.magic_link","user.before_create"]),
  timestamp:z.iso.datetime(),
  user:userSchema,
  event_data:z.record(z.string(),z.unknown())
}).passthrough();
export type NeonWebhookEvent=z.infer<typeof eventSchema>;

type Jwk={kid?:string;kty:string;crv?:string;x?:string;[key:string]:unknown};
type VerifyOptions={now?:number;fetchJwks?:(url:string)=>Promise<{keys:Jwk[]}>};

async function defaultFetchJwks(url:string){
  const response=await fetch(url,{cache:"no-store",signal:AbortSignal.timeout(4000)});
  if(!response.ok)throw new Error("Could not retrieve Neon Auth signing keys");
  return await response.json() as {keys:Jwk[]};
}

export async function verifyNeonWebhook(rawBody:string,headers:Headers,options:VerifyOptions={}):Promise<NeonWebhookEvent>{
  const signature=headers.get("x-neon-signature"),kid=headers.get("x-neon-signature-kid"),timestamp=headers.get("x-neon-timestamp");
  if(!signature||!kid||!timestamp)throw new Error("Missing Neon webhook signature headers");
  const timestampMs=Number(timestamp),now=options.now??Date.now();
  if(!Number.isFinite(timestampMs)||Math.abs(now-timestampMs)>5*60*1000)throw new Error("Neon webhook timestamp is outside the allowed window");
  const baseUrl=process.env.NEON_AUTH_BASE_URL?.replace(/\/$/,"");
  if(!baseUrl)throw new Error("NEON_AUTH_BASE_URL is required");
  const jwks=await (options.fetchJwks??defaultFetchJwks)(`${baseUrl}/.well-known/jwks.json`);
  const jwk=jwks.keys.find(key=>key.kid===kid);
  if(!jwk)throw new Error("Neon webhook signing key was not found");
  const [headerB64,emptyPayload,signatureB64,...extra]=signature.split(".");
  if(!headerB64||emptyPayload!==""||!signatureB64||extra.length)throw new Error("Invalid detached JWS format");
  const payloadB64=Buffer.from(rawBody,"utf8").toString("base64url");
  const boundPayload=Buffer.from(`${timestamp}.${payloadB64}`,"utf8").toString("base64url");
  const valid=verify(null,Buffer.from(`${headerB64}.${boundPayload}`),createPublicKey({key:jwk,format:"jwk"}),Buffer.from(signatureB64,"base64url"));
  if(!valid)throw new Error("Invalid Neon webhook signature");
  const parsed=eventSchema.safeParse(JSON.parse(rawBody));
  if(!parsed.success)throw new Error("Invalid Neon webhook payload");
  if(headers.get("x-neon-event-id")!==parsed.data.event_id||headers.get("x-neon-event-type")!==parsed.data.event_type)throw new Error("Neon webhook headers do not match the payload");
  return parsed.data;
}

