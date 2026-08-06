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
  const integrationLabel=flightStatus.availability==="live"?"Read-only live reference":flightStatus.availability==="unavailable"?"Reference unavailable":"Representative reference";

  return <main id="main-content" className="journey-preview">
    <header><p>Stage 02 · Flight Concept</p><h1>Make transformation repeatable.</h1><span>A MotherDuck Flight is a versioned Python program that can collect inputs, shape data, and deliver governed tables. This lesson explains that contract; it does not run your selected files.</span></header>

    <section className="flight-plan" aria-labelledby="flight-plan-heading">
      <header><span>Conceptual Flow</span><strong id="flight-plan-heading">Lake to analytical shape</strong><small>Versioned · Governed</small></header>
      <div><article><small>Lesson Input</small><strong>Browser metadata</strong><span>{ready.length} metadata-ready {ready.length===1?"file":"files"}</span></article><i aria-hidden="true">→</i><article className="flight-program"><span><Image src="/duckdive-icon.svg" alt="" width={34} height={34}/></span><small>Example entrypoint</small><strong>main.py</strong><em>Versioned Python program</em></article><i aria-hidden="true">→</i><article><small>Production Outcome</small><strong>Governed tables</strong><span>Not created by this lesson</span></article></div>
    </section>

    <section className="flight-run" aria-labelledby="run-heading">
      <header><div><p>Read-Only Reference Flight</p><h2 id="run-heading">{run?`Run ${run.number} · ${run.status.toLowerCase()}`:"Definition to run"}</h2></div><small className={flightStatus.availability==="live"?"live":undefined}>{integrationLabel}</small></header>
      <p className="flight-reference-note">This separate probe demonstrates the run lifecycle. It does not receive your selected files and its latest run wrote no tables.</p>
      <ol><li className={definition?"reached":undefined}><strong>Versioned</strong><span>Code, packages & configuration</span></li><li className={progress>=1?"reached":undefined}><strong>Pending</strong><span>A run enters the queue</span></li><li className={progress>=2?"reached":undefined}><strong>Running</strong><span>Python executes on assigned compute</span></li><li className={progress>=3?"reached":undefined}><strong>{run&&["FAILED","CANCELLED"].includes(run.status)?run.status[0]+run.status.slice(1).toLowerCase():"Succeeded"}</strong><span>{run?.status==="FAILED"?"The run stopped with an error":run?.status==="CANCELLED"?"The run was cancelled":"The program completed; outputs depend on its code"}</span></li></ol>
      {flightStatus.availability==="live"&&definition?<div className="flight-live-summary" aria-label="Latest MotherDuck Flight run"><span><small>Flight</small><strong>{flightStatus.name}</strong></span><span><small>Queue</small><strong>{duration(run?.queueMs??null)}</strong></span><span><small>Execution</small><strong>{duration(run?.durationMs??null)}</strong></span><span><small>Runtime cap</small><strong>{definition.maxRuntimeSec} s</strong></span></div>:<p className="flight-status-note">{flightStatus.availability==="unavailable"?"MotherDuck could not be reached. The teaching model remains available without exposing integration details.":"Live Flight status is not configured in this environment."}</p>}
      <div className="flight-managed" aria-label="Capabilities managed by MotherDuck"><span>Schedule</span><span>Secrets</span><span>Access token</span><span>Timeout</span><span>Logs</span><span>Cancellation</span></div>
      <p>A Flight does not create extra Ducklings. Ducklings scale isolated users and workloads; each Flight run uses the compute assigned to its owner.</p>
    </section>

    <section className="ready-objects">
      <header><strong>Metadata in This Browser Tab</strong><Link href="/lake">Back to Lake</Link></header>{ready.length?<div>{ready.map(file=><span key={file.id} title={file.name}>{file.extension} · {file.name}</span>)}</div>:<p>No file metadata is ready yet. Return to the Lake to select local files.</p>}
      <footer><span>These files are not queued for the reference Flight.</span><Link href="/dives">Continue to Dive <b aria-hidden="true">→</b></Link></footer>
    </section>
  </main>;
}
