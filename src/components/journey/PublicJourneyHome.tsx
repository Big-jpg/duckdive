import Image from "next/image";
import Link from "next/link";

const stages=[{number:"01",name:"Lake",copy:"Accept the messy mix."},{number:"02",name:"Flight",copy:"Coordinate how it moves."},{number:"03",name:"Dive",copy:"Turn it into an answer."}];
const nodeCounts=[1,2,4];
export default function PublicJourneyHome(){return <main id="main-content" className="public-journey">
  <header><Link href="/" className="public-brand" translate="no"><Image src="/duckdive-icon.svg" alt="" width={38} height={38}/>DuckDive</Link><Link href="/login?next=%2Flake">Sign In</Link></header>
  <section className="public-hero"><p>Analytics at any scale, taught by ducks.</p><h1>Start with one lake.</h1><span>Throw in the files you have. A Duckling Compute Node shows how raw ingredients become something analytics teams can use.</span><Link href="/login?next=%2Flake">Enter the Lake <b aria-hidden="true">→</b></Link></section>
  <section className="public-stages" aria-label="DuckDive journey">{stages.map(stage=><article key={stage.number}><small>{stage.number}</small><h2>{stage.name}</h2><p>{stage.copy}</p></article>)}</section>
  <section className="public-scale" aria-labelledby="scale-heading">
    <div><p>Scale the flock</p><h2 id="scale-heading">More data? Add Ducklings.</h2><span>Each Duckling is isolated DuckDB compute. As users and workloads grow, add Ducklings—and use Flights to make the work repeatable.</span></div>
    <div className="public-scale-nodes" aria-label="One, two, or four Duckling compute nodes">{nodeCounts.map(count=><article key={count}><div aria-hidden="true">{Array.from({length:count},(_,index)=><Image key={index} src="/duckdive-icon.svg" alt="" width={26} height={26}/>)}</div><strong>{count}</strong><small>{count===1?"compute node":"compute nodes"}</small></article>)}</div>
  </section>
  <footer><p>One Duckling. One Lake. One Flight. One Dive.</p><span>Then a flock. Then many lakes working as one ontology.</span></footer>
</main>;}
