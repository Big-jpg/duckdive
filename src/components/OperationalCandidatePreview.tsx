"use client";

import type {OperationalDatasetCandidateV1} from "@/lib/operational-dataset-candidate";

export default function OperationalCandidatePreview({candidate,onClose,onActivate,activating=false,registeredKey}:{candidate:OperationalDatasetCandidateV1;onClose:()=>void;onActivate?:()=>void;activating?:boolean;registeredKey?:string}){
  return <div className="byod-activation-preview">
    <header><div><p className="lab-kicker">Activation preview · {registeredKey?"registered":"not registered"}</p><strong>{candidate.identity.displayName}</strong><small>{candidate.identity.candidateKey}</small></div><button type="button" onClick={onClose}>Close</button></header>
    <div className="byod-preview-status"><span>Runtime unbound</span><span>No SQL generated</span><span>{registeredKey?"Registered · reviewed":"Nothing persisted"}</span></div>
    <p>{candidate.publicContract.scope}</p>
    {candidate.publicContract.entities.map(entity=><article key={entity.name}><div><strong>{entity.name}</strong><small>{entity.grain}</small></div><p>{entity.purpose}</p><span>{entity.columns.map(column=>column.name).join(" · ")}</span></article>)}
    {candidate.publicContract.measures.length?<section><h3>Semantic measures</h3>{candidate.publicContract.measures.map(measure=><p key={`${measure.entity}-${measure.name}`}><strong>{measure.name}</strong> · DAX evidence only · not executable SQL</p>)}</section>:null}
    {candidate.publicContract.relationships.length?<section><h3>Reviewed relationships</h3>{candidate.publicContract.relationships.map(relationship=><p key={`${relationship.fromEntity}-${relationship.fromColumn}-${relationship.toEntity}-${relationship.toColumn}`}><strong>{relationship.fromEntity}.{relationship.fromColumn}</strong> → <strong>{relationship.toEntity}.{relationship.toColumn}</strong> · {relationship.fromCardinality} to {relationship.toCardinality} · {relationship.active?"active":"inactive"}</p>)}</section>:null}
    <section><h3>Activation limitations</h3>{candidate.activation.limitations.length?candidate.activation.limitations.map(item=><p key={`${item.code}-${item.message}`}><strong>{item.code}</strong> · {item.message}</p>):<p>No reviewed limitations. A runtime binding and live-column reconciliation are still required.</p>}</section>
    {onActivate?<div className="byod-activation-actions"><div><strong>{registeredKey?"Workspace dataset registered":"Register this reviewed contract"}</strong><small>{registeredKey?registeredKey:"This creates an immutable owner-scoped record. It does not connect data or create a Dive."}</small></div><button type="button" disabled={activating||Boolean(registeredKey)} onClick={onActivate}>{registeredKey?"Registered":activating?"Registering…":"Register dataset"}</button></div>:null}
    <footer>Reviewed contract {candidate.provenance.reviewedContractFingerprint.slice(0,12)} · Preview {candidate.identity.candidateFingerprint.slice(0,12)}</footer>
  </div>;
}
