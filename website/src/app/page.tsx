import Link from "next/link";
import { ArrowRight, Braces, CircleDot, Github, Layers3, Radio, Sparkles } from "lucide-react";
import { CodeBlock } from "@/components/code-block";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { brandAssets } from "@/lib/brand";
import { githubUrl, heroCode } from "@/lib/content";
import { getRepositorySnapshot } from "@/lib/github";
import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";

const featureIcons = [CircleDot, Braces, Radio] as const;

const brandCopy = {
  badge: "Request ownership for TypeScript",
  title: ["Every request", "owns its work."],
  summaryEyebrow: "One model, three boundaries",
  summaryTitle: "Make lifetime visible.",
  featureTitles: ["Owned tasks", "Scoped resources", "Delivery lifetime"],
} as const;

export default async function HomePage() {
  const [repo, locale] = await Promise.all([getRepositorySnapshot(), getLocale()]);
  const t = getDictionary(locale);

  return (
    <main>
      <SiteHeader />

      <section className="home-hero page-shell">
        <div className="hero-copy">
          <div className="hero-mark">
            <img src={brandAssets.icon} alt="Nelo" width={42} height={42} />
            <span>{brandCopy.badge}</span>
          </div>
          <h1 className="brand-headline">{brandCopy.title[0]}<br />{brandCopy.title[1]}</h1>
          <p>{t.home.description}</p>
          <div className="hero-actions">
            <Link href="/docs" className="glass-button primary">{t.home.readDocs} <ArrowRight size={15} /></Link>
            <a href={githubUrl} className="glass-button secondary"><Github size={15} /> GitHub</a>
          </div>
          <div className="hero-facts" aria-label="Project facts">
            <span><strong>62</strong> {t.home.tests}</span>
            <span><strong>04</strong> {t.home.phases}</span>
            <span><strong>{repo.stars}</strong> {t.home.stars}</span>
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
          <p className="eyebrow brand-kicker">{brandCopy.summaryEyebrow}</p>
          <h2 className="brand-heading">{brandCopy.summaryTitle}</h2>
          <Link href="/docs/concepts/request-ownership">{t.home.understand} <ArrowRight size={14} /></Link>
        </div>
        <div className="feature-grid">
          {t.home.features.map(({ text }, index) => {
            const Icon = featureIcons[index]!;
            const title = brandCopy.featureTitles[index]!;
            return (
              <article className="feature-glass" key={title}>
                <div className="feature-top"><span>0{index + 1}</span><Icon size={18} /></div>
                <h3 className="brand-feature-title">{title}</h3>
                <p>{text}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="page-links page-shell" aria-label="Explore Nelo">
        <Link href="/docs" className="page-link-card large">
          <div><span>{t.nav.docs}</span><h2>{t.home.cards.docs}</h2></div>
          <ArrowRight size={22} />
        </Link>
        <Link href="/examples" className="page-link-card">
          <Sparkles size={19} /><div><span>{t.nav.examples}</span><h3>{t.home.cards.examples}</h3></div><ArrowRight size={18} />
        </Link>
        <Link href="/roadmap" className="page-link-card">
          <Layers3 size={19} /><div><span>{t.nav.roadmap}</span><h3>{t.home.cards.roadmap}</h3></div><ArrowRight size={18} />
        </Link>
      </section>

      <SiteFooter />
    </main>
  );
}
