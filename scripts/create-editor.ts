import {hashPassword} from "../src/lib/password";
import {upsertEditor} from "../src/lib/app-db";

const email=process.argv[2]?.trim();
const password=process.env.EDITOR_PASSWORD;
if(!email||!/^\S+@\S+\.\S+$/.test(email)) throw new Error("Usage: EDITOR_PASSWORD=... pnpm editor:create -- user@example.com");
if(!password) throw new Error("EDITOR_PASSWORD is required and is never accepted on the command line");
const user=await upsertEditor(email,await hashPassword(password));
console.log(`editor ready: ${user.email}`);
