import Image from "next/image";
import Link from "next/link";

const stages = [
  { number: "01", name: "Lake", copy: "Select local files and see their metadata enter a temporary lake." },
  { number: "02", name: "Flight", copy: "Learn how a versioned program can turn inputs into governed tables." },
  { number: "03", name: "Dive", copy: "See how governed tables become inspectable analytical answers." },
] as const;

const boundaries = [
  { label: "Files", value: "Local" },
  { label: "Lesson", value: "Private" },
  { label: "Session", value: "Temporary" },
] as const;

export default function PublicJourneyHome() {
  return (
    <main id="main-content" className="public-journey">
      <header>
        <Link href="/" className="public-brand" translate="no">
          <Image src="/duckdive-icon.svg" alt="" width={38} height={38} />
          DuckDive
        </Link>
        <Link href="/login?next=%2Flake">Sign In</Link>
      </header>

      <section className="public-hero" aria-labelledby="public-hero-heading">
        <p>Interactive Analytics Lesson</p>
        <h1 id="public-hero-heading">Follow one path from files to answers.</h1>
        <span>
          Explore Lake → Flight → Dive with a private browser-only simulation. The lesson keeps file contents on your device and creates no tables or Dives.
        </span>
        <Link href="/login?next=%2Flake">
          Start the Lesson <b aria-hidden="true">→</b>
        </Link>
      </section>

      <section className="public-stages" aria-label="Lesson stages">
        {stages.map((stage) => (
          <article key={stage.number}>
            <small>{stage.number}</small>
            <h2>{stage.name}</h2>
            <p>{stage.copy}</p>
          </article>
        ))}
      </section>

      <section className="public-scale" aria-labelledby="boundaries-heading">
        <div>
          <p>Know the Boundary</p>
          <h2 id="boundaries-heading">A lesson, not an ingestion pipeline.</h2>
          <span>
            This walkthrough explains the product model without reading, uploading, or processing your files. Use the governed workspace to inspect a working Dive.
          </span>
        </div>
        <div className="public-scale-nodes" aria-label="Lesson privacy boundaries">
          {boundaries.map((boundary) => (
            <article key={boundary.label}>
              <div aria-hidden="true">
                <Image src="/duckdive-icon.svg" alt="" width={28} height={28} />
              </div>
              <strong>{boundary.value}</strong>
              <small>{boundary.label}</small>
            </article>
          ))}
        </div>
      </section>

      <footer>
        <p>One Lake. One Flight. One Dive.</p>
        <span>Clear concepts before operational complexity.</span>
      </footer>
    </main>
  );
}
