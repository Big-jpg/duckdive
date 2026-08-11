import {randomUUID} from "node:crypto";
import {spawn} from "node:child_process";
import {mkdtemp,readFile,rm} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {AutotraderVehicleMarketAdapter,buildAutotraderUrl} from "./autotrader-adapter";
import {canonicalVehicleMarketScope,vehicleMarketScopeV1Schema,type ProcessedVehicleMarketRun,type VehicleMarketReplayManifestV1,type VehicleMarketRequestAttemptV1,type VehicleMarketScopeV1} from "./contracts";
import {processVehicleMarketRawPages,type RawPageInput} from "./pipeline";
import type {RawObjectStore} from "./raw-object-store";

export type LiveAcquisitionMode="smoke"|"full";
export const VEHICLE_MARKET_USER_AGENT="DuckDiveVehicleMarket/1.0 (+https://duckdive.gold)";
export type LiveAcquisitionOptions={
  mode:LiveAcquisitionMode;
  scope?:VehicleMarketScopeV1;
  store:RawObjectStore;
  fetchImpl?:typeof fetch;
  env?:Record<string,string|undefined>;
  delayMs?:number;
  timeoutMs?:number;
  maxAttempts?:number;
  smokeMaxPages?:number;
  now?:()=>Date;
  sleep?:(milliseconds:number)=>Promise<void>;
};

export class VehicleMarketAuthorizationError extends Error{}

type SourceHttpResponse={status:number;headers:Headers;bytes:Buffer};

