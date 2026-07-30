import {generateKeyPairSync,sign} from "node:crypto";
import {afterEach,describe,expect,it} from "vitest";
import {verifyNeonWebhook} from "./neon-webhook";

const previousBase=process.env.NEON_AUTH_BASE_URL;
afterEach(()=>{if(previousBase===undefined)delete process.env.NEON_AUTH_BASE_URL;else process.env.NEON_AUTH_BASE_URL=previousBase;});

function signedRequest(rawBody:string,timestamp:number){
  const {privateKey,publicKey}=generateKeyPairSync("ed25519"),kid="test-key";
  const header=Buffer.from(JSON.stringify({alg:"EdDSA",typ:"JWS",kid})).toString("base64url");
  const payload=Buffer.from(rawBody).toString("base64url"),bound=Buffer.from(`${timestamp}.${payload}`).toString("base64url");
  const signature=sign(null,Buffer.from(`${header}.${bound}`),privateKey).toString("base64url");
  const parsed=JSON.parse(rawBody) as {event_id:string;event_type:string};
  const headers=new Headers({"x-neon-signature":`${header}..${signature}`,"x-neon-signature-kid":kid,"x-neon-timestamp":String(timestamp),"x-neon-event-id":parsed.event_id,"x-neon-event-type":parsed.event_type});
  const exported=publicKey.export({format:"jwk"});
  if(!exported.kty)throw new Error("Test key omitted kty");
  const jwk={...exported,kty:exported.kty};
  return {headers,fetchJwks:async()=>({keys:[{...jwk,kid}]})};
}

describe("Neon webhook verification",()=>{
  it("accepts a current, signed allowlist event",async()=>{
    process.env.NEON_AUTH_BASE_URL="https://example.neonauth.test/auth";
    const now=Date.now(),raw=JSON.stringify({event_id:"550e8400-e29b-41d4-a716-446655440000",event_type:"user.before_create",timestamp:new Date(now).toISOString(),user:{email:"member@example.com"},event_data:{auth_provider:"credential"}});
    const signed=signedRequest(raw,now);
    await expect(verifyNeonWebhook(raw,signed.headers,{now,fetchJwks:signed.fetchJwks})).resolves.toMatchObject({event_type:"user.before_create"});
  });
  it("rejects tampering and stale deliveries",async()=>{
    process.env.NEON_AUTH_BASE_URL="https://example.neonauth.test/auth";
    const now=Date.now(),raw=JSON.stringify({event_id:"550e8400-e29b-41d4-a716-446655440000",event_type:"send.magic_link",timestamp:new Date(now).toISOString(),user:{email:"member@example.com"},event_data:{link_url:"https://example.test/verify"}}),signed=signedRequest(raw,now);
    await expect(verifyNeonWebhook(raw.replace("member","other"),signed.headers,{now,fetchJwks:signed.fetchJwks})).rejects.toThrow("signature");
    await expect(verifyNeonWebhook(raw,signed.headers,{now:now+301_000,fetchJwks:signed.fetchJwks})).rejects.toThrow("timestamp");
  });
});
