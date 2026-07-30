"use client";
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
    <header className="lab-header"><AppBrand/><nav aria-label="Primary navigation"><a href="/api/analytics/suburbs">Data</a>{isAdmin?<Link href="/admin">Admin</Link>:null}<button onClick={async()=>{await fetch("/api/auth/logout",{method:"POST"});location.reload();}}>Sign Out</button></nav></header>
    <section className="lab-dives" aria-label="Available Dives">{error?<div className="lab-error" role="alert">{error}</div>:null}{!error&&!dives.length?<div className="lab-loading" role="status">Preparing Dives…</div>:null}<div className="lab-gallery">{dives.map(dive=><article key={dive.key} className={`lab-card accent-${dive.accent}`}><div className="lab-preview">{dive.session?<iframe title={`${dive.title} preview`} src={`https://embed-motherduck.com/sandbox/#session=${dive.session}`} sandbox="allow-scripts allow-same-origin"/>:<span>Preparing…</span>}</div><div className="lab-card-body"><span>{dive.label}</span><h2>{dive.title}</h2><div><Link href={`/dives/${dive.key}`} className="lab-card-link">Open</Link><button onClick={()=>remix(dive)}>DuckDive</button></div></div></article>)}</div></section>
  </main>;
}
