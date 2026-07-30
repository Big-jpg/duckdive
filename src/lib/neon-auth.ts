import {createNeonAuth,type NeonAuth} from "@neondatabase/auth/next/server";

let instance:NeonAuth|undefined;

function required(name:"NEON_AUTH_BASE_URL"|"NEON_AUTH_COOKIE_SECRET"){
  const value=process.env[name]?.trim();
  if(!value)throw new Error(`${name} is required`);
  return value;
}

export function neonAuth(){
  if(instance)return instance;
  const secret=required("NEON_AUTH_COOKIE_SECRET");
  if(secret.length<32)throw new Error("NEON_AUTH_COOKIE_SECRET must contain at least 32 characters");
  instance=createNeonAuth({baseUrl:required("NEON_AUTH_BASE_URL"),cookies:{secret,sessionDataTtl:60},logLevel:"warn"});
  return instance;
}

