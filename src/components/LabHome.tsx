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
    <section className="lab-hero"><div><p className="lab-kicker">Contract-First Analytics · Victorian House Sales</p><h1>Explore the market.<br/><em>Keep the meaning.</em></h1><p>88,422 sales observations, reconciled into one governed model. Compare suburbs, periods and patterns—then reshape the analysis without redefining the measures.</p><div className="lab-actions"><a href="#dives" className="lab-primary">Open the Dives</a><a href="https://motherduck.com/product/dives/" target="_blank" rel="noreferrer">How Dives Work <span aria-hidden="true">↗</span></a></div><dl className="lab-facts"><div><dt>Observations</dt><dd>88,422</dd></div><div><dt>Source files</dt><dd>83</dd></div><div><dt>Coverage</dt><dd>2004–2026</dd></div></dl></div><div className="lab-mascot"><Image src="/duckdive-mark.svg" alt="A yellow duck surfing through a blue wave" fill sizes="(max-width: 850px) 88vw, 42vw" priority/></div></section>
    <section id="dives" className="lab-dives"><div className="lab-section-title"><div><p>One Governed Model</p><h2>Three ways into the evidence</h2></div><span>Pulse, place and comparison.</span></div>{error?<div className="lab-error" role="alert">{error}</div>:null}{!error&&!dives.length?<div className="lab-loading" role="status">Preparing Live Dives…</div>:null}<div className="lab-gallery">{dives.map((dive,index)=><article key={dive.key} className={`lab-card accent-${dive.accent}`}><div className="lab-preview">{dive.session?<iframe title={`${dive.title} preview`} src={`https://embed-motherduck.com/sandbox/#session=${dive.session}`} sandbox="allow-scripts allow-same-origin"/>:<span>Loading Live Preview…</span>}</div><div className="lab-card-body"><span>0{index+1} · {dive.label}</span><h3>{dive.title}</h3><p>{dive.description}</p><div><Link href={`/dives/${dive.key}`} className="lab-card-link">Explore</Link><button onClick={()=>remix(dive)}>Adapt This View</button></div></div></article>)}</div></section>
    <footer className="lab-footer"><strong translate="no">DUCKDIVE.GOLD</strong><p>Governed source → semantic model → live analysis</p><p>Descriptive evidence, not a valuation</p></footer>
  </main>;
}
