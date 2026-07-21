import Link from "next/link";
import { ArrowRight, Braces, CircleDot, Github, Layers3, Radio, Sparkles } from "lucide-react";
import { CodeBlock } from "@/components/code-block";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { brandAssets } from "@/lib/brand";
import { githubUrl, heroCode } from "@/lib/content";
import { getRepositorySnapshot } from "@/lib/github";

const features = [
  {
    icon: CircleDot,
    title: "Owned tasks",
    text: "Every child operation has a parent, a signal, and a finish line.",
  },
  {
    icon: Braces,
    title: "Scoped resources",
    text: "Acquisition and cleanup stay attached to the request that uses them.",
  },
  {
    icon: Radio,
    title: "Delivery lifetime",
    text: "The response can keep ownership after the handler has returned.",
  },
] as const;

export default async function HomePage() {
  const repo = await getRepositorySnapshot();

  return (
    <main>
      <SiteHeader />

      <section className="home-hero page-shell">
        <div className="hero-copy">
          <div className="hero-mark">
            <img src={brandAssets.icon} alt="Nelo" width={42} height={42} />
            <span>Request ownership for TypeScript</span>
          </div>
          <h1>Every request<br />owns its work.</h1>
          <p>
            Nelo keeps child tasks, cancellation, resources, and response delivery inside one explicit lifecycle.
            Ordinary Web Standards on the outside. Structured ownership underneath.
          </p>
          <div className="hero-actions">
            <Link href="/docs" className="glass-button primary">Read the docs <ArrowRight size={15} /></Link>
            <a href={githubUrl} className="glass-button secondary"><Github size={15} /> GitHub</a>
          </div>
          <div className="hero-facts" aria-label="Project facts">
            <span><strong>62</strong> tests</span>
            <span><strong>04</strong> phases</span>
            <span><strong>{repo.stars}</strong> stars</span>
            <span><strong>Apache</strong> 2.0</span>
          </div>
        </div>

        <div className="liquid-stage" aria-label="Nelo request lifecycle preview">
          <div className="liquid-orb orb-one" />
          <div className="liquid-orb orb-two" />
          <div className="stage-glass">
            <div className="stage-titlebar">
              <div><span /><span /><span /></div>
              <p>app.ts</p>
              <small>Handler Scope</small>
            </div>
            <CodeBlock code={heroCode} filename="app.ts" compact />
            <div className="scope-rail">
              <span>request</span><i />
              <span>handler</span><i />
              <span>delivery</span>
            </div>
          </div>
        </div>
      </section>

      <section className="home-summary page-shell">
        <div className="summary-heading">
          <p className="eyebrow">One model, three boundaries</p>
          <h2>Make lifetime visible.</h2>
          <Link href="/docs/concepts/request-ownership">Understand the model <ArrowRight size={14} /></Link>
        </div>
        <div className="feature-grid">
          {features.map(({ icon: Icon, title, text }, index) => (
            <article className="feature-glass" key={title}>
              <div className="feature-top"><span>0{index + 1}</span><Icon size={18} /></div>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="page-links page-shell" aria-label="Explore Nelo">
        <Link href="/docs" className="page-link-card large">
          <div><span>Docs</span><h2>Start with the ownership model.</h2></div>
          <ArrowRight size={22} />
        </Link>
        <Link href="/examples" className="page-link-card">
          <Sparkles size={19} /><div><span>Examples</span><h3>Copy focused route patterns.</h3></div><ArrowRight size={18} />
        </Link>
        <Link href="/roadmap" className="page-link-card">
          <Layers3 size={19} /><div><span>Roadmap</span><h3>See what is verified next.</h3></div><ArrowRight size={18} />
        </Link>
      </section>

      <SiteFooter />
    </main>
  );
}
