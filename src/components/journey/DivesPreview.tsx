"use client";

import Link from "next/link";
import {useJourney} from "./JourneyProvider";

export default function DivesPreview(){const {activity}=useJourney();return <main id="main-content" className="journey-preview dives-preview">
  <header><p>Stage 03 · Duck Dives</p><h1>Ask the next useful question.</h1><span>A Dive turns governed data into an analytical experience people can inspect, change, and share.</span></header>
  <section className="dive-visual"><div><span>Lake</span><strong>{activity.ready} ready</strong></div><i>→</i><div><span>Flight</span><strong>One path</strong></div><i>→</i><div className="active"><span>Dive</span><strong>Clear answers</strong></div></section>
  <section className="existing-demo"><p>See the idea working with a governed dataset.</p><h2>Open the existing VIC Housing workspace.</h2><Link href="/workspace">Enter the VIC demonstration <span aria-hidden="true">→</span></Link></section>
</main>;}
