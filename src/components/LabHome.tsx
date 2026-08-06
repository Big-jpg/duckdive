"use client";

import Link from "next/link";
import {useState} from "react";
import {useRouter} from "next/navigation";
import AppBrand from "@/components/AppBrand";
import {saveDuckDiveDraft} from "@/lib/duckdive-draft";
import {clearCsvDiveStorage} from "@/lib/csv-dive";

type StarterEntry={key:string;datasetKey:string;datasetTitle:string;title:string;label:string;description:string;entryPrompt:string;questions:readonly string[];accent:string};
type GalleryDive={key:string;title:string;label:string;description:string;questions:string[];session:string;accent:string};

export default function LabHome({isAdmin=false,starters}:{isAdmin?:boolean;starters:readonly StarterEntry[]}){
  const router=useRouter();
  const [question,setQuestion]=useState("");
  const [preparingKey,setPreparingKey]=useState("");
  const [galleryOpen,setGalleryOpen]=useState(false);
  const [galleryLoading,setGalleryLoading]=useState(false);
  const [dives,setDives]=useState<GalleryDive[]>([]);
  const [error,setError]=useState("");
  const datasetTitle=starters[0]?.datasetTitle||"Available data";

  function start(starter:StarterEntry){
    const brief=question.trim();
    if(!brief){setError("Start with the question you want this Dive to answer.");return;}
    setError("");setPreparingKey(starter.key);
    if(!saveDuckDiveDraft(sessionStorage,starter.key,brief)){setError("This browser could not preserve your draft question. Please try again.");setPreparingKey("");return;}
    router.push(`/edit?key=${encodeURIComponent(starter.key)}`);
  }

  async function openGallery(){
    setGalleryOpen(true);
    if(dives.length||galleryLoading)return;
    setGalleryLoading(true);setError("");
    try{
      const response=await fetch("/api/gallery",{cache:"no-store"}),body=await response.json();
      if(!response.ok)throw new Error(body.error||"Gallery unavailable");
      setDives(body.dives);
    }catch(reason){setError(reason instanceof Error?reason.message:"Gallery unavailable");}
    finally{setGalleryLoading(false);}
  }

  return <main id="main-content" className="lab-shell">
    <header className="lab-header"><AppBrand/><nav aria-label="Primary navigation"><a href="/api/analytics/suburbs">Data</a><Link href="/datasets/csv">Import CSV</Link><Link href="/datasets/new">Bring your own model</Link>{isAdmin?<Link href="/admin">Admin</Link>:null}<button onClick={async()=>{clearCsvDiveStorage(sessionStorage);await fetch("/api/auth/logout",{method:"POST"});location.assign("/");}}>Sign Out</button></nav></header>
    <section className="lab-entry" aria-labelledby="question-heading">
      <div className="lab-entry-copy"><p className="lab-kicker">Question-led analytics · {datasetTitle}</p><h1 id="question-heading">What should the data make clear?</h1><p>Begin with the decision or uncertainty. Then choose the shape that gives DuckDive a trustworthy place to start.</p></div>
      <div className="lab-question">
        <label htmlFor="duckdive-question">Your question</label>
        <textarea id="duckdive-question" value={question} onChange={event=>{setQuestion(event.target.value);if(error)setError("");}} maxLength={4000} placeholder="For example: How do Yarraville and Footscray compare over the last five years?" autoFocus/>
        <div><span>{question.length.toLocaleString("en-AU")} / 4,000</span><small>Your question remains a draft until you review and apply it in the editor.</small></div>
      </div>
      <div className="lab-suggestions" aria-label="Example questions">{starters.map(starter=><button key={starter.key} onClick={()=>setQuestion(starter.questions[0]||"")}>{starter.questions[0]}</button>)}</div>
      <div className="lab-recipe-heading"><p className="lab-kicker">Choose a starting structure</p><p>DuckDive can reshape it later. This choice only establishes the first governed view.</p></div>
      <div className="lab-recipes">{starters.map(starter=><article key={starter.key} className={`lab-recipe accent-${starter.accent}`}><span>{starter.label}</span><h2>{starter.entryPrompt}</h2><p>{starter.description}</p><button disabled={!question.trim()||Boolean(preparingKey)} onClick={()=>start(starter)}>{preparingKey===starter.key?"Preparing…":`Start with ${starter.title}`}</button></article>)}</div>
      {error?<div className="lab-error" role="alert">{error}</div>:null}
    </section>
    <section className="lab-browse" aria-labelledby="browse-heading">
      <div><p className="lab-kicker">Prefer to explore first?</p><h2 id="browse-heading">Browse the live starting Dives.</h2><p>Previews create short-lived embedded sessions only when you ask to see them.</p></div>
      {!galleryOpen?<button className="lab-browse-toggle" onClick={()=>void openGallery()}>Load live previews</button>:null}
      {galleryLoading?<div className="lab-loading" role="status">Preparing Dives…</div>:null}
      {galleryOpen&&dives.length?<div className="lab-gallery">{dives.map(dive=><article key={dive.key} className={`lab-card accent-${dive.accent}`}><div className="lab-preview">{dive.session?<iframe title={`${dive.title} preview`} src={`https://embed-motherduck.com/sandbox/#session=${dive.session}`} sandbox="allow-scripts allow-same-origin"/>:<span>Preparing…</span>}</div><div className="lab-card-body"><span>{dive.label}</span><h2>{dive.title}</h2><div><Link href={`/dives/${dive.key}`} className="lab-card-link">Open</Link><button onClick={()=>{setQuestion(dive.questions[0]||"");window.scrollTo({top:0,behavior:"smooth"});}}>Ask a question</button></div></div></article>)}</div>:null}
    </section>
  </main>;
}
