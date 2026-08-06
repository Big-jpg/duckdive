export const JOURNEY_STORAGE_KEY="duckdive.journey/v1";
export const JOURNEY_STATE_VERSION=1 as const;
export const JOURNEY_LIMITS={fileBytes:50*1024*1024,fileCount:10,totalBytes:250*1024*1024} as const;

export type JourneyFileStatus="arriving"|"floating"|"diving"|"transforming"|"lake_ready";
export type JourneyFile={
  id:string;name:string;size:number;extension:string;lastModified:number;
  status:JourneyFileStatus;statusStartedAt:number;nextTransitionAt:number;
};
export type JourneyState={version:typeof JOURNEY_STATE_VERSION;files:JourneyFile[];visualSeed:number;workerAvailableAt:number};
export type FileCandidate={name:string;size:number;lastModified:number};
export type IntakeRejection={name:string;reason:"duplicate"|"file_too_large"|"file_limit"|"batch_too_large"};

const statuses=new Set<JourneyFileStatus>(["arriving","floating","diving","transforming","lake_ready"]);
const ARRIVAL_MS=600,DIVE_MS=900;

export function emptyJourneyState(seed=1):JourneyState{return {version:JOURNEY_STATE_VERSION,files:[],visualSeed:seed,workerAvailableAt:0};}

export function stableNumber(value:string){let hash=2166136261;for(let index=0;index<value.length;index++){hash^=value.charCodeAt(index);hash=Math.imul(hash,16777619);}return hash>>>0;}
function duration(id:string,minimum:number,range:number){return minimum+(stableNumber(id)%range);}
function surfaceWait(id:string){return duration(`${id}:surface`,1_500,2_001);}
function transformWait(id:string){return duration(`${id}:transform`,3_000,5_001);}
function resurfaceWait(id:string){return duration(`${id}:resurface`,800,601);}
function extension(name:string){const dot=name.lastIndexOf(".");return dot>0&&dot<name.length-1?name.slice(dot+1).toUpperCase().slice(0,8):"FILE";}
export function fileFingerprint(file:FileCandidate){return `${file.name}\0${file.size}\0${file.lastModified}`;}

export function intakeJourneyFiles(
  candidates:readonly FileCandidate[],existing:readonly JourneyFile[],now:number,idFactory:(candidate:FileCandidate,index:number)=>string,
){
  const accepted:JourneyFile[]=[],rejected:IntakeRejection[]=[];
  const fingerprints=new Set(existing.map(file=>fileFingerprint(file)));
  let count=existing.length,totalBytes=existing.reduce((sum,file)=>sum+file.size,0);
  candidates.forEach((candidate,index)=>{
    if(fingerprints.has(fileFingerprint(candidate))){rejected.push({name:candidate.name,reason:"duplicate"});return;}
    if(candidate.size>JOURNEY_LIMITS.fileBytes){rejected.push({name:candidate.name,reason:"file_too_large"});return;}
    if(count>=JOURNEY_LIMITS.fileCount){rejected.push({name:candidate.name,reason:"file_limit"});return;}
    if(totalBytes+candidate.size>JOURNEY_LIMITS.totalBytes){rejected.push({name:candidate.name,reason:"batch_too_large"});return;}
    const id=idFactory(candidate,index),file:JourneyFile={id,name:candidate.name,size:candidate.size,extension:extension(candidate.name),lastModified:candidate.lastModified,status:"arriving",statusStartedAt:now,nextTransitionAt:now+ARRIVAL_MS};
    accepted.push(file);fingerprints.add(fileFingerprint(candidate));count++;totalBytes+=candidate.size;
  });
  return {accepted,rejected};
}

export function advanceJourneyState(input:JourneyState,now:number):JourneyState{
  let files=input.files.map(file=>({...file})),workerAvailableAt=input.workerAvailableAt,changed=false;
  for(let guard=0;guard<100;guard++){
    let progressed=false;
    files=files.map(file=>{
      if(file.status==="arriving"&&file.nextTransitionAt<=now){progressed=changed=true;const at=file.nextTransitionAt;return {...file,status:"floating",statusStartedAt:at,nextTransitionAt:at+surfaceWait(file.id)};}
      if(file.status==="diving"&&file.nextTransitionAt<=now){progressed=changed=true;const at=file.nextTransitionAt;return {...file,status:"transforming",statusStartedAt:at,nextTransitionAt:at+transformWait(file.id)};}
      if(file.status==="transforming"&&file.nextTransitionAt<=now){progressed=changed=true;const at=file.nextTransitionAt;workerAvailableAt=Math.max(workerAvailableAt,at+resurfaceWait(file.id));return {...file,status:"lake_ready",statusStartedAt:at,nextTransitionAt:at};}
      return file;
    });
    const active=files.some(file=>file.status==="diving"||file.status==="transforming");
    if(!active){
      const next=files.filter(file=>file.status==="floating"&&file.nextTransitionAt<=now).sort((a,b)=>a.nextTransitionAt-b.nextTransitionAt)[0];
      if(next){const at=Math.max(next.nextTransitionAt,workerAvailableAt);if(at<=now){files=files.map(file=>file.id===next.id?{...file,status:"diving",statusStartedAt:at,nextTransitionAt:at+DIVE_MS}:file);progressed=changed=true;}}
    }
    if(!progressed)break;
  }
  return changed?{...input,files,workerAvailableAt}:input;
}

function isFile(value:unknown):value is JourneyFile{
  if(!value||typeof value!=="object")return false;const item=value as Record<string,unknown>;
  return typeof item.id==="string"&&typeof item.name==="string"&&typeof item.size==="number"&&item.size>=0&&typeof item.extension==="string"&&typeof item.lastModified==="number"&&statuses.has(item.status as JourneyFileStatus)&&typeof item.statusStartedAt==="number"&&typeof item.nextTransitionAt==="number";
}
export function restoreJourneyState(serialized:string|null,now=Date.now()):JourneyState{
  if(!serialized)return emptyJourneyState();
  try{const value=JSON.parse(serialized) as Partial<JourneyState>;if(value.version!==JOURNEY_STATE_VERSION||!Array.isArray(value.files)||!value.files.every(isFile)||typeof value.visualSeed!=="number"||typeof value.workerAvailableAt!=="number")return emptyJourneyState();return advanceJourneyState(value as JourneyState,now);}catch{return emptyJourneyState();}
}
export function journeyActivity(files:readonly JourneyFile[]){
  const ready=files.filter(file=>file.status==="lake_ready").length,working=files.find(file=>file.status==="diving"||file.status==="transforming");
  return {ready,total:files.length,working,queued:files.length-ready-(working?1:0),label:working?`Transforming ${working.name}`:files.length===0?"Waiting for files":ready===files.length?"Lake ready":"Scanning the surface"};
}
