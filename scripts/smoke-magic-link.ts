import {randomBytes} from "node:crypto";
import {addAccess} from "../src/lib/app-db";
import {database} from "../src/lib/db";

const APP_ORIGIN=(process.env.MAGIC_LINK_SMOKE_ORIGIN||"https://duckdive.gold").replace(/\/$/,"");
const REQUEST_ORIGIN=(process.env.MAGIC_LINK_SMOKE_REQUEST_ORIGIN||APP_ORIGIN).replace(/\/$/,"");
const MAIL_API="https://api.mail.tm";
const CHALLENGE_COOKIES=["__Secure-neon-auth.session_challenge","__Secure-neon-auth.session_challange"] as const;
const CONFIRMATION_FLAG="--confirm-production";

type Mailbox={id:string;address:string;password:string;token:string};
type MailMessage={id:string;subject:string;createdAt:string};

function requireProductionConfirmation(){
  if(!process.argv.includes(CONFIRMATION_FLAG))throw new Error(`This smoke creates short-lived production QA identities. Re-run with ${CONFIRMATION_FLAG}.`);
}

async function json<T>(url:string,init?:RequestInit):Promise<T>{
  for(let attempt=0;attempt<5;attempt++){
    const response=await fetch(url,init);
    if(response.ok)return response.json() as Promise<T>;
    if(response.status!==429||attempt===4)throw new Error(`${new URL(url).pathname} failed (${response.status})`);
    const retryAfter=Number(response.headers.get("retry-after"));
    const waitMs=Number.isFinite(retryAfter)&&retryAfter>0?retryAfter*1_000:2_000*(attempt+1);
    await new Promise(resolve=>setTimeout(resolve,Math.min(waitMs,10_000)));
  }
  throw new Error("Unreachable mailbox request state");
}

async function createMailbox(label:string):Promise<Mailbox>{
  const domains=await json<{"hydra:member":Array<{domain:string;isActive:boolean}>}>(`${MAIL_API}/domains`);
  const domain=domains["hydra:member"].find(item=>item.isActive)?.domain;
  if(!domain)throw new Error("Mail.tm returned no active domain");
  const suffix=randomBytes(8).toString("hex"),password=randomBytes(24).toString("base64url");
  const address=`duckdive-${label}-${suffix}@${domain}`;
  const account=await json<{id:string;address:string}>(`${MAIL_API}/accounts`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({address,password})});
  const auth=await json<{token:string}>(`${MAIL_API}/token`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({address,password})});
  return {id:account.id,address:account.address,password,token:auth.token};
}

async function deleteMailbox(mailbox:Mailbox){
  const response=await fetch(`${MAIL_API}/accounts/${mailbox.id}`,{method:"DELETE",headers:{Authorization:`Bearer ${mailbox.token}`}});
  if(response.status!==204)throw new Error(`Mail.tm account cleanup failed (${response.status})`);
}

function setCookieLines(headers:Headers):string[]{
  return (headers as Headers&{getSetCookie?:()=>string[]}).getSetCookie?.()??[];
}

function cookieNames(headers:Headers):string[]{
  return setCookieLines(headers).map(line=>line.slice(0,line.indexOf("="))).filter(Boolean);
}

function cookieValue(headers:Headers,name:string):string|null{
  const line=setCookieLines(headers).find(item=>item.startsWith(`${name}=`));
  if(!line)return null;
  return line.slice(name.length+1).split(";",1)[0]||null;
}

function challengeCookie(headers:Headers):{name:string;value:string}|null{
  for(const name of CHALLENGE_COOKIES){const value=cookieValue(headers,name);if(value)return {name,value};}
  return null;
}

function safeLocation(response:Response):string|null{
  const location=response.headers.get("location");
  if(!location)return null;
  const url=new URL(location,response.url);
  return `${url.origin}${url.pathname}${url.searchParams.has("error")?`?error=${url.searchParams.get("error")}`:""}`;
}

async function requestLink(address:string){
  return fetch(`${APP_ORIGIN}/api/auth/request-link`,{
    method:"POST",redirect:"manual",
    headers:{"Content-Type":"application/json",Origin:REQUEST_ORIGIN,Referer:`${REQUEST_ORIGIN}/login`},
    body:JSON.stringify({email:address,next:"/workspace"}),
  });
}

