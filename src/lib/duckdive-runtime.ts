import {createHash} from "node:crypto";
import {createEmbedSession} from "./motherduck-api";
import {motherduckServiceSql} from "./motherduck-access";
import {mdString} from "./sql-literal";

export type DiveSnapshot={version:number;content:string;hash:string};

export function canonicalDiveSource(source:string){return source.replaceAll("\r\n","\n").split("\n").map(line=>line.trimEnd()).join("\n").trim();}

export function assertDiveRevisionChanged(before:DiveSnapshot,after:DiveSnapshot){
  if(after.version<=before.version)throw new Error("Dive version did not advance");
  if(after.hash===before.hash)throw new Error("Dive source did not change");
}

export async function readDiveSnapshot(diveId:string,username:string):Promise<DiveSnapshot>{
  const sql=await motherduckServiceSql(username);
  const rows=await sql.unsafe(`SELECT current_version FROM MD_GET_DIVE(id = ${mdString(diveId)})`);
  const version=Number(rows[0]?.current_version);
  if(!Number.isInteger(version)||version<1)throw new Error("Dive version is unavailable");
  const versions=await sql.unsafe(`SELECT content FROM MD_GET_DIVE_VERSION(id = ${mdString(diveId)}, version = ${version})`);
  const content=String(versions[0]?.content||"");
  if(!content)throw new Error("Dive content is unavailable");
  return {version,content,hash:createHash("sha256").update(canonicalDiveSource(content)).digest("hex")};
}

export async function verifyDiveRevision(diveId:string,username:string,before:DiveSnapshot){
  const after=await readDiveSnapshot(diveId,username);
  assertDiveRevisionChanged(before,after);
  await createEmbedSession(diveId,username);
  return after;
}

export async function resetDiveToSource(diveId:string,sourceDiveId:string,username:string){
  const [before,source]=await Promise.all([readDiveSnapshot(diveId,username),readDiveSnapshot(sourceDiveId,username)]);
  if(before.hash===source.hash)return {before,after:before,noChange:true as const};
  const sql=await motherduckServiceSql(username);
  await sql.unsafe(`SELECT * FROM MD_UPDATE_DIVE_CONTENT(id = ${mdString(diveId)}, content = ${mdString(source.content)})`);
  return {before,after:await verifyDiveRevision(diveId,username,before),noChange:false as const};
}
