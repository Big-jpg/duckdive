"use client";

import Link from "next/link";
import {useJourney} from "./JourneyProvider";

export default function DivesPreview(){const {activity}=useJourney();return <main id="main-content" className="journey-preview dives-preview">
  <header><p>Stage 03 · Dive Concept</p><h1>Turn governed data into an answer.</h1><span>A Dive is an analytical experience people can inspect, change, and share. This lesson does not create a Dive from your selected files.</span></header>
  <section className="dive-visual" aria-label="Conceptual path from Lake to Dive"><div><span>Lake</span><strong>{activity.ready} metadata-ready</strong></div><i aria-hidden="true">→</i><div><span>Flight</span><strong>Repeatable transformation</strong></div><i aria-hidden="true">→</i><div className="active"><span>Dive</span><strong>Inspectable answer</strong></div></section>
  <section className="existing-demo"><p>Working Product Example</p><h2>Inspect a real governed Dive in the VIC Housing workspace.</h2><span>The workspace is separate from this browser-only lesson and uses its own owner-scoped data.</span><Link href="/workspace">Open the VIC Housing Workspace <b aria-hidden="true">→</b></Link></section>
</main>;}
