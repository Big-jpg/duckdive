"use client";

import Image from "next/image";
import Link from "next/link";
import type {ReactNode} from "react";
import {useJourney} from "./JourneyProvider";

const stages=[{key:"lake",label:"Lake",href:"/lake"},{key:"flights",label:"Flights",href:"/flights"},{key:"dives",label:"Dives",href:"/dives"}] as const;

export default function JourneyShell({stage,children}:{stage:(typeof stages)[number]["key"];children:ReactNode}){
  const {activity,clearForExit}=useJourney();
  async function signOut(){clearForExit();await fetch("/api/auth/logout",{method:"POST"});location.assign("/");}
  return <div className="journey-shell">
    <header className="journey-header">
      <Link href="/lake" className="journey-brand" translate="no"><Image src="/duckdive-icon.svg" alt="" width={30} height={30}/><span>DuckDive</span></Link>
      <nav aria-label="Journey stages">{stages.map((item,index)=><Link key={item.key} href={item.href} aria-current={stage===item.key?"page":undefined}><small>0{index+1}</small>{item.label}</Link>)}</nav>
      <div className="node-status" aria-live="polite"><span className={activity.working?"working":""}><Image src="/duckdive-icon.svg" alt="" width={22} height={22}/></span><p><strong>Duckling 01</strong><small>{activity.label}</small></p></div>
      <button className="journey-exit" onClick={signOut}>Leave</button>
    </header>
    {children}
  </div>;
}
