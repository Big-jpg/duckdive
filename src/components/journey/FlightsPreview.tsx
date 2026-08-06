"use client";

import Image from "next/image";
import Link from "next/link";
import {useState} from "react";
import {useJourney} from "./JourneyProvider";

const MAX_DUCKLINGS=4;

export default function FlightsPreview(){
  const {state}=useJourney();
  const [ducklingCount,setDucklingCount]=useState(1);
  const ready=state.files.filter(file=>file.status==="lake_ready");
  const assignments=Array.from({length:ducklingCount},(_,nodeIndex)=>ready.filter((_,fileIndex)=>fileIndex%ducklingCount===nodeIndex));

  return <main id="main-content" className="journey-preview">
    <header><p>Stage 02 · Duck Flights</p><h1>Give the flock a flight plan.</h1><span>A Flight is one instruction for what to collect, how to shape it, and where to deliver it. Add Ducklings when the load grows—not a new plan.</span></header>

    <section className="flight-plan" aria-labelledby="flight-plan-heading">
      <header><span>Flight 01</span><strong id="flight-plan-heading">Lake to analytical shape</strong><small>Teaching preview</small></header>
      <div><article><small>01</small><strong>Collect</strong><span>Lake-ready objects</span></article><i aria-hidden="true">→</i><article><small>02</small><strong>Shape</strong><span>Apply shared rules</span></article><i aria-hidden="true">→</i><article><small>03</small><strong>Deliver</strong><span>Ready for a Dive</span></article></div>
    </section>

    <section className="flight-compute" aria-labelledby="compute-heading">
      <header><div><p>Compute for this Flight</p><h2 id="compute-heading">{ducklingCount} {ducklingCount===1?"Duckling":"Ducklings"}</h2></div><div className="flight-controls"><button type="button" onClick={()=>setDucklingCount(count=>Math.max(1,count-1))} disabled={ducklingCount===1} aria-label="Remove a Duckling compute node">−</button><button type="button" onClick={()=>setDucklingCount(count=>Math.min(MAX_DUCKLINGS,count+1))} disabled={ducklingCount===MAX_DUCKLINGS}>Add Duckling</button></div></header>
      <p className="flight-rule">More Ducklings increase parallel capacity. They do not change the Flight plan.</p>
      <div className="flight-lanes">{assignments.map((files,nodeIndex)=><article key={nodeIndex}><header><span><Image src="/duckdive-icon.svg" alt="" width={30} height={30}/></span><p><strong>Duckling {String(nodeIndex+1).padStart(2,"0")}</strong><small>Compute node</small></p></header><div>{files.length?files.map(file=><span key={file.id} title={file.name}>{file.extension} · {file.name}</span>):<em>{ready.length?"Available for work":"Waiting for Lake-ready work"}</em>}</div></article>)}</div>
      <footer><span>{ready.length} Lake-ready {ready.length===1?"object":"objects"}</span><Link href="/lake">Return to Lake</Link></footer>
    </section>
  </main>;
}
