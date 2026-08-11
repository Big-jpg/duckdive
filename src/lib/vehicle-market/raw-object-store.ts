import {mkdir,readFile,writeFile} from "node:fs/promises";
import path from "node:path";
import {sha256Hex,type VehicleMarketRequestRole} from "./contracts";

export type RawObjectInput={
  runId:string;
  observationDate:string;
  pageNumber:number;
  requestRole:VehicleMarketRequestRole;
  attemptNumber:number;
  bytes:Buffer;
};

export type StoredRawObject={objectPath:string;payloadSha256:string;responseBytes:number};

export interface RawObjectStore{
  putImmutable(input:RawObjectInput):Promise<StoredRawObject>;
  read(objectPath:string):Promise<Buffer>;
}

export interface RawManifestStore extends RawObjectStore{
  putManifest(runId:string,observationDate:string,bytes:Buffer):Promise<StoredRawObject>;
}

function safeSegment(value:string,label:string){
  if(!/^[A-Za-z0-9._-]+$/.test(value))throw new Error(`Unsafe ${label}`);
  return value;
}

export class LocalRawObjectStore implements RawObjectStore{
  constructor(private readonly root=path.resolve(".vehicle-market-evidence","objects")){}

  async putImmutable(input:RawObjectInput):Promise<StoredRawObject>{
    const hash=sha256Hex(input.bytes),run=safeSegment(input.runId,"run ID"),date=safeSegment(input.observationDate,"observation date");
    const role=input.requestRole==="capture"?`page=${String(input.pageNumber).padStart(6,"0")}`:`probe=page-${String(input.pageNumber).padStart(6,"0")}`;
    const relative=path.join("vehicle-market","source=autotrader","market=wa-used",`observation_date=${date}`,`run_id=${run}`,role,`attempt=${input.attemptNumber}`,`${hash}.json`);
    const target=path.resolve(this.root,relative);
    if(!target.startsWith(`${this.root}${path.sep}`))throw new Error("Raw-object path escaped the evidence root");
    await mkdir(path.dirname(target),{recursive:true});
    try{await writeFile(target,input.bytes,{flag:"wx"});}
    catch(error){
      if((error as NodeJS.ErrnoException).code!=="EEXIST")throw error;
      const existing=await readFile(target);
      if(!existing.equals(input.bytes))throw new Error("Immutable raw-object conflict");
    }
    return {objectPath:target,payloadSha256:hash,responseBytes:input.bytes.byteLength};
  }

  async read(objectPath:string){
    const resolved=path.resolve(objectPath);
    if(!resolved.startsWith(`${this.root}${path.sep}`))throw new Error("Raw-object read escaped the evidence root");
    return readFile(resolved);
  }
}

export class VercelBlobRawObjectStore implements RawObjectStore{
  constructor(private readonly token=process.env.BLOB_READ_WRITE_TOKEN){if(!token)throw new Error("HUMAN ACTION REQUIRED\n\nPurpose:\nUse the existing DuckDive private Blob store for immutable vehicle-market evidence.\n\nAction:\nProvide BLOB_READ_WRITE_TOKEN through the ignored operator environment.\n\nThen reply:\nready");}

  private pathname(input:RawObjectInput,hash:string){
    const run=safeSegment(input.runId,"run ID"),date=safeSegment(input.observationDate,"observation date"),role=input.requestRole==="capture"?`page=${String(input.pageNumber).padStart(6,"0")}`:`probe=page-${String(input.pageNumber).padStart(6,"0")}`;
    return path.posix.join("vehicle-market","source=autotrader","market=wa-used",`observation_date=${date}`,`run_id=${run}`,role,`attempt=${input.attemptNumber}`,`${hash}.json`);
  }

  async putImmutable(input:RawObjectInput):Promise<StoredRawObject>{
    const payloadSha256=sha256Hex(input.bytes),pathname=this.pathname(input,payloadSha256),{head,put}=await import("@vercel/blob");
    let objectUrl:string;
    try{objectUrl=(await put(pathname,input.bytes,{access:"private",addRandomSuffix:false,contentType:"application/json",token:this.token})).url;}
    catch(error){
      const existing=await head(pathname,{token:this.token});
      if(!existing)throw error;
      objectUrl=existing.url;
      if(sha256Hex(await this.read(objectUrl))!==payloadSha256)throw new Error("Immutable Blob raw-object conflict");
    }
    return {objectPath:objectUrl,payloadSha256,responseBytes:input.bytes.byteLength};
  }

  async read(objectPath:string){
    const {get}=await import("@vercel/blob"),result=await get(objectPath,{access:"private",token:this.token});
    if(!result||result.statusCode!==200||!result.stream)throw new Error(`Private Blob read failed${result?` with HTTP ${result.statusCode}`:""}`);
    return Buffer.from(await new Response(result.stream).arrayBuffer());
  }

  async putManifest(runId:string,observationDate:string,bytes:Buffer){
    const hash=sha256Hex(bytes),pathname=path.posix.join("vehicle-market","source=autotrader","market=wa-used",`observation_date=${safeSegment(observationDate,"observation date")}`,`run_id=${safeSegment(runId,"run ID")}`,"manifest",`${hash}.json`),{put}=await import("@vercel/blob");
    let objectUrl:string;
    try{objectUrl=(await put(pathname,bytes,{access:"private",addRandomSuffix:false,contentType:"application/json",token:this.token})).url;}
    catch(error){
      const {head}=await import("@vercel/blob"),existing=await head(pathname,{token:this.token});if(!existing)throw error;objectUrl=existing.url;
      if(sha256Hex(await this.read(objectUrl))!==hash)throw new Error("Immutable Blob manifest conflict");
    }
    return {objectPath:objectUrl,payloadSha256:hash,responseBytes:bytes.byteLength};
  }
}
