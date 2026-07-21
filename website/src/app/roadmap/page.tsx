import type { Metadata } from "next";
import { Check, CircleDashed, ShieldCheck } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = { title: "Roadmap" };

const phases = [
  {
    number: "01—04",
    state: "Complete",
    title: "Ownership core and Node transport",
    body: "Request scopes, owned tasks, deterministic cleanup, Handler and Delivery separation, typed abort reasons, diagnostics, and real-socket tests.",
    complete: true,
  },
  {
    number: "Next",
    state: "Planned",
    title: "Adapter contract and diagnostics ergonomics",
    body: "Clarify runtime obligations, improve inspection output, and publish more delivery-focused examples before adding claims.",
    complete: false,
  },
  {
    number: "Later",
    state: "Planned",
    title: "Verified runtime expansion",
    body: "Cloudflare, Deno, and Bun adapters only after disconnect, streaming, cleanup, and shutdown behavior can be tested honestly.",
    complete: false,
  },
] as const;

export default function RoadmapPage() {
  return (
    <main>
      <SiteHeader />
      <section className="page-hero page-shell roadmap-hero">
        <p className="eyebrow">Roadmap</p>
        <h1>Verified before advertised.</h1>
        <p>Nelo separates implemented behavior from planned adapter claims. A runtime appears as supported only after its transport behavior is covered by real tests.</p>
      </section>

      <section className="roadmap-timeline page-shell">
        {phases.map((phase) => (
          <article className={`roadmap-card glass-surface ${phase.complete ? "complete" : "planned"}`} key={phase.number}>
            <div className="roadmap-index">{phase.complete ? <Check size={17} /> : <CircleDashed size={17} />}<span>{phase.number}</span></div>
            <div><small>{phase.state}</small><h2>{phase.title}</h2><p>{phase.body}</p></div>
          </article>
        ))}
      </section>

      <section className="roadmap-principle page-shell glass-surface">
        <ShieldCheck size={22} />
        <div><span>Release rule</span><h2>No capability badge without a reproducible test.</h2></div>
      </section>
      <SiteFooter />
    </main>
  );
}
