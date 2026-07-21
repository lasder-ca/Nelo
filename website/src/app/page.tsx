import Link from "next/link";
import { ArrowRight, Boxes, Braces, Check, Github, Network, Radio, ShieldCheck, Sparkles, Star, Workflow } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CodeBlock } from "@/components/code-block";
import { CodeShowcase } from "@/components/code-showcase";
import { OwnershipMap } from "@/components/ownership-map";
import { RequestLab } from "@/components/request-lab";
import { RuntimeMatrix } from "@/components/runtime-matrix";
import { Roadmap } from "@/components/roadmap";
import { getRepositorySnapshot } from "@/lib/github";
import { githubUrl, heroCode } from "@/lib/content";
import { brandAssets } from "@/lib/brand";

function formatCount(value: number) {
  return new Intl.NumberFormat("en-US", { notation: value >= 1000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(value);
}

export default async function HomePage() {
  const repo = await getRepositorySnapshot();

  return (
    <main>
      <SiteHeader />
      <div className="page-ambient" aria-hidden="true"><div className="ambient-orb ambient-one" /><div className="ambient-orb ambient-two" /></div>

      <section className="hero-shell section-shell" id="top">
        <div className="hero-grid-bg" aria-hidden="true" />
        <div className="relative z-10 grid items-center gap-14 lg:grid-cols-[.92fr_1.08fr]">
          <div className="pt-24 lg:pt-20">
            <a href={`${githubUrl}#roadmap`} className="announcement-pill"><span className="announcement-dot" /> Phase 4 complete <ArrowRight size={13} /></a>
            <h1 className="hero-title">Every request<br /><span>owns</span> its work.</h1>
            <p className="hero-copy">A Web Standards framework for TypeScript that keeps child tasks, cancellation, and scoped resources inside explicit Handler and Delivery lifetimes.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/docs" className="primary-button"><Sparkles size={16} /> Start building</Link>
              <a href={githubUrl} className="secondary-button"><Github size={16} /> View on GitHub</a>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-xs text-[var(--muted)]">
              <span className="inline-flex items-center gap-2"><Check size={13} className="text-blue-400" /> Apache-2.0</span>
              <span className="inline-flex items-center gap-2"><Check size={13} className="text-blue-400" /> TypeScript strict</span>
              <span className="inline-flex items-center gap-2"><Check size={13} className="text-blue-400" /> Node.js ready</span>
            </div>
          </div>

          <div className="relative min-w-0 pt-2 lg:pt-24">
            <div className="hero-console-wrap">
              <div className="hero-console-glow" />
              <CodeBlock code={heroCode} filename="app.ts" compact />
              <div className="hero-lifetime-badge">
                <span className="relative"><span className="absolute inset-0 animate-pulseRing rounded-full bg-emerald-400/30" /><span className="relative block h-2.5 w-2.5 rounded-full bg-emerald-400" /></span>
                Handler settled · Delivery active
              </div>
            </div>
            <div className="hero-brand-card animate-float">
              <img src={brandAssets.icon} alt="Nelo icon" width={78} height={78} className="rounded-[22px]" />
              <div><p className="text-sm font-semibold">Request ownership</p><p className="mt-1 text-[11px] text-white/45">Await · cancel · release</p></div>
            </div>
          </div>
        </div>
        <div className="hero-bottom-line" />
      </section>

      <section className="section-shell py-14 sm:py-20" aria-label="Project metrics">
        <div className="metrics-strip">
          <div><span className="metric-value">04</span><span className="metric-label">Phases complete</span></div>
          <div><span className="metric-value">62</span><span className="metric-label">Passing tests</span></div>
          <div><span className="metric-value">{formatCount(repo.stars)}</span><span className="metric-label"><Star size={12} /> GitHub stars</span></div>
          <div><span className="metric-value">2</span><span className="metric-label">Lifetime scopes</span></div>
        </div>
      </section>

      <section className="section-shell py-20 sm:py-28" id="concept">
        <div className="section-heading">
          <div><p className="eyebrow">Structured ownership</p><h2>Async work should have<br />somewhere to belong.</h2></div>
          <p>Nelo turns request lifetime into visible primitives. Work created for a request must be awaited, cancelled, released, or explicitly transferred.</p>
        </div>

        <div className="bento-grid mt-12">
          <OwnershipMap />
          <RequestLab />

          <div className="bento-card p-6 sm:p-7">
            <div className="flex items-start justify-between"><span className="feature-icon"><Workflow size={19} /></span><span className="mini-chip">OwnedTask</span></div>
            <h3 className="mt-8 text-xl font-semibold">Child tasks stay inside the request.</h3>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">Named tasks retain ancestry, settlement state, and failures for diagnostics.</p>
            <div className="task-stack mt-7"><div><span /><code>request/users/:id</code></div><div><span /><code>task/user</code></div><div><span /><code>task/feed</code></div></div>
          </div>

          <div className="bento-card p-6 sm:p-7">
            <div className="flex items-start justify-between"><span className="feature-icon"><ShieldCheck size={19} /></span><span className="mini-chip">AbortSignal</span></div>
            <h3 className="mt-8 text-xl font-semibold">Cancellation keeps its reason.</h3>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">One cooperative signal moves through child scopes while preserving the first typed reason.</p>
            <div className="reason-cloud mt-7">{["client_disconnect", "server_shutdown", "delivery_error"].map((reason) => <span key={reason}>{reason}</span>)}</div>
          </div>

          <div className="bento-card p-6 sm:p-7">
            <div className="flex items-start justify-between"><span className="feature-icon"><Boxes size={19} /></span><span className="mini-chip">LIFO</span></div>
            <h3 className="mt-8 text-xl font-semibold">Cleanup is deterministic.</h3>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">Resources close exactly once, in reverse acquisition order, after owned work settles.</p>
            <div className="cleanup-list mt-7"><span>03 cache</span><span>02 database</span><span>01 tracing</span></div>
          </div>

          <div className="bento-card relative overflow-hidden p-6 sm:p-7">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[.06] to-emerald-400/[.025]" />
            <div className="relative">
              <div className="flex items-start justify-between"><span className="feature-icon"><Network size={19} /></span><span className="live-dot"><span /></span></div>
              <h3 className="mt-8 text-xl font-semibold">Live repository signal.</h3>
              <div className="mt-6 grid grid-cols-3 gap-2">
                <div className="repo-stat"><strong>{formatCount(repo.stars)}</strong><span>stars</span></div>
                <div className="repo-stat"><strong>{formatCount(repo.forks)}</strong><span>forks</span></div>
                <div className="repo-stat"><strong>{repo.openIssues}</strong><span>issues</span></div>
              </div>
              <a href={githubUrl} className="mt-6 inline-flex items-center gap-2 text-xs font-medium text-blue-400">lasder-ca/Nelo <ArrowRight size={13} /></a>
            </div>
          </div>
        </div>
      </section>

      <section className="section-shell py-20 sm:py-28" id="api">
        <div className="section-heading">
          <div><p className="eyebrow">Core API</p><h2>Small surface.<br />Explicit lifetime.</h2></div>
          <p>Each primitive says who owns the work and when it must settle. The code remains normal TypeScript built around Request, Response, ReadableStream, and AbortSignal.</p>
        </div>
        <CodeShowcase />
      </section>

      <section className="section-shell py-20 sm:py-28"><RuntimeMatrix /></section>
      <Roadmap />

      <section className="section-shell pb-20 pt-8 sm:pb-28">
        <div className="cta-panel">
          <div className="cta-grid" aria-hidden="true" />
          <div className="cta-brand-asset cta-brand-left cta-ghost-card" aria-hidden="true"><span>context.fork()</span><b>owned task</b></div>
          <div className="cta-brand-asset cta-brand-right cta-ghost-card" aria-hidden="true"><span>delivery scope</span><b>cleanup once</b></div>
          <img src={brandAssets.icon} alt="" width={88} height={88} className="relative z-10 rounded-[26px] shadow-2xl" />
          <div className="relative z-10 max-w-2xl text-center">
            <p className="eyebrow">Experimental, intentionally</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-[-.045em] sm:text-5xl">Make request lifetime part of the program.</h2>
            <p className="mx-auto mt-5 max-w-xl text-sm leading-6 text-[var(--muted)]">Explore the current API, run the examples, and follow the runtime adapter work before the first npm release.</p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/docs" className="primary-button"><Braces size={16} /> Read the docs</Link>
              <Link href="/examples" className="secondary-button"><Radio size={16} /> Browse examples</Link>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
