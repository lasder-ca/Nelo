import Link from "next/link";
import { ArrowRight, Check, CircleDot, Github, Layers3, Radio, ShieldCheck } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { brandAssets } from "@/lib/brand";

const code = `const app = new Nelo()

app.get("/report", async (c) => {
  const report = c.fork("report", (signal) =>
    buildReport({ signal })
  )

  return c.json(await report)
})`;

export default function HomePage() {
  return (
    <main>
      <SiteHeader />
      <section className="hero compact-shell">
        <div className="hero-copy">
          <div className="eyebrow"><span className="status-dot" /> Request ownership runtime</div>
          <h1>Every request<br />owns its work.</h1>
          <p>Nelo keeps child tasks, cancellation, resource cleanup, and response delivery inside an explicit request lifetime.</p>
          <div className="hero-actions">
            <Link href="/docs" className="primary-pill">Read the docs <ArrowRight size={15} /></Link>
            <a href="https://github.com/lasder-ca/Nelo" className="secondary-pill"><Github size={15} /> GitHub</a>
          </div>
        </div>
        <div className="hero-visual">
          <div className="glass-code-card">
            <div className="code-card-head"><span>app.ts</span><span>Handler Scope</span></div>
            <pre>{code}</pre>
          </div>
          <div className="floating-brand"><img src={brandAssets.icon} alt="Nelo" /><div><strong>Phase 4</strong><span>62 tests passing</span></div></div>
        </div>
      </section>

      <section className="compact-shell feature-intro">
        <p className="eyebrow">One model, two lifetimes</p>
        <h2>Clear ownership without a large API.</h2>
        <p>Handler work settles first. Delivery work remains alive only while the response body still needs it.</p>
      </section>

      <section className="compact-shell feature-grid">
        <article className="feature-card featured">
          <Layers3 size={22} />
          <h3>Handler + Delivery</h3>
          <p>Separate boundaries for route execution and streamed response delivery.</p>
          <div className="scope-lines"><span>Handler Scope</span><span>Delivery Scope</span></div>
        </article>
        <article className="feature-card"><CircleDot size={22} /><h3>Typed cancellation</h3><p>The first abort reason stays available through every owned child task.</p></article>
        <article className="feature-card"><ShieldCheck size={22} /><h3>Deterministic cleanup</h3><p>Resources close exactly once, in reverse acquisition order.</p></article>
        <article className="feature-card"><Radio size={22} /><h3>Web Standards</h3><p>Built around Request, Response, ReadableStream, and AbortSignal.</p></article>
      </section>

      <section className="compact-shell home-links">
        <Link href="/docs"><span>01</span><div><strong>Docs</strong><p>Install, concepts, API, and runtime notes.</p></div><ArrowRight size={18} /></Link>
        <Link href="/examples"><span>02</span><div><strong>Examples</strong><p>Small, focused patterns for real routes.</p></div><ArrowRight size={18} /></Link>
        <Link href="/roadmap"><span>03</span><div><strong>Roadmap</strong><p>Completed phases and the next runtime work.</p></div><ArrowRight size={18} /></Link>
      </section>

      <section className="compact-shell trust-strip">
        {['Apache-2.0', 'TypeScript strict', 'Node.js transport', '62 passing tests'].map((item) => <span key={item}><Check size={13} />{item}</span>)}
      </section>
      <SiteFooter />
    </main>
  );
}
