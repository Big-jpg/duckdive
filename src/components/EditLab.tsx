"use client";
/* eslint-disable react-hooks/refs, react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
import {useChat} from "@ai-sdk/react";
import {DefaultChatTransport} from "ai";
import Link from "next/link";
import {useRouter,useSearchParams} from "next/navigation";
import {FormEvent,useEffect,useMemo,useRef,useState} from "react";
import AppBrand from "@/components/AppBrand";
import {clearDuckDiveDraft,loadDuckDiveDraft} from "@/lib/duckdive-draft";
import {readableDuckDiveError} from "@/lib/duckdive-error";
import type {DatasetPublicContract} from "@/lib/datasets";
import type {ReportVersionMetadata} from "@/lib/duckdive-report";

type DiveShare={id:string;slug:string;url:string;viewCount:number;createdAt:string};
type EditorDive={key:string;datasetKey:string;datasetTitle:string;title:string;label:string;description:string;outcome:string;entryPrompt:string;questions:string[];accent:string;diveId:string;contractVersion:string;publicContract:DatasetPublicContract};
type RunStatus="running"|"clarification"|"applied"|"no_change"|"failed"|"aborted";
type RunResult={runId:string;status:RunStatus;beforeVersion:number;afterVersion:number|null;summary:string|null;errorCode:string|null;durationMs:number|null;inputTokens:number;outputTokens:number};
type SidebarTab="summary"|"changes"|"ideas"|"contract";
type EditorPane="report"|"duckdive";

const outcomeLabels:Record<Exclude<RunStatus,"running">,string>={clarification:"One Detail Needed",applied:"Saved",no_change:"No Change",failed:"Could Not Save",aborted:"Stopped"};

function ContractView({contract}:{contract:DatasetPublicContract}){
  return <section className="contract-view" aria-label="Technical Contract"><p>{contract.scope}</p><h4>Measures</h4><dl>{Object.entries(contract.measures).map(([name,meaning])=><div key={name}><dt>{name.replaceAll("_"," ")}</dt><dd>{meaning}</dd></div>)}</dl><h4>Dimensions</h4><p>{contract.dimensions.join(" · ")}</p><h4>Grains</h4>{contract.grains.map(item=><p key={item.name}><strong>{item.name}</strong><br/>{item.grain}</p>)}<h4>Validation rules and caveats</h4><ul>{contract.caveats.map(item=><li key={item}>{item}</li>)}</ul></section>;
}

function SummaryView({report}:{report:ReportVersionMetadata|null}){
  if(!report)return <div className="report-empty">Report explanation unavailable for this version.</div>;
  const {purpose}=report;return <section className="report-view"><p className="report-kicker">What this report shows</p><h3>{purpose.title}</h3><p>{purpose.summary}</p><h4>Current scope</h4><dl className="report-facts">{purpose.scope.items.map(item=><div key={item.id}><dt>{item.label}</dt><dd>{item.values.join(", ")}</dd></div>)}{purpose.scope.dateRange?<div><dt>Period</dt><dd>{purpose.scope.dateRange.start}–{purpose.scope.dateRange.end}</dd></div>:null}</dl><h4>What I understood</h4><p>{purpose.goal}</p><div className="confidence"><strong>Confidence: {purpose.confidence.level}</strong>{purpose.confidence.reason?<span>{purpose.confidence.reason}</span>:null}</div><h4>Assumptions</h4><ul>{purpose.assumptions.filter(item=>item.material).map(item=><li key={item.id}>{item.label}{item.explanation?<small>{item.explanation}</small>:null}</li>)}</ul><h4>This report can answer</h4><ul className="capability-list">{purpose.capabilities.map(item=><li key={item.id}>✓ {item.label}</li>)}</ul><h4>This report cannot answer</h4><ul className="unsupported-list">{purpose.limitations.map(item=><li key={item.id}>× {item.label}<small>{item.reason}</small></li>)}</ul></section>;
}

function ChangesView({report, messages}:{report:ReportVersionMetadata|null;messages:ReturnType<typeof useChat>["messages"]}){
  if(!report)return <div className="report-empty">No saved change manifest yet.</div>;
  const manifest=report.manifest;return <section className="report-view"><p className="report-kicker">Report updated · v{manifest.version}</p><h3>What changed</h3>{manifest.applied.added.length?<><h4>Added</h4><ul>{manifest.applied.added.map(item=><li key={item}>{item}</li>)}</ul></>:null}{manifest.applied.changed.length?<><h4>Changed</h4><ul>{manifest.applied.changed.map(item=><li key={item}>{item}</li>)}</ul></>:null}{manifest.applied.removed.length?<><h4>Removed</h4><ul>{manifest.applied.removed.map(item=><li key={item}>{item}</li>)}</ul></>:null}{manifest.applied.unchanged.length?<><h4>Unchanged</h4><ul>{manifest.applied.unchanged.map(item=><li key={item}>{item}</li>)}</ul></>:null}<details><summary>Requested change</summary><p>{manifest.interpretedIntent}</p></details><h4>Validation</h4><ul className="validation-list">{manifest.validations.map(item=><li className={item.status} key={item.id}><strong>{item.status}</strong> {item.label}{item.detail?<small>{item.detail}</small>:null}</li>)}</ul><details className="conversation"><summary>Conversation</summary>{messages.map(message=><p key={message.id}><strong>{message.role}:</strong> {message.parts.map(part=>part.type==="text"?part.text:"").join("")}</p>)}</details></section>;
}

function IdeasView({report}:{report:ReportVersionMetadata|null}){return <section className="report-view"><p className="report-kicker">Supported by the active contract</p><h3>Ideas for this report</h3>{report?.purpose.capabilities.map(capability=><div className="suggestion-group" key={capability.id}><strong>{capability.label}</strong><ul>{capability.examples.map(example=><li key={example}>{example}</li>)}</ul></div>)}</section>;}

function DuckDivePanel({diveId,starterKey,contract,report,active,version,onApplied,onError}:{diveId:string;starterKey:string;contract:DatasetPublicContract;report:ReportVersionMetadata|null;active:boolean;version:number|null;onApplied:(version:number)=>Promise<void>;onError:(message:string)=>void}){
  const [input,setInput]=useState(""),[tab,setTab]=useState<SidebarTab>("summary"),[run,setRun]=useState<RunResult|null>(null),[resetting,setResetting]=useState(false);
  const chatId=useRef(crypto.randomUUID()),runId=useRef<string|null>(null),lastRequest=useRef(""),diveRef=useRef(diveId),versionRef=useRef(version),chatErrorRef=useRef<Error|null>(null);diveRef.current=diveId;versionRef.current=version;
  const transport=useMemo(()=>new DefaultChatTransport({api:"/api/chat",body:()=>({runId:runId.current,chatId:chatId.current,activeDiveId:diveRef.current,expectedVersion:versionRef.current})}),[]);
  const {messages,sendMessage,status,stop,error:chatError}=useChat({transport,id:chatId.current});chatErrorRef.current=chatError||null;
  const busy=status==="submitted"||status==="streaming";

  useEffect(()=>{const draft=loadDuckDiveDraft(sessionStorage,starterKey);if(draft){setInput(current=>current||draft);setTab("ideas");}},[starterKey]);

  async function pollRun(id:string){
    for(let attempt=0;attempt<24;attempt++){
      const response=await fetch(`/api/duckdive/runs/${id}`,{cache:"no-store"});
      if(response.ok){const result=(await response.json()).run as RunResult;setRun(result);if(result.status!=="running"){setTab("changes");if(result.status==="failed")setInput(current=>current||lastRequest.current);else lastRequest.current="";if(result.status==="applied"&&result.afterVersion)await onApplied(result.afterVersion);return;}}
      else if(response.status===404&&attempt>=2){setRun(current=>current?{...current,status:"failed",summary:readableDuckDiveError(chatErrorRef.current)}:current);setInput(current=>current||lastRequest.current);setTab("changes");return;}
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
    const id=crypto.randomUUID();runId.current=id;lastRequest.current=request;setRun({runId:id,status:"running",beforeVersion:version,afterVersion:null,summary:null,errorCode:null,durationMs:null,inputTokens:0,outputTokens:0});
    void sendMessage({text:request});clearDuckDiveDraft(sessionStorage,starterKey);setInput("");
  }

  async function stopRun(){const id=runId.current;if(id)await fetch(`/api/duckdive/runs/${id}`,{method:"DELETE"});await stop();}
  async function reset(){
    if(!version||resetting||!window.confirm("Reset this Dive to its starter report? Your current report remains available in version history."))return;
    setResetting(true);const response=await fetch(`/api/dives/${diveId}/reset`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({expectedVersion:version})}),body=await response.json();
    if(response.ok){const status=body.noChange?"no_change":"applied";setRun({runId:"reset",status,beforeVersion:body.beforeVersion,afterVersion:body.afterVersion,summary:body.noChange?"This Dive already matches its starter.":"Starter report restored as a new, reversible version.",errorCode:null,durationMs:null,inputTokens:0,outputTokens:0});if(!body.noChange)await onApplied(body.afterVersion);}else onError(body.error||"Reset failed");setResetting(false);
  }

  return <aside className="chat-panel" hidden={!active}>
    <header><div><p>DuckDive</p><h2>Change This Report</h2></div><button disabled={!version||resetting||busy} onClick={reset}>{resetting?"Resetting…":"Reset to Starter"}</button></header>
    <nav className="report-tabs" role="tablist" aria-label="Report explanation">{([["summary","Summary","Summary"],["changes","Changes","Changes"],["ideas","Ideas","Ideas for This Report"],["contract","Contract","Technical Contract"]] as const).map(([key,label,ariaLabel])=><button key={key} role="tab" aria-label={ariaLabel} aria-selected={tab===key} onClick={()=>setTab(key)}>{label}</button>)}</nav>
    <div className="report-scroll" aria-live="polite">{tab==="summary"?<SummaryView report={report}/>:tab==="changes"?<ChangesView report={report} messages={messages}/>:tab==="ideas"?<IdeasView report={report}/>:<ContractView contract={contract}/>} {busy?<div className="chat-phase">{status==="submitted"?"Understanding…":"Verifying…"}</div>:null}{tab==="changes"&&run&&run.status!=="running"?<div className={`run-outcome ${run.status}`}><strong>{run.status==="applied"&&run.afterVersion?`Saved as v${run.afterVersion}`:outcomeLabels[run.status]}</strong>{run.summary?<p>{run.summary}</p>:run.errorCode?<p>{run.errorCode.replaceAll("_"," ")}</p>:null}</div>:null}</div>
    <form onSubmit={submit}><label className="chat-prompt-label" htmlFor={`dive-change-${diveId}`}>Describe the Report Change</label><textarea id={`dive-change-${diveId}`} name="report-change" value={input} onChange={event=>setInput(event.target.value)} placeholder="For example: compare the last 5 years…" maxLength={4000} autoComplete="off"/><div><span>{input.length.toLocaleString("en-AU")} / 4,000 characters</span>{busy?<button type="button" onClick={stopRun}>Stop</button>:<button disabled={!input.trim()||!version}>Apply Change</button>}</div></form>
  </aside>;
}

export default function EditLab(){
  const router=useRouter(),params=useSearchParams(),[dives,setDives]=useState<EditorDive[]>([]),[activeKey,setActiveKey]=useState(params.get("key")||""),[pane,setPane]=useState<EditorPane>(params.get("pane")==="duckdive"?"duckdive":"report"),[embed,setEmbed]=useState(""),[error,setError]=useState(""),[versions,setVersions]=useState<Record<string,number>>({}),[reports,setReports]=useState<Record<string,ReportVersionMetadata|null>>({}),[reverting,setReverting]=useState(false),[share,setShare]=useState<DiveShare|null>(null),[shareStatus,setShareStatus]=useState(""),[sharing,setSharing]=useState(false),activeDive=dives.find(dive=>dive.key===activeKey)||dives[0],activeId=activeDive?.diveId,version=activeId?versions[activeId]||null:null;
  const activeRef=useRef<string|undefined>(activeId);activeRef.current=activeId;

  function updateEditorState(key:string,nextPane:EditorPane){
    setActiveKey(key);setPane(nextPane);router.replace(`/edit?key=${encodeURIComponent(key)}&pane=${nextPane}`,{scroll:false});
  }
  async function refresh(id=activeRef.current){
    if(!id)return;setError("");
    const [embedResponse,versionResponse,shareResponse,reportResponse]=await Promise.all([
      fetch(`/api/dives/${id}/embed`,{cache:"no-store"}),fetch(`/api/dives/${id}/version`,{cache:"no-store"}),fetch(`/api/dives/${id}/share`,{cache:"no-store"}),fetch(`/api/dives/${id}/report`,{cache:"no-store"}),
    ]);
    if(embedResponse.status===401){router.replace(`/login?next=${encodeURIComponent(`/edit?key=${activeKey}&pane=${pane}`)}`);return;}
    const [embedBody,versionBody,shareBody,reportBody]=await Promise.all([embedResponse.json(),versionResponse.json(),shareResponse.json(),reportResponse.json()]);
    if(!embedResponse.ok){setError(embedBody.error||"The report preview is unavailable. Refresh to try again.");return;}
    setEmbed(embedBody.session);
    if(versionResponse.ok)setVersions(current=>({...current,[id]:Number(versionBody.version)}));
    if(shareResponse.ok)setShare(shareBody.share||null);
    if(reportResponse.ok)setReports(current=>({...current,[id]:reportBody.report||null}));
  }
  useEffect(()=>{fetch("/api/edit",{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"}).then(async response=>{if(response.status===401){router.replace(`/login?next=${encodeURIComponent(`/edit?key=${activeKey}&pane=${pane}`)}`);return null;}const body=await response.json();if(!response.ok)throw new Error(body.error||"Workspace unavailable");return body;}).then(body=>{if(body){const manifest=body.dives as EditorDive[];setDives(manifest);const selected=manifest.some(dive=>dive.key===activeKey)?activeKey:manifest[0]?.key||"";setActiveKey(selected);if(selected&&selected!==params.get("key"))router.replace(`/edit?key=${encodeURIComponent(selected)}&pane=${pane}`,{scroll:false});}}).catch(reason=>setError(reason.message));},[router]);
  useEffect(()=>{const requestedKey=params.get("key"),requestedPane=params.get("pane")==="duckdive"?"duckdive":"report";if(requestedKey&&dives.some(dive=>dive.key===requestedKey))setActiveKey(requestedKey);setPane(requestedPane);},[params,dives]);
  useEffect(()=>{if(activeId){setEmbed("");setError("");setShare(null);setShareStatus("");void refresh(activeId);}},[activeId]);

  async function revert(){if(!activeId||!version||version<=1)return;setReverting(true);const response=await fetch(`/api/dives/${activeId}/revert`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({version:version-1})});if(response.ok)await refresh(activeId);else setError((await response.json()).error||"Revert failed");setReverting(false);}
  async function publish(){if(!activeId||sharing)return;setSharing(true);setShareStatus("");const response=await fetch(`/api/dives/${activeId}/share`,{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"}),body=await response.json();if(!response.ok){setShareStatus(body.error||"Could not publish link");setSharing(false);return;}setShare(body.share);try{await navigator.clipboard.writeText(body.share.url);setShareStatus("Published · link copied");}catch{setShareStatus("Published · copy link when ready");}setSharing(false);}
  async function copyShare(){if(!share)return;try{await navigator.clipboard.writeText(share.url);setShareStatus("Link copied");}catch{setShareStatus(share.url);}}
  async function revokeShare(){if(!activeId||!share||sharing||!window.confirm("Revoke this public link? Anyone using it will lose access immediately."))return;setSharing(true);const response=await fetch(`/api/dives/${activeId}/share`,{method:"DELETE",headers:{"Content-Type":"application/json"},body:"{}"});if(response.ok){setShare(null);setShareStatus("Link revoked");}else setShareStatus((await response.json()).error||"Could not revoke link");setSharing(false);}

  return <main id="main-content" className="edit-lab">
    <header className="lab-header"><AppBrand/><div className="edit-tabs" role="tablist" aria-label="Report to edit">{dives.map(dive=><button role="tab" aria-selected={activeDive?.key===dive.key} key={dive.key} className={activeDive?.key===dive.key?"active":""} onClick={()=>updateEditorState(dive.key,pane)}>{dive.label}</button>)}</div><Link href="/workspace">Close</Link></header>
    <nav className="edit-pane-tabs" role="tablist" aria-label="Editor pane"><button role="tab" aria-selected={pane==="report"} onClick={()=>activeDive&&updateEditorState(activeDive.key,"report")}>Report</button><button role="tab" aria-selected={pane==="duckdive"} onClick={()=>activeDive&&updateEditorState(activeDive.key,"duckdive")}>DuckDive</button></nav>
    <div className="edit-grid">
      <section className="edit-canvas" data-mobile-visible={pane==="report"}><div className="edit-toolbar"><span><i/> {activeDive?`${activeDive.datasetTitle} · ${activeDive.title} · `:""}{version?`v${version}`:"Live"}{shareStatus?` · ${shareStatus}`:share?` · shared · ${share.viewCount} views`:""}</span><div>{share?<><button disabled={sharing} onClick={copyShare}>Copy Link</button><button disabled={sharing} onClick={revokeShare}>Revoke</button></>:<button disabled={!activeId||sharing} onClick={publish}>{sharing?"Publishing…":"Share"}</button>}<button onClick={()=>refresh()}>Refresh</button><button disabled={!version||version<=1||reverting} onClick={revert}>{reverting?"Reverting…":"Undo Version"}</button></div></div>{error?<div className="lab-error" role="alert">{error}</div>:embed?<iframe key={embed} title={activeDive?`${activeDive.title} report`:"Editable report"} src={`https://embed-motherduck.com/sandbox/#session=${embed}`} sandbox="allow-scripts allow-same-origin"/>:<div className="lab-loading" role="status">Preparing Report…</div>}</section>
      <div className="edit-duckdive" data-mobile-visible={pane==="duckdive"}>{dives.map(dive=><DuckDivePanel key={dive.diveId} diveId={dive.diveId} starterKey={dive.key} contract={dive.publicContract} report={reports[dive.diveId]||null} active={dive.diveId===activeId} version={versions[dive.diveId]||null} onApplied={async()=>refresh(dive.diveId)} onError={setError}/>)}</div>
    </div>
  </main>;
}
