"use client";
/* eslint-disable react-hooks/refs, react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
import {useChat} from "@ai-sdk/react";
import {DefaultChatTransport,getToolName,isToolUIPart} from "ai";
import Link from "next/link";
import {useRouter,useSearchParams} from "next/navigation";
import {FormEvent,useEffect,useMemo,useRef,useState} from "react";
import AppBrand from "@/components/AppBrand";
import {clearDuckDiveDraft,loadDuckDiveDraft} from "@/lib/duckdive-draft";
import type {DatasetPublicContract} from "@/lib/datasets";

type DiveShare={id:string;slug:string;url:string;viewCount:number;createdAt:string};
type EditorDive={key:string;datasetKey:string;datasetTitle:string;title:string;label:string;description:string;entryPrompt:string;questions:string[];accent:string;diveId:string;contractVersion:string;publicContract:DatasetPublicContract};
type RunStatus="running"|"clarification"|"applied"|"no_change"|"failed"|"aborted";
type RunResult={runId:string;status:RunStatus;beforeVersion:number;afterVersion:number|null;summary:string|null;errorCode:string|null;durationMs:number|null;inputTokens:number;outputTokens:number};

const phaseLabels:Record<string,string>={inspect_data:"Checking Data",save_dive_revision:"Updating View"};
const outcomeLabels:Record<Exclude<RunStatus,"running">,string>={clarification:"One Detail Needed",applied:"Saved",no_change:"No Change",failed:"Could Not Save",aborted:"Stopped"};

function ContractView({contract,close}:{contract:DatasetPublicContract;close:()=>void}){
  return <section className="contract-view" aria-label="Data Contract">
    <header><h3>Data Contract</h3><button onClick={close} aria-label="Close data contract">Close</button></header>
    <p>{contract.scope}</p>
    <h4>Measures</h4><dl>{Object.entries(contract.measures).map(([name,meaning])=><div key={name}><dt>{name}</dt><dd>{meaning}</dd></div>)}</dl>
    <h4>Dimensions</h4><p>{contract.dimensions.join(" · ")}</p>
    <h4>Grains</h4>{contract.grains.map(item=><p key={item.name}><strong>{item.name}</strong><br/>{item.grain}</p>)}
    <h4>Caveats</h4><ul>{contract.caveats.map(item=><li key={item}>{item}</li>)}</ul>
  </section>;
}

function DuckDivePanel({diveId,starterKey,contract,active,version,onApplied,onError}:{diveId:string;starterKey:string;contract:DatasetPublicContract;active:boolean;version:number|null;onApplied:(version:number)=>Promise<void>;onError:(message:string)=>void}){
  const [input,setInput]=useState(""),[contractOpen,setContractOpen]=useState(false),[run,setRun]=useState<RunResult|null>(null),[resetting,setResetting]=useState(false);
  const chatId=useRef(crypto.randomUUID()),runId=useRef<string|null>(null),diveRef=useRef(diveId),versionRef=useRef(version),chatErrorRef=useRef<Error|null>(null);diveRef.current=diveId;versionRef.current=version;
  const transport=useMemo(()=>new DefaultChatTransport({api:"/api/chat",body:()=>({runId:runId.current,chatId:chatId.current,activeDiveId:diveRef.current,expectedVersion:versionRef.current})}),[]);
  const {messages,sendMessage,status,stop,error:chatError}=useChat({transport,id:chatId.current});chatErrorRef.current=chatError||null;
  const busy=status==="submitted"||status==="streaming";

  useEffect(()=>{const draft=loadDuckDiveDraft(sessionStorage,starterKey);if(draft)setInput(current=>current||draft);},[starterKey]);

  async function pollRun(id:string){
    for(let attempt=0;attempt<24;attempt++){
      const response=await fetch(`/api/duckdive/runs/${id}`,{cache:"no-store"});
      if(response.ok){const result=(await response.json()).run as RunResult;setRun(result);if(result.status!=="running"){if(result.status==="applied"&&result.afterVersion)await onApplied(result.afterVersion);return;}}
      else if(response.status===404&&attempt>=2){setRun(current=>current?{...current,status:"failed",summary:chatErrorRef.current?.message||"The request did not start."}:current);return;}
      await new Promise(resolve=>setTimeout(resolve,750));
    }
    onError("The request is still being verified. Refresh this page to check the saved version.");
  }

  const previousStatus=useRef(status);useEffect(()=>{
    const wasBusy=previousStatus.current==="submitted"||previousStatus.current==="streaming";
    if(wasBusy&&!busy&&runId.current)void pollRun(runId.current);
    previousStatus.current=status;
  },[status]);

  function submit(event:FormEvent){
    event.preventDefault();const request=input.trim();if(!request||busy||!version)return;
    const id=crypto.randomUUID();runId.current=id;setRun({runId:id,status:"running",beforeVersion:version,afterVersion:null,summary:null,errorCode:null,durationMs:null,inputTokens:0,outputTokens:0});
    void sendMessage({text:request});clearDuckDiveDraft(sessionStorage,starterKey);setInput("");
  }

  async function stopRun(){const id=runId.current;if(id)await fetch(`/api/duckdive/runs/${id}`,{method:"DELETE"});await stop();}
  async function reset(){
    if(!version||resetting||!window.confirm("Reset this Dive to its starter report? Your current report remains available in version history."))return;
    setResetting(true);const response=await fetch(`/api/dives/${diveId}/reset`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({expectedVersion:version})}),body=await response.json();
    if(response.ok){const status=body.noChange?"no_change":"applied";setRun({runId:"reset",status,beforeVersion:body.beforeVersion,afterVersion:body.afterVersion,summary:body.noChange?"This Dive already matches its starter.":"Starter report restored as a new, reversible version.",errorCode:null,durationMs:null,inputTokens:0,outputTokens:0});if(!body.noChange)await onApplied(body.afterVersion);}else onError(body.error||"Reset failed");setResetting(false);
  }

  return <aside className="chat-panel" hidden={!active}>
    <header><h2>DuckDive</h2><div><button onClick={()=>setContractOpen(value=>!value)}>{contractOpen?"Conversation":"Data Contract"}</button><button disabled={!version||resetting||busy} onClick={reset}>{resetting?"Resetting…":"Reset to Starter"}</button></div></header>
    {contractOpen?<ContractView contract={contract} close={()=>setContractOpen(false)}/>:<div className="chat-messages" aria-live="polite">
      {!messages.length&&!run?<p className="chat-empty">Describe what this report should make clear.</p>:null}
      {messages.map(message=><div key={message.id} className={`chat-message ${message.role}`}>{message.parts.map((part,index)=>part.type==="text"?<p key={index}>{part.text}</p>:isToolUIPart(part)?<small key={index}>{phaseLabels[getToolName(part)]||"Verifying"}</small>:null)}</div>)}
      {busy?<div className="chat-phase">{status==="submitted"?"Understanding":"Verifying"}</div>:null}
      {run&&run.status!=="running"?<div className={`run-outcome ${run.status}`}><strong>{run.status==="applied"&&run.afterVersion?`Saved as v${run.afterVersion}`:outcomeLabels[run.status]}</strong>{run.summary?<p>{run.summary}</p>:run.errorCode?<p>{run.errorCode.replaceAll("_"," ")}</p>:null}</div>:null}
    </div>}
    <form onSubmit={submit}><label className="sr-only" htmlFor={`dive-change-${diveId}`}>Describe the report change</label><textarea id={`dive-change-${diveId}`} value={input} onChange={event=>setInput(event.target.value)} placeholder="What should this report show?" maxLength={4000} autoComplete="off"/><div><span>{input.length.toLocaleString("en-AU")} / 4,000 characters</span>{busy?<button type="button" onClick={stopRun}>Stop</button>:<button disabled={!input.trim()||!version}>Apply</button>}</div></form>
  </aside>;
}

export default function EditLab(){
  const router=useRouter(),params=useSearchParams(),[dives,setDives]=useState<EditorDive[]>([]),[activeKey,setActiveKey]=useState(params.get("key")||""),[embed,setEmbed]=useState(""),[error,setError]=useState(""),[versions,setVersions]=useState<Record<string,number>>({}),[reverting,setReverting]=useState(false),[share,setShare]=useState<DiveShare|null>(null),[shareStatus,setShareStatus]=useState(""),[sharing,setSharing]=useState(false),activeDive=dives.find(dive=>dive.key===activeKey)||dives[0],activeId=activeDive?.diveId,version=activeId?versions[activeId]||null:null;
  const activeRef=useRef<string|undefined>(activeId);activeRef.current=activeId;

  async function loadShare(id:string){const response=await fetch(`/api/dives/${id}/share`,{cache:"no-store"});const body=await response.json();if(response.ok)setShare(body.share||null);}
  async function refresh(id=activeRef.current){
    if(!id)return;setError("");const response=await fetch(`/api/dives/${id}/embed`,{cache:"no-store"});
    if(response.status===401){router.replace(`/login?next=${encodeURIComponent(`/edit?key=${activeKey}`)}`);return;}
    const body=await response.json();if(!response.ok){setError(body.error||"Embed unavailable");return;}setEmbed(body.session);
    const versionResponse=await fetch(`/api/dives/${id}/version`,{cache:"no-store"}),versionBody=await versionResponse.json();if(versionResponse.ok)setVersions(current=>({...current,[id]:Number(versionBody.version)}));await loadShare(id);
  }
  useEffect(()=>{fetch("/api/edit",{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"}).then(async response=>{if(response.status===401){router.replace(`/login?next=${encodeURIComponent(`/edit?key=${activeKey}`)}`);return null;}const body=await response.json();if(!response.ok)throw new Error(body.error||"Workspace unavailable");return body;}).then(body=>{if(body){const manifest=body.dives as EditorDive[];setDives(manifest);setActiveKey(current=>manifest.some(dive=>dive.key===current)?current:manifest[0]?.key||"");}}).catch(reason=>setError(reason.message));},[router]);
  useEffect(()=>{if(activeId){setEmbed("");setError("");setShare(null);setShareStatus("");void refresh(activeId);}},[activeId]);

  async function revert(){if(!activeId||!version||version<=1)return;setReverting(true);const response=await fetch(`/api/dives/${activeId}/revert`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({version:version-1})});if(response.ok)await refresh(activeId);else setError((await response.json()).error||"Revert failed");setReverting(false);}
  async function publish(){if(!activeId||sharing)return;setSharing(true);setShareStatus("");const response=await fetch(`/api/dives/${activeId}/share`,{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"}),body=await response.json();if(!response.ok){setShareStatus(body.error||"Could not publish link");setSharing(false);return;}setShare(body.share);try{await navigator.clipboard.writeText(body.share.url);setShareStatus("Published · link copied");}catch{setShareStatus("Published · copy link when ready");}setSharing(false);}
  async function copyShare(){if(!share)return;try{await navigator.clipboard.writeText(share.url);setShareStatus("Link copied");}catch{setShareStatus(share.url);}}
  async function revokeShare(){if(!activeId||!share||sharing||!window.confirm("Revoke this public link? Anyone using it will lose access immediately."))return;setSharing(true);const response=await fetch(`/api/dives/${activeId}/share`,{method:"DELETE",headers:{"Content-Type":"application/json"},body:"{}"});if(response.ok){setShare(null);setShareStatus("Link revoked");}else setShareStatus((await response.json()).error||"Could not revoke link");setSharing(false);}

  return <main id="main-content" className="edit-lab"><header className="lab-header"><AppBrand/><div className="edit-tabs" role="tablist" aria-label="Dive to edit">{dives.map(dive=><button role="tab" aria-selected={activeDive?.key===dive.key} key={dive.key} className={activeDive?.key===dive.key?"active":""} onClick={()=>setActiveKey(dive.key)}>{dive.label}</button>)}</div><Link href="/workspace">Close</Link></header><div className="edit-grid"><section className="edit-canvas"><div className="edit-toolbar"><span><i/> {activeDive?`${activeDive.datasetTitle} · ${activeDive.title} · `:""}{version?`v${version}`:"Live"}{shareStatus?` · ${shareStatus}`:share?` · shared · ${share.viewCount} views`:""}</span><div>{share?<><button disabled={sharing} onClick={copyShare}>Copy Link</button><button disabled={sharing} onClick={revokeShare}>Revoke</button></>:<button disabled={!activeId||sharing} onClick={publish}>{sharing?"Publishing…":"Share"}</button>}<button onClick={()=>refresh()}>Refresh</button><button disabled={!version||version<=1||reverting} onClick={revert}>{reverting?"Reverting…":"Undo Version"}</button></div></div>{error?<div className="lab-error" role="alert">{error}</div>:embed?<iframe key={embed} title="Editable Dive" src={`https://embed-motherduck.com/sandbox/#session=${embed}`} sandbox="allow-scripts allow-same-origin"/>:<div className="lab-loading" role="status">Preparing…</div>}</section>{dives.map(dive=><DuckDivePanel key={dive.diveId} diveId={dive.diveId} starterKey={dive.key} contract={dive.publicContract} active={dive.diveId===activeId} version={versions[dive.diveId]||null} onApplied={async()=>refresh(dive.diveId)} onError={setError}/>)}</div></main>;
}
