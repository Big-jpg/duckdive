import {randomBytes,scrypt as scryptCallback,timingSafeEqual} from "node:crypto";
import {promisify} from "node:util";

const scrypt=promisify(scryptCallback);

export async function hashPassword(password:string){
  if(password.length<12) throw new Error("Password must be at least 12 characters");
  const salt=randomBytes(16);
  const derived=await scrypt(password,salt,64) as Buffer;
  return `scrypt:${salt.toString("hex")}:${derived.toString("hex")}`;
}

export async function verifyPassword(password:string,stored:string){
  const [kind,saltHex,hashHex]=stored.split(":");
  if(kind!=="scrypt"||!saltHex||!hashHex) return false;
  const expected=Buffer.from(hashHex,"hex");
  const actual=await scrypt(password,Buffer.from(saltHex,"hex"),expected.length) as Buffer;
  return actual.length===expected.length&&timingSafeEqual(actual,expected);
}