function responseHeaders(raw:string){
  const blocks=raw.split(/\r?\n\r?\n/).filter(value=>/^HTTP\//i.test(value.trim())),block=blocks.at(-1);
  if(!block)throw new Error("curl response headers are unavailable");
  const lines=block.split(/\r?\n/),match=/^HTTP\/\S+\s+(\d{3})\b/i.exec(lines.shift()??"");
  if(!match)throw new Error("curl response status is unavailable");
  const headers=new Headers();
  for(const line of lines){const separator=line.indexOf(":");if(separator>0)headers.append(line.slice(0,separator).trim(),line.slice(separator+1).trim());}
  return {status:Number(match[1]),headers};
}

async function curlRequest(url:string,timeoutMs:number,signal:AbortSignal):Promise<SourceHttpResponse>{
  const directory=await mkdtemp(path.join(os.tmpdir(),"duckdive-vehicle-http-")),headerPath=path.join(directory,"headers.txt"),executable=process.platform==="win32"?"curl.exe":"curl";
  try{
    const result=await new Promise<{code:number|null;stdout:Buffer;stderr:string}>((resolve,reject)=>{
      const child=spawn(executable,["--silent","--show-error","--compressed","--max-time",String(Math.max(1,Math.ceil(timeoutMs/1000))),"--request","GET","--header","accept: application/json","--dump-header",headerPath,"--output","-",url],{windowsHide:true,stdio:["ignore","pipe","pipe"]}),stdout:Buffer[]=[] ,stderr:Buffer[]=[];
      const abort=()=>child.kill();signal.addEventListener("abort",abort,{once:true});
      child.stdout.on("data",chunk=>stdout.push(Buffer.from(chunk)));child.stderr.on("data",chunk=>stderr.push(Buffer.from(chunk)));
      child.once("error",reject);child.once("close",code=>{signal.removeEventListener("abort",abort);resolve({code,stdout:Buffer.concat(stdout),stderr:Buffer.concat(stderr).toString("utf8")});});
    });
    if(result.code!==0){const error=new Error(`curl request failed with exit code ${result.code}${result.stderr.trim()?`: ${result.stderr.trim().slice(0,300)}`:""}`);if(result.code===28||signal.aborted)error.name="AbortError";throw error;}
    const {status,headers}=responseHeaders(await readFile(headerPath,"utf8"));return {status,headers,bytes:result.stdout};
  }finally{await rm(directory,{recursive:true,force:true});}
}

export function assertLiveAcquisitionAuthorized(mode:LiveAcquisitionMode,env:Record<string,string|undefined>=process.env){
  if(env.VEHICLE_MARKET_SOURCE_ENABLED!=="true")throw new VehicleMarketAuthorizationError("HUMAN ACTION REQUIRED\n\nPurpose:\nEnable an explicitly requested source call.\n\nAction:\nSet VEHICLE_MARKET_SOURCE_ENABLED=true in the operator environment.\n\nThen reply:\nready");
  if(mode==="full"&&env.VEHICLE_MARKET_ALLOW_FULL_WA_COLLECTION!=="true")throw new VehicleMarketAuthorizationError("HUMAN ACTION REQUIRED\n\nPurpose:\nConfirm licensing or permission for a full WA Used collection.\n\nAction:\nSet VEHICLE_MARKET_ALLOW_FULL_WA_COLLECTION=true in the operator environment.\n\nThen reply:\nready");
}

function retryAfterMilliseconds(headers:Headers,attempt:number,delayMs:number){
  const value=headers.get("retry-after");
  if(value){const seconds=Number(value);if(Number.isFinite(seconds)&&seconds>=0)return seconds*1000;const date=Date.parse(value);if(Number.isFinite(date))return Math.max(0,date-Date.now());}
  return Math.min(30_000,delayMs*(2**Math.max(0,attempt-1)));
}

export async function captureLiveVehicleMarket(options:LiveAcquisitionOptions):Promise<ProcessedVehicleMarketRun>{
  assertLiveAcquisitionAuthorized(options.mode,options.env);
  const scope=vehicleMarketScopeV1Schema.parse(options.scope??canonicalVehicleMarketScope());
  if(options.mode==="full"&&Object.keys(scope).some(key=>!["scopeVersion","state","condition","sortBy","orderBy","pageSize"].includes(key)))throw new Error("Full WA Used collection cannot include optional filters");
  const adapter=new AutotraderVehicleMarketAdapter(),fetchImpl=options.fetchImpl??fetch,delayMs=options.delayMs??Number(options.env?.VEHICLE_MARKET_REQUEST_DELAY_MS??process.env.VEHICLE_MARKET_REQUEST_DELAY_MS??1000),timeoutMs=options.timeoutMs??30_000,maxAttempts=options.maxAttempts??3,sleep=options.sleep??(milliseconds=>new Promise(resolve=>setTimeout(resolve,milliseconds))),now=options.now??(()=>new Date()),runId=randomUUID(),observationDate=now().toISOString().slice(0,10),inputs:RawPageInput[]=[],attempts:VehicleMarketRequestAttemptV1[]=[];
  const run:VehicleMarketReplayManifestV1={schemaVersion:"vehicle-market-replay/v1",runId,observationDate,scope,pages:[]};

  async function requestPage(pageNumber:number,requestRole:"capture"|"consistency_probe"){
    const requestUrl=buildAutotraderUrl(scope,pageNumber);
    for(let attemptNumber=1;attemptNumber<=maxAttempts;attemptNumber++){
      const requestedAt=now().toISOString(),controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
      try{
        const response=options.fetchImpl?await (async()=>{const value=await fetchImpl(requestUrl,{headers:{accept:"application/json","user-agent":VEHICLE_MARKET_USER_AGENT},signal:controller.signal});return {status:value.status,headers:value.headers,bytes:Buffer.from(await value.arrayBuffer())};})():await curlRequest(requestUrl,timeoutMs,controller.signal),bytes=response.bytes,responseReceivedAt=now().toISOString(),input:RawPageInput={requestRole,pageNumber,attemptNumber,requestUrl,requestedAt,responseReceivedAt,httpStatus:response.status,bytes};
        inputs.push(input);
        const stored=await options.store.putImmutable({runId,observationDate,pageNumber,requestRole,attemptNumber,bytes});
        attempts.push({requestRole,pageNumber,attemptNumber,requestUrl,requestedAt,completedAt:responseReceivedAt,durationMs:Math.max(0,Date.parse(responseReceivedAt)-Date.parse(requestedAt)),httpStatus:response.status,objectPath:stored.objectPath,payloadSha256:stored.payloadSha256,networkErrorCode:null});
        if(response.status>=200&&response.status<300)return input;
        if(response.status!==429&&response.status<500)return input;
        if(attemptNumber<maxAttempts)await sleep(retryAfterMilliseconds(response.headers,attemptNumber,delayMs));
      }catch(error){
        const completedAt=now().toISOString();attempts.push({requestRole,pageNumber,attemptNumber,requestUrl,requestedAt,completedAt,durationMs:Math.max(0,Date.parse(completedAt)-Date.parse(requestedAt)),httpStatus:null,objectPath:null,payloadSha256:null,networkErrorCode:error instanceof Error&&error.name==="AbortError"?"request-timeout":"network-error"});
        if(attemptNumber===maxAttempts)throw error;
        await sleep(Math.min(30_000,delayMs*(2**Math.max(0,attemptNumber-1))));
      }finally{clearTimeout(timer);}
    }
    return null;
  }

  let first:RawPageInput|null=null;
  try{first=await requestPage(1,"capture");}catch{}
  if(!first){const result=await processVehicleMarketRawPages(run,inputs,options.store,adapter);result.requestAttempts=attempts;return result;}
  let parsed;
  try{parsed=first.httpStatus>=200&&first.httpStatus<300?adapter.parsePage(first.bytes):null;}catch{const result=await processVehicleMarketRawPages(run,inputs,options.store,adapter);result.requestAttempts=attempts;return result;}
  if(!parsed){const result=await processVehicleMarketRawPages(run,inputs,options.store,adapter);result.requestAttempts=attempts;return result;}
  const maximumPage=options.mode==="smoke"?Math.min(parsed.metadata.lastPage,options.smokeMaxPages??10):parsed.metadata.lastPage;
  for(let page=2;page<=maximumPage;page++){await sleep(delayMs);try{await requestPage(page,"capture");}catch{break;}}
  await sleep(delayMs);try{await requestPage(1,"consistency_probe");}catch{}
  const result=await processVehicleMarketRawPages(run,inputs,options.store,adapter);result.requestAttempts=attempts;return result;
}
