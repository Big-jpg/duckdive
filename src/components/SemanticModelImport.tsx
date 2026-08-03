"use client";

import Link from "next/link";
import {useEffect,useMemo,useRef,useState} from "react";
import AppBrand from "@/components/AppBrand";
import OperationalCandidatePreview from "@/components/OperationalCandidatePreview";
import {openSemanticModelArchive,SemanticModelArchiveError} from "@/lib/semantic-model-archive";
import {
  SEMANTIC_CONTRACT_SCHEMA_VERSION,canonicalJson,semanticContractFingerprintInput,semanticContractPrivacyIssues,sha256Hex,
  type LocalSemanticEvidence,type ReviewedSemanticContractV1,
} from "@/lib/semantic-model-types";
import type {OperationalDatasetCandidateV1} from "@/lib/operational-dataset-candidate";

type SavedDraft={id:string;displayName:string;contractFingerprint:string;createdAt:string};
type WorkspaceDatasetSummary={source:"static"|"operational";key:string;title:string;contractVersion:string;lifecycleState:string};
type TableReview={included:boolean;purpose:string;grain:string};

function key(...parts:string[]){return parts.join("\u0000");}

export default function SemanticModelImport(){
  const inputRef=useRef<HTMLInputElement>(null);
  const [model,setModel]=useState<LocalSemanticEvidence|null>(null);
  const [tables,setTables]=useState<Record<string,TableReview>>({});
  const [columns,setColumns]=useState<Set<string>>(new Set());
  const [measures,setMeasures]=useState<Set<string>>(new Set());
  const [relationships,setRelationships]=useState<Set<string>>(new Set());
  const [warningsAcknowledged,setWarningsAcknowledged]=useState(false);
  const [includeSecurity,setIncludeSecurity]=useState(false);
  const [processing,setProcessing]=useState(false);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const [drafts,setDrafts]=useState<SavedDraft[]>([]);
  const [viewing,setViewing]=useState<{id:string;contract:ReviewedSemanticContractV1}|null>(null);
  const [previewingId,setPreviewingId]=useState("");
  const [activatingId,setActivatingId]=useState("");
  const [activationPreview,setActivationPreview]=useState<{id:string;candidate:OperationalDatasetCandidateV1;registeredKey?:string}|null>(null);
  const [workspaceDatasets,setWorkspaceDatasets]=useState<WorkspaceDatasetSummary[]>([]);

  async function refreshDrafts(){
    const response=await fetch("/api/dataset-drafts",{cache:"no-store"});if(!response.ok)return;
    const body=await response.json();setDrafts(body.drafts||[]);
  }
  async function refreshWorkspaceDatasets(){const response=await fetch("/api/datasets",{cache:"no-store"});if(response.ok)setWorkspaceDatasets((await response.json()).datasets||[]);}
  useEffect(()=>{
    let active=true;
    void Promise.all([fetch("/api/dataset-drafts",{cache:"no-store"}),fetch("/api/datasets",{cache:"no-store"})]).then(async([draftResponse,datasetResponse])=>Promise.all([draftResponse.ok?draftResponse.json():null,datasetResponse.ok?datasetResponse.json():null])).then(([draftBody,datasetBody])=>{if(active&&draftBody)setDrafts(draftBody.drafts||[]);if(active&&datasetBody)setWorkspaceDatasets(datasetBody.datasets||[]);}).catch(()=>{});
    return ()=>{active=false;};
  },[]);

  async function open(file:File){
    setProcessing(true);setError("");setNotice("");
    try{
      const parsed=await openSemanticModelArchive(file);setModel(parsed);
      setTables(Object.fromEntries(parsed.tables.map(table=>[table.name,{included:true,purpose:table.description,grain:""}])));
      setColumns(new Set(parsed.tables.flatMap(table=>table.columns.map(column=>key(table.name,column.name)))));
      setMeasures(new Set(parsed.tables.flatMap(table=>table.measures.map(measure=>key(table.name,measure.name)))));
      setRelationships(new Set());setWarningsAcknowledged(false);setIncludeSecurity(false);
    }catch(reason){setError(reason instanceof SemanticModelArchiveError?reason.message:"The semantic model could not be parsed locally.");}
    finally{setProcessing(false);}
  }

  function toggle(setter:React.Dispatch<React.SetStateAction<Set<string>>>,value:string){setter(current=>{const next=new Set(current);if(next.has(value))next.delete(value);else next.add(value);return next;});}

  const blocking=model?.diagnostics.filter(item=>item.severity==="error")||[];
  const warnings=model?.diagnostics.filter(item=>item.severity==="warning")||[];
  const selectedTables=useMemo(()=>model?.tables.filter(table=>tables[table.name]?.included)||[],[model,tables]);
  const incomplete=selectedTables.some(table=>!tables[table.name]?.purpose.trim()||!tables[table.name]?.grain.trim()||!table.columns.some(column=>columns.has(key(table.name,column.name))));
  const canSave=Boolean(model&&selectedTables.length&&!blocking.length&&!incomplete&&(!warnings.length||warningsAcknowledged));

  async function save(){
    if(!model||!canSave)return;setSaving(true);setError("");setNotice("");
    const selectedNames=new Set(selectedTables.map(table=>table.name));
    const contract:ReviewedSemanticContractV1={
      schemaVersion:SEMANTIC_CONTRACT_SCHEMA_VERSION,
      identity:{displayName:model.displayName,sourceFormat:"fabric-tmdl",archiveFingerprint:model.archiveFingerprint,contractFingerprint:"0".repeat(64)},
      entities:selectedTables.map(table=>({name:table.name,description:table.description,purpose:tables[table.name].purpose.trim(),grain:tables[table.name].grain.trim(),provenance:{purpose:"user-confirmed",grain:"user-confirmed"},columns:table.columns.filter(column=>columns.has(key(table.name,column.name))).map(column=>({name:column.name,description:column.description,dataType:column.dataType,isHidden:column.isHidden,isKey:column.isKey,provenance:"declared"}))})),
      measures:selectedTables.flatMap(table=>table.measures.filter(measure=>measures.has(key(table.name,measure.name))).map(measure=>({table:table.name,name:measure.name,description:measure.description,dax:measure.expression,formatString:measure.formatString,provenance:"user-confirmed" as const}))),
      relationships:model.relationships.filter(item=>relationships.has(item.id)&&selectedNames.has(item.fromTable)&&selectedNames.has(item.toTable)).map(item=>({fromEntity:item.fromTable,fromColumn:item.fromColumn,toEntity:item.toTable,toColumn:item.toColumn,fromCardinality:item.fromCardinality,toCardinality:item.toCardinality,active:item.isActive,crossFilteringBehavior:item.crossFilteringBehavior,securityFilteringBehavior:item.securityFilteringBehavior,provenance:"user-confirmed" as const})),
      sourceSummary:model.sourceSummary,
      ...(includeSecurity?{securitySummary:{roleCount:model.roles.length,affectedTables:[...new Set(model.roles.flatMap(role=>role.affectedTables).filter(table=>selectedNames.has(table)))].sort()}}:{}),
      diagnostics:warnings.map(item=>({code:item.code,message:item.message,acknowledged:true as const})),
    };
    contract.identity.contractFingerprint=await sha256Hex(semanticContractFingerprintInput(contract));
    const privacyIssues=semanticContractPrivacyIssues(contract);if(privacyIssues.length){setError("The reviewed selection contains connectivity detail. Remove it from descriptions or selected DAX before saving.");setSaving(false);return;}
    try{
      const response=await fetch("/api/dataset-drafts",{method:"POST",headers:{"Content-Type":"application/json"},body:canonicalJson(contract)}),body=await response.json();
      if(!response.ok)throw new Error(body.error||"The reviewed contract could not be saved.");
      setNotice(`Saved ${body.draft.displayName} as private semantic evidence.`);await refreshDrafts();
    }catch(reason){setError(reason instanceof Error?reason.message:"The reviewed contract could not be saved.");}
    finally{setSaving(false);}
  }

  async function remove(draft:SavedDraft){
    if(!window.confirm(`Delete the reviewed draft “${draft.displayName}”?`))return;
    const response=await fetch(`/api/dataset-drafts/${encodeURIComponent(draft.id)}`,{method:"DELETE"}),body=await response.json().catch(()=>({}));
    if(response.ok){if(viewing?.id===draft.id)setViewing(null);if(activationPreview?.id===draft.id)setActivationPreview(null);setNotice(`Deleted ${draft.displayName}.`);await refreshDrafts();}else setError(body.error||"The dataset draft could not be deleted.");
  }

  async function view(draft:SavedDraft){
    setError("");const response=await fetch(`/api/dataset-drafts/${encodeURIComponent(draft.id)}`,{cache:"no-store"}),body=await response.json();
    if(response.ok){setActivationPreview(null);setViewing({id:draft.id,contract:body.draft.contract});}else setError("The dataset draft could not be opened.");
  }

  async function previewActivation(draft:SavedDraft){
    setError("");setPreviewingId(draft.id);
    try{
      const response=await fetch(`/api/dataset-drafts/${encodeURIComponent(draft.id)}/activation-preview`,{cache:"no-store"}),body=await response.json();
      if(!response.ok)throw new Error([body.error,...(body.issues||[])].filter(Boolean).join(" · "));
      setViewing(null);setActivationPreview({id:draft.id,candidate:body.candidate});
    }catch(reason){setError(reason instanceof Error?reason.message:"The activation preview could not be compiled.");}
    finally{setPreviewingId("");}
  }

  async function activate(draftId:string){
    if(!activationPreview||activationPreview.id!==draftId)return;setError("");setActivatingId(draftId);
    try{const response=await fetch(`/api/dataset-drafts/${encodeURIComponent(draftId)}/activate`,{method:"POST"}),body=await response.json();if(!response.ok)throw new Error(body.error||"The dataset could not be registered.");setActivationPreview(current=>current?.id===draftId?{...current,registeredKey:body.dataset.dataset_key}:current);setNotice(body.created?`Registered ${body.dataset.display_name} as a reviewed workspace dataset.`:`${body.dataset.display_name} was already registered.`);await refreshWorkspaceDatasets();}
    catch(reason){setError(reason instanceof Error?reason.message:"The dataset could not be registered.");}finally{setActivatingId("");}
  }

  return <main id="main-content" className="byod-page">
    <header className="lab-header"><AppBrand/><nav aria-label="Primary navigation"><Link href="/">VIC workspace</Link><span>Semantic evidence</span></nav></header>
    <section className="byod-intro">
      <p className="lab-kicker">Bring your own semantic model</p><h1>Start with the model your organisation already trusts.</h1>
      <p>The ZIP is opened and decomposed in this browser tab. Nothing is uploaded until you review the derived semantic contract and choose Save.</p>
    </section>
    {!model?<section className="byod-open" aria-labelledby="open-heading">
      <div><h2 id="open-heading">Open an Azure DevOps semantic-model export</h2><p>One TMDL-format <code>*.SemanticModel</code> is required. Raw TMDL, M queries, source addresses and security filters remain local.</p></div>
      <input ref={inputRef} type="file" accept=".zip,application/zip" onChange={event=>{const file=event.target.files?.[0];if(file)void open(file);}}/>
      <button disabled={processing} onClick={()=>inputRef.current?.click()}>{processing?"Parsing locally…":"Choose ZIP"}</button>
    </section>:<>
      <section className="byod-summary">
        <div><p className="lab-kicker">Local evidence</p><h2>{model.displayName}</h2><p>{model.tables.length} tables · {model.relationships.length} relationships · {model.tables.reduce((sum,table)=>sum+table.measures.length,0)} measures · {model.sourceSummary}</p></div>
        <button onClick={()=>{setModel(null);setError("");setNotice("");}}>Open another model</button>
      </section>
      {blocking.length?<section className="byod-diagnostics error"><h2>Parsing must be resolved</h2>{blocking.map((item,index)=><p key={`${item.code}-${index}`}>{item.message}{item.file?` — ${item.file}${item.line?`:${item.line}`:""}`:""}</p>)}</section>:null}
      {warnings.length?<section className="byod-diagnostics"><h2>Evidence requiring acknowledgement</h2>{warnings.map((item,index)=><p key={`${item.code}-${index}`}>{item.message}</p>)}<label><input type="checkbox" checked={warningsAcknowledged} onChange={event=>setWarningsAcknowledged(event.target.checked)}/> I reviewed these limitations and want them recorded with the draft.</label></section>:null}
      <section className="byod-review"><header><p className="lab-kicker">1 · Entities and grain</p><h2>Confirm the analytical surface</h2><p>Detected structure is evidence. Purpose and grain are explicit human assertions.</p></header>
        {model.tables.map(table=><article key={table.name} className={tables[table.name]?.included?"selected":""}>
          <label className="byod-table-toggle"><input type="checkbox" checked={tables[table.name]?.included||false} onChange={event=>setTables(current=>({...current,[table.name]:{...current[table.name],included:event.target.checked}}))}/><strong>{table.name}</strong><span>{table.columns.length} columns · {table.measures.length} measures</span></label>
          {tables[table.name]?.included?<div className="byod-table-fields"><label>Purpose<input value={tables[table.name].purpose} onChange={event=>setTables(current=>({...current,[table.name]:{...current[table.name],purpose:event.target.value}}))} placeholder="What operational concept does this table represent?"/></label><label>Confirmed grain<input value={tables[table.name].grain} onChange={event=>setTables(current=>({...current,[table.name]:{...current[table.name],grain:event.target.value}}))} placeholder="For example: one row per sales order line"/></label>
            <fieldset><legend>Persisted columns</legend>{table.columns.map(column=><label key={column.name}><input type="checkbox" checked={columns.has(key(table.name,column.name))} onChange={()=>toggle(setColumns,key(table.name,column.name))}/><span>{column.name}</span><small>{column.dataType||"untyped"}{column.isKey?" · key":""}{column.isHidden?" · hidden":""}</small></label>)}</fieldset>
            {table.measures.length?<fieldset><legend>Reviewed DAX measures</legend>{table.measures.map(measure=><details key={measure.name}><summary><label><input type="checkbox" checked={measures.has(key(table.name,measure.name))} onChange={()=>toggle(setMeasures,key(table.name,measure.name))}/><span>{measure.name}</span></label></summary><pre>{measure.expression}</pre></details>)}</fieldset>:null}
          </div>:null}
        </article>)}
      </section>
      {model.relationships.length?<section className="byod-review"><header><p className="lab-kicker">2 · Relationships</p><h2>Approve the joins that belong in the draft</h2></header><div className="byod-relations">{model.relationships.map(item=><label key={item.id}><input type="checkbox" checked={relationships.has(item.id)} onChange={()=>toggle(setRelationships,item.id)}/><span><strong>{item.fromTable}.{item.fromColumn}</strong> → <strong>{item.toTable}.{item.toColumn}</strong><small>{item.fromCardinality} to {item.toCardinality} · {item.crossFilteringBehavior} · {item.isActive?"active":"inactive"}</small></span></label>)}</div></section>:null}
      <section className="byod-save"><div><p className="lab-kicker">3 · Private evidence</p><h2>Save the reviewed derivative</h2><p>The archive stays in this tab. DuckDive receives only the selected semantic contract.</p>{model.roles.length?<label><input type="checkbox" checked={includeSecurity} onChange={event=>setIncludeSecurity(event.target.checked)}/> Include an RLS summary of role count and affected tables. Role names and filter expressions stay local.</label>:null}</div><button disabled={!canSave||saving} onClick={()=>void save()}>{saving?"Saving…":"Save reviewed draft"}</button></section>
    </>}
    {error?<div className="lab-error" role="alert">{error}</div>:null}{notice?<div className="admin-notice" role="status">{notice}</div>:null}
    {drafts.length?<section className="byod-drafts"><p className="lab-kicker">Saved evidence</p><h2>Private dataset drafts</h2>{drafts.map(draft=><article key={draft.id}><div><strong>{draft.displayName}</strong><small>{new Date(draft.createdAt).toLocaleString("en-AU")} · {draft.contractFingerprint.slice(0,12)}</small></div><span><button disabled={previewingId===draft.id} onClick={()=>void previewActivation(draft)}>{previewingId===draft.id?"Compiling…":"Preview activation"}</button><button onClick={()=>void view(draft)}>Review</button><button onClick={()=>void remove(draft)}>Delete</button></span></article>)}
      {viewing?<div className="byod-saved-contract"><header><strong>{viewing.contract.identity.displayName}</strong><button onClick={()=>setViewing(null)}>Close</button></header><p>{viewing.contract.entities.length} entities · {viewing.contract.measures.length} measures · {viewing.contract.relationships.length} relationships</p>{viewing.contract.entities.map(entity=><article key={entity.name}><strong>{entity.name}</strong><span>{entity.grain}</span><small>{entity.purpose}</small></article>)}</div>:null}
      {activationPreview?<OperationalCandidatePreview candidate={activationPreview.candidate} onClose={()=>setActivationPreview(null)} onActivate={()=>void activate(activationPreview.id)} activating={activatingId===activationPreview.id} registeredKey={activationPreview.registeredKey}/>:null}
    </section>:null}
    {workspaceDatasets.length?<section className="byod-datasets"><p className="lab-kicker">Workspace registry</p><h2>Registered datasets</h2>{workspaceDatasets.map(dataset=><article key={dataset.key}><div><strong>{dataset.title}</strong><small>{dataset.key} · {dataset.contractVersion}</small></div><span className={`byod-dataset-state ${dataset.lifecycleState}`}>{dataset.lifecycleState}</span></article>)}</section>:null}
  </main>;
}
