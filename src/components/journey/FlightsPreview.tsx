"use client";

import Link from "next/link";
import {useJourney} from "./JourneyProvider";

export default function FlightsPreview(){const {state,activity}=useJourney(),ready=state.files.filter(file=>file.status==="lake_ready");return <main id="main-content" className="journey-preview">
  <header><p>Stage 02 · Duck Flights</p><h1>Move what the lake has learned.</h1><span>Flights coordinate how trusted objects travel. One path is enough to teach the idea.</span></header>
  <section className="flight-visual" aria-label={`${ready.length} Lake-ready files available for a future flight`}><div className="flight-lake"><i/><strong>Duck Lake</strong><small>{activity.ready} ready</small></div><div className="flight-path"><span>•</span><span>•</span><span>✦</span></div><div className="flight-node"><strong>Flight 01</strong><small>Preview</small></div></section>
  <section className="ready-objects"><header><strong>Lake-ready objects</strong><Link href="/lake">Return to Lake</Link></header>{ready.length?<div>{ready.map(file=><span key={file.id}>{file.extension} · {file.name}</span>)}</div>:<p>The Duckling is still working. This page will update while you stay here.</p>}</section>
</main>;}
