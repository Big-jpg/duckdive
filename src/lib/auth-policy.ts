export function normalizeEmail(value:string){return value.trim().toLowerCase();}

export function safeNextPath(value:string|null|undefined){
  return value?.startsWith("/")&&!value.startsWith("//")?value:"/";
}

export function appUrl(path:string,requestUrl?:string){
  const configured=process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const base=configured||(requestUrl?new URL(requestUrl).origin:"");
  if(!base)throw new Error("NEXT_PUBLIC_SITE_URL is required");
  return new URL(path,base.endsWith("/")?base:`${base}/`).toString();
}

export type VerifiedIdentity={subject:string;email:string;emailVerified:boolean};

export function verifiedIdentity(session:unknown):VerifiedIdentity|null{
  if(!session||typeof session!=="object")return null;
  const user=(session as {user?:unknown}).user;
  if(!user||typeof user!=="object")return null;
  const {id,email,emailVerified} = user as {id?:unknown;email?:unknown;emailVerified?:unknown};
  if(typeof id!=="string"||!id||typeof email!=="string"||!email||emailVerified!==true)return null;
  return {subject:id,email:normalizeEmail(email),emailVerified:true};
}