async function waitForMagicLink(mailbox:Mailbox,timeoutMs=60_000):Promise<string>{
  const deadline=Date.now()+timeoutMs;
  while(Date.now()<deadline){
    const list=await json<{"hydra:member":MailMessage[]}>(`${MAIL_API}/messages`,{headers:{Authorization:`Bearer ${mailbox.token}`}});
    const message=list["hydra:member"].filter(item=>item.subject==="Your DuckDive sign-in link").sort((a,b)=>b.createdAt.localeCompare(a.createdAt))[0];
    if(message){
      const full=await json<{text?:string;html?:string[]}>(`${MAIL_API}/messages/${message.id}`,{headers:{Authorization:`Bearer ${mailbox.token}`}});
      const body=[full.text??"",...(full.html??[])].join("\n").replaceAll("&amp;","&");
      const match=body.match(/https:\/\/[^\s"'<>]+\/neondb\/auth\/magic-link\/verify\?[^\s"'<>]+/);
      if(!match)throw new Error("Magic-link email arrived without a recognizable verification URL");
      return match[0];
    }
    await new Promise(resolve=>setTimeout(resolve,2_000));
  }
  throw new Error("Timed out waiting for the magic-link email");
}

async function removeQaIdentity(address:string):Promise<number>{
  const sql=database();
  try{
    const rows=await sql<{email:string}[]>`DELETE FROM app.app_user WHERE lower(email)=lower(${address}) RETURNING email`;
    if(rows.length!==1)throw new Error(`Expected one QA allowlist row during cleanup; removed ${rows.length}`);
    const authRows=await sql<{id:string}[]>`DELETE FROM neon_auth."user" WHERE lower(email)=lower(${address}) RETURNING id`;
    return authRows.length;
  }finally{await sql.end();}
}

async function main(){
  requireProductionConfirmation();
  const mailboxes:Mailbox[]=[];
  let allowlistedAddress:string|undefined;
  try{
    const allowed=await createMailbox("allowed"),denied=await createMailbox("denied");
    mailboxes.push(allowed,denied);
    allowlistedAddress=allowed.address;
    await addAccess(allowed.address,"member");
    console.log("QA setup",{allowlisted:true,deniedAllowlisted:false});

    const allowedRequest=await requestLink(allowed.address);
    const initialCookieNames=cookieNames(allowedRequest.headers);
    const challenge=challengeCookie(allowedRequest.headers);
    console.log("Allowlisted request",{status:allowedRequest.status,setCookieNames:initialCookieNames,challengePresent:Boolean(challenge)});
    if(allowedRequest.status!==202||!challenge)throw new Error("Allowlisted request did not issue the session challenge");

    const deniedRequest=await requestLink(denied.address);
    console.log("Denied request",{status:deniedRequest.status,setCookieNames:cookieNames(deniedRequest.headers)});
    if(deniedRequest.status!==202||cookieNames(deniedRequest.headers).length)throw new Error("Denied request was not generic and cookie-free");

    const verificationUrl=await waitForMagicLink(allowed);
    const verifier=await fetch(verificationUrl,{redirect:"manual"});
    console.log("Neon verification",{status:verifier.status,location:safeLocation(verifier),setCookieNames:cookieNames(verifier.headers)});
    const callbackLocation=verifier.headers.get("location");
    if(!callbackLocation)throw new Error("Neon verification did not redirect to the application callback");

    const callbackChallenge=challenge?CHALLENGE_COOKIES.map(name=>`${name}=${challenge.value}`).join("; "):"";
    const callback=await fetch(callbackLocation,{redirect:"manual",headers:callbackChallenge?{Cookie:callbackChallenge}:{}});
    console.log("Application callback",{status:callback.status,location:safeLocation(callback),setCookieNames:cookieNames(callback.headers),challengeSupplied:Boolean(challenge)});
    const sessionCookieNames=cookieNames(callback.headers);
    if(callback.status!==307||!sessionCookieNames.includes("__Secure-neon-auth.session_token"))throw new Error("Callback did not establish a Neon Auth session");

    const completeLocation=callback.headers.get("location");
    if(!completeLocation)throw new Error("Callback omitted the cleaned completion redirect");
    const sessionCookieHeader=setCookieLines(callback.headers).map(line=>line.split(";",1)[0]).join("; ");
    const complete=await fetch(new URL(completeLocation,callbackLocation),{redirect:"manual",headers:{Cookie:sessionCookieHeader}});
    console.log("Authenticated completion",{status:complete.status,location:safeLocation(complete)});
    if(complete.status!==307||new URL(complete.headers.get("location")??"/",APP_ORIGIN).pathname!=="/workspace")throw new Error("Authenticated completion did not reach the workspace boundary");

    const deniedMessages=await json<{"hydra:member":MailMessage[]}>(`${MAIL_API}/messages`,{headers:{Authorization:`Bearer ${denied.token}`}});
    console.log("Denied delivery",{messageCount:deniedMessages["hydra:member"].length});
    if(deniedMessages["hydra:member"].length)throw new Error("Denied identity received an email");
  }finally{
    const failures:string[]=[];
    let neonAuthUsersDeleted=0;
    if(allowlistedAddress)try{neonAuthUsersDeleted=await removeQaIdentity(allowlistedAddress);}catch(error){failures.push(error instanceof Error?error.message:String(error));}
    for(const mailbox of mailboxes)try{await deleteMailbox(mailbox);}catch(error){failures.push(error instanceof Error?error.message:String(error));}
    console.log("QA cleanup",{allowlistRowRemoved:allowlistedAddress? !failures.some(item=>item.includes("allowlist")):"not-created",neonAuthUsersDeleted,mailboxesDeleted:mailboxes.length-failures.filter(item=>item.includes("Mail.tm")).length,mailboxesCreated:mailboxes.length});
    if(failures.length)throw new Error(`Cleanup incomplete: ${failures.join("; ")}`);
  }
}

await main();
