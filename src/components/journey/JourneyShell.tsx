"use client";

import Image from "next/image";
import Link from "next/link";
import {useState,type ReactNode} from "react";
import {clearCsvDiveStorage} from "@/lib/csv-dive";
import {useJourney} from "./JourneyProvider";

const stages=[{key:"lake",label:"Lake",href:"/lake"},{key:"flights",label:"Flight",href:"/flights"},{key:"dives",label:"Dive",href:"/dives"}] as const;

export default function JourneyShell({stage,children}:{stage:(typeof stages)[number]["key"];children:ReactNode}){
  const {activity,clearForExit}=useJourney();
  const [leaving,setLeaving]=useState(false);
  async function signOut(){
    if(leaving)return;
    setLeaving(true);
    clearForExit();
    clearCsvDiveStorage(sessionStorage);
    try{await fetch("/api/auth/logout",{method:"POST"});}finally{location.assign("/");}
  }
  return <div className="journey-shell">
    <a className="journey-skip-link" href="#main-content">Skip to Main Content</a>
    <header className="journey-header">
      <Link href="/lake" className="journey-brand" translate="no"><Image src="/duckdive-icon.svg" alt="" width={30} height={30}/><span>DuckDive</span></Link>
      <nav aria-label="Lesson stages">{stages.map((item,index)=><Link key={item.key} href={item.href} aria-current={stage===item.key?"step":undefined}><small>0{index+1}</small>{item.label}</Link>)}</nav>
      <div className="node-status" aria-live="polite"><span className={activity.working?"working":""}><Image src="/duckdive-icon.svg" alt="" width={22} height={22}/></span><p><strong>Teaching Simulation</strong><small>{activity.label}</small></p></div>
      <button className="journey-exit" onClick={signOut} disabled={leaving} aria-label="Sign out and clear this teaching session">{leaving?"Signing Out…":"Sign Out"}</button>
    </header>
    {children}
  </div>;
}
