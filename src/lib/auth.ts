import {linkActiveAllowlistedUser,type AppUser} from "./app-db";
import {verifiedIdentity} from "./auth-policy";
import {neonAuth} from "./neon-auth";

export async function currentUser(_request?:Request):Promise<AppUser|null>{
  void _request;
  const {data,error}=await neonAuth().getSession();
  if(error){
    console.error("Neon Auth session check failed",{code:error.code,status:error.status});
    return null;
  }
  const identity=verifiedIdentity(data);
  return identity?await linkActiveAllowlistedUser(identity.subject,identity.email):null;
}
