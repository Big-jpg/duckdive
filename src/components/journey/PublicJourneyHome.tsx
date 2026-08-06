import Image from "next/image";
import Link from "next/link";

const stages=[{number:"01",name:"Lake",copy:"Accept the messy mix."},{number:"02",name:"Flight",copy:"Coordinate how it moves."},{number:"03",name:"Dive",copy:"Turn it into an answer."}];
export default function PublicJourneyHome(){return <main id="main-content" className="public-journey">
  <header><Link href="/" className="public-brand" translate="no"><Image src="/duckdive-icon.svg" alt="" width={38} height={38}/>DuckDive</Link><Link href="/login?next=%2Flake">Sign In</Link></header>
  <section className="public-hero"><p>Analytics at any scale, taught by ducks.</p><h1>Start with one lake.</h1><span>Throw in the files you have. A Duckling Compute Node shows how raw ingredients become something analytics teams can use.</span><Link href="/login?next=%2Flake">Enter the Lake <b aria-hidden="true">→</b></Link></section>
  <section className="public-stages" aria-label="DuckDive journey">{stages.map(stage=><article key={stage.number}><small>{stage.number}</small><h2>{stage.name}</h2><p>{stage.copy}</p></article>)}</section>
  <footer><p>One Duckling. One Lake. One Flight. One Dive.</p><span>Then orchestration. Then many lakes working as one ontology.</span></footer>
</main>;}
