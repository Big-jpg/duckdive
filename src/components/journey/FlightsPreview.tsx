"use client";

import Image from "next/image";
import Link from "next/link";
import {useJourney} from "./JourneyProvider";
import type {SafeFlightStatus} from "@/lib/motherduck-flight-status";

const duration=(milliseconds:number|null)=>milliseconds===null?"—":milliseconds<1_000?`${milliseconds} ms`:`${(milliseconds/1_000).toFixed(1)} s`;
const runProgress={PENDING:1,RUNNING:2,SUCCEEDED:3,FAILED:3,CANCELLED:3} as const;

export default function FlightsPreview({flightStatus}:{flightStatus:SafeFlightStatus}){
  const {state}=useJourney();
  const ready=state.files.filter(file=>file.status==="lake_ready");
  const definition=flightStatus.definition,run=flightStatus.latestRun,progress=run?runProgress[run.status]:0;
  const integrationLabel=flightStatus.availability==="live"?"Live MotherDuck":flightStatus.availability==="unavailable"?"Live status unavailable":"Representative preview";

  return <main id="main-content" className="journey-preview">
    <header><p>Stage 02 · MotherDuck Flights</p><h1>Turn the plan into a repeatable run.</h1><span>A Flight is a versioned Python program that runs on MotherDuck compute. It collects from the Lake, shapes the data, and delivers tables for a Dive.</span></header>

    <section className="flight-plan" aria-labelledby="flight-plan-heading">
      <header><span>Flight 01</span><strong id="flight-plan-heading">Lake to analytical shape</strong><small>{definition?`Version ${definition.version} · ${definition.schedule==="on_demand"?"On demand":"Scheduled"}`:"Versioned · On demand"}</small></header>
      <div><article><small>Input</small><strong>Duck Lake</strong><span>{ready.length} Lake-ready {ready.length===1?"object":"objects"}</span></article><i aria-hidden="true">→</i><article className="flight-program"><span><Image src="/duckdive-icon.svg" alt="" width={34} height={34}/></span><small>Python entrypoint</small><strong>main.py</strong><em>2 cores · 16 GB RAM</em></article><i aria-hidden="true">→</i><article><small>Output</small><strong>MotherDuck tables</strong><span>Ready for a Dive</span></article></div>
    </section>

    <section className="flight-run" aria-labelledby="run-heading">
      <header><div><p>What MotherDuck manages</p><h2 id="run-heading">{run?`Run ${run.number} · ${run.status.toLowerCase()}`:"Definition to run"}</h2></div><small className={flightStatus.availability==="live"?"live":undefined}>{integrationLabel}</small></header>
      <ol><li className={definition?"reached":undefined}><strong>Versioned</strong><span>Code, packages and configuration</span></li><li className={progress>=1?"reached":undefined}><strong>Pending</strong><span>A run enters the queue</span></li><li className={progress>=2?"reached":undefined}><strong>Running</strong><span>Python executes on its owner&apos;s Duckling</span></li><li className={progress>=3?"reached":undefined}><strong>{run&&["FAILED","CANCELLED"].includes(run.status)?run.status[0]+run.status.slice(1).toLowerCase():"Succeeded"}</strong><span>{run?.status==="FAILED"?"The run stopped with an error":run?.status==="CANCELLED"?"The run was cancelled":"Outputs are ready downstream"}</span></li></ol>
      {flightStatus.availability==="live"&&definition?<div className="flight-live-summary" aria-label="Latest MotherDuck Flight run"><span><small>Flight</small><strong>{flightStatus.name}</strong></span><span><small>Queue</small><strong>{duration(run?.queueMs??null)}</strong></span><span><small>Execution</small><strong>{duration(run?.durationMs??null)}</strong></span><span><small>Runtime cap</small><strong>{definition.maxRuntimeSec} s</strong></span></div>:<p className="flight-status-note">{flightStatus.availability==="unavailable"?"MotherDuck could not be reached. The teaching model remains available without exposing integration details.":"Live Flight status is not configured in this environment."}</p>}
      <div className="flight-managed"><span>Schedule</span><span>Secrets</span><span>Access token</span><span>Timeout</span><span>Logs</span><span>Cancellation</span></div>
      <p>A Flight does not create extra Ducklings. Ducklings scale isolated users and workloads; each Flight run uses the compute assigned to its owner.</p>
    </section>

    <section className="ready-objects">
      <header><strong>Objects waiting for this Flight</strong><Link href="/lake">Return to Lake</Link></header>{ready.length?<div>{ready.map(file=><span key={file.id}>{file.extension} · {file.name}</span>)}</div>:<p>The Duckling is still preparing Lake-ready objects. This page will update while you stay here.</p>}
    </section>
  </main>;
}
