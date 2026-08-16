"use client";

import Link from "next/link";
import {useState} from "react";
import {useRouter} from "next/navigation";
import AppBrand from "@/components/AppBrand";
import {saveDuckDiveDraft} from "@/lib/duckdive-draft";
import type {DatasetStarterManifest,DatasetWorkspaceManifest} from "@/lib/datasets";

export default function LabHome({isAdmin=false,dataset}:{isAdmin?:boolean;dataset:DatasetWorkspaceManifest}){
  const router=useRouter(),[preparingKey,setPreparingKey]=useState(""),[error,setError]=useState(""),[signingOut,setSigningOut]=useState(false);

  function tryStarter(starter:DatasetStarterManifest){
    const example=starter.questions[0];
    if(!example){setError("This report does not have a guided example yet. Open the report and describe the change you need.");return;}
    setPreparingKey(starter.key);setError("");
    if(!saveDuckDiveDraft(sessionStorage,starter.key,example)){setError("This browser could not preserve the example. Open the report and enter it manually.");setPreparingKey("");return;}
    router.push(`/edit?key=${encodeURIComponent(starter.key)}&pane=duckdive`);
  }

  async function signOut(){setSigningOut(true);await fetch("/api/auth/logout",{method:"POST"});location.assign("/");}

  return <main id="main-content" className="lab-shell workspace-home">
    <header className="lab-header"><AppBrand/><nav aria-label="Primary navigation">{isAdmin?<Link href="/admin">Admin</Link>:null}<button disabled={signingOut} onClick={signOut}>{signingOut?"Signing Out…":"Sign Out"}</button></nav></header>
    <section className="workspace-intro" aria-labelledby="workspace-heading">
      <div className="workspace-title">
        <p className="workspace-badge">{dataset.presentation.badge}</p>
        <p className="lab-kicker">{dataset.kind} · {dataset.contractVersion}</p>
        <h1 id="workspace-heading">{dataset.title}</h1>
        <p>{dataset.presentation.summary}</p>
      </div>
      <aside className="workspace-boundary" aria-label="Dataset boundary"><span>Governed Boundary</span><p>{dataset.presentation.boundary}</p></aside>
    </section>
    <section className="workspace-reports" aria-labelledby="reports-heading">
      <header><div><p className="lab-kicker">Included Reports</p><h2 id="reports-heading">Choose the view closest to your question.</h2></div><p>Each report is ready to explore. Open it first, or send the prepared example straight to DuckDive.</p></header>
      <div className="workspace-report-grid">{dataset.starters.map(starter=><article key={starter.key} className={`workspace-report-card accent-${starter.accent}`}>
        <div><span>{starter.label}</span><h3>{starter.title}</h3><p>{starter.description}</p></div>
        <p className="workspace-outcome">{starter.outcome}</p>
        <blockquote><span>Example Change</span>{starter.questions[0]}</blockquote>
        <div className="workspace-report-actions"><Link className="workspace-primary-action" href={`/edit?key=${encodeURIComponent(starter.key)}&pane=report`}>Open Report</Link><button disabled={Boolean(preparingKey)} onClick={()=>tryStarter(starter)}>{preparingKey===starter.key?"Preparing Example…":"Try Example in DuckDive"}</button></div>
      </article>)}</div>
      {error?<div className="lab-error" role="alert" aria-live="assertive"><strong>Could Not Open the Example</strong><span>{error}</span></div>:null}
    </section>
  </main>;
}
