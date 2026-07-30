"use client";
import Image from "next/image";
import Link from "next/link";
import {useEffect,useState} from "react";
import {useRouter} from "next/navigation";
import AppBrand from "@/components/AppBrand";

type Dive={key:string;title:string;label:string;description:string;diveId:string;session:string;accent:string};

export default function LabHome({isAdmin=false}:{isAdmin?:boolean}){
  const router=useRouter(),[dives,setDives]=useState<Dive[]>([]),[error,setError]=useState("");
  useEffect(()=>{fetch("/api/gallery",{cache:"no-store"}).then(async response=>{const body=await response.json();if(!response.ok)throw new Error(body.error||"Gallery unavailable");setDives(body.dives);}).catch(reason=>setError(reason.message));},[]);
  async function remix(dive:Dive){const response=await fetch("/api/edit",{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"});if(!response.ok){setError("Could not prepare your editor workspace.");return;}router.push(`/edit?key=${dive.key}`);}
  return <main id="main-content" className="lab-shell">
    <header className="lab-header"><AppBrand/><nav aria-label="Primary navigation"><a href="#dives">Dives</a><a href="/api/analytics/suburbs">Data API</a>{isAdmin?<Link href="/admin">Admin</Link>:null}<button onClick={async()=>{await fetch("/api/auth/logout",{method:"POST"});location.reload();}}>Sign Out</button></nav></header>
    <section className="lab-hero"><div><p className="lab-kicker">Victorian House Data · 2004–2026</p><h1>House data,<br/><em>made explorable.</em></h1><p>Explore a carefully modelled estate of Victorian house sales. Open a live Dive, follow the evidence and remix the view without losing the data contract underneath it.</p><div className="lab-actions"><a href="#dives" className="lab-primary">Explore Dives</a><a href="https://motherduck.com/product/dives/" target="_blank" rel="noreferrer">About Dives <span aria-hidden="true">↗</span></a></div><dl className="lab-facts"><div><dt>Source rows</dt><dd>88,422</dd></div><div><dt>Source files</dt><dd>83</dd></div><div><dt>Estate</dt><dd>VIC houses</dd></div></dl></div><div className="lab-mascot" aria-hidden="true"><Image src="/duckdive.png" alt="" fill sizes="(max-width: 850px) 80vw, 38vw" priority/></div></section>
    <section id="dives" className="lab-dives"><div className="lab-section-title"><div><p>Live Analytics</p><h2>Choose a starting point</h2></div><span>3 curated views</span></div>{error?<div className="lab-error" role="alert">{error}</div>:null}{!error&&!dives.length?<div className="lab-loading" role="status">Preparing Live Dives…</div>:null}<div className="lab-gallery">{dives.map((dive,index)=><article key={dive.key} className={`lab-card accent-${dive.accent}`}><div className="lab-preview">{dive.session?<iframe title={`${dive.title} preview`} src={`https://embed-motherduck.com/sandbox/#session=${dive.session}`} sandbox="allow-scripts allow-same-origin"/>:<span>Loading Live Preview…</span>}</div><div className="lab-card-body"><span>0{index+1} · {dive.label}</span><h3>{dive.title}</h3><p>{dive.description}</p><div><Link href={`/dives/${dive.key}`} className="lab-card-link">Open Dive</Link><button onClick={()=>remix(dive)}>Remix with AI</button></div></div></article>)}</div></section>
    <footer className="lab-footer"><strong translate="no">DUCKDIVE.GOLD</strong><p>Immutable CSV → Neon → MotherDuck</p><p>Descriptive analytics, not a valuation</p></footer>
  </main>;
}
