"use client";

import Image from "next/image";
import Link from "next/link";
import {useJourney} from "./JourneyProvider";

export default function FlightsPreview(){
  const {state}=useJourney();
  const ready=state.files.filter(file=>file.status==="lake_ready");

  return <main id="main-content" className="journey-preview">
    <header><p>Stage 02 · MotherDuck Flights</p><h1>Turn the plan into a repeatable run.</h1><span>A Flight is a versioned Python program that runs on MotherDuck compute. It collects from the Lake, shapes the data, and delivers tables for a Dive.</span></header>

    <section className="flight-plan" aria-labelledby="flight-plan-heading">
      <header><span>Flight 01</span><strong id="flight-plan-heading">Lake to analytical shape</strong><small>Version 1 · On demand</small></header>
      <div><article><small>Input</small><strong>Duck Lake</strong><span>{ready.length} Lake-ready {ready.length===1?"object":"objects"}</span></article><i aria-hidden="true">→</i><article className="flight-program"><span><Image src="/duckdive-icon.svg" alt="" width={34} height={34}/></span><small>Python entrypoint</small><strong>main.py</strong><em>2 cores · 16 GB RAM</em></article><i aria-hidden="true">→</i><article><small>Output</small><strong>MotherDuck tables</strong><span>Ready for a Dive</span></article></div>
    </section>

    <section className="flight-run" aria-labelledby="run-heading">
      <header><div><p>What MotherDuck manages</p><h2 id="run-heading">Definition to run</h2></div><small>Integration preview</small></header>
      <ol><li><strong>Versioned</strong><span>Code, packages and configuration</span></li><li><strong>Pending</strong><span>A run enters the queue</span></li><li><strong>Running</strong><span>Python executes on its owner&apos;s Duckling</span></li><li><strong>Succeeded</strong><span>Outputs are ready downstream</span></li></ol>
      <div className="flight-managed"><span>Schedule</span><span>Secrets</span><span>Access token</span><span>Timeout</span><span>Logs</span><span>Cancellation</span></div>
      <p>A Flight does not create extra Ducklings. Ducklings scale isolated users and workloads; each Flight run uses the compute assigned to its owner.</p>
    </section>

    <section className="ready-objects">
      <header><strong>Objects waiting for this Flight</strong><Link href="/lake">Return to Lake</Link></header>{ready.length?<div>{ready.map(file=><span key={file.id}>{file.extension} · {file.name}</span>)}</div>:<p>The Duckling is still preparing Lake-ready objects. This page will update while you stay here.</p>}
    </section>
  </main>;
}
