import type { Metadata } from "next";
import { Check, CircleDashed, ShieldCheck } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";

export const metadata: Metadata = { title: "Roadmap" };

export default async function RoadmapPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);

  return (
    <main>
      <SiteHeader />
      <section className="page-hero page-shell roadmap-hero">
        <p className="eyebrow">{t.roadmap.eyebrow}</p>
        <h1>{t.roadmap.title}</h1>
        <p>{t.roadmap.description}</p>
      </section>

      <section className="roadmap-timeline page-shell">
        {t.roadmap.phases.map(([number, state, title, body], index) => {
          const complete = index === 0;
          return (
            <article className={`roadmap-card glass-surface ${complete ? "complete" : "planned"}`} key={number}>
              <div className="roadmap-index">{complete ? <Check size={17} /> : <CircleDashed size={17} />}<span>{number}</span></div>
              <div><small>{state}</small><h2>{title}</h2><p>{body}</p></div>
            </article>
          );
        })}
      </section>

      <section className="roadmap-principle page-shell glass-surface">
        <ShieldCheck size={22} />
        <div><span>{t.roadmap.releaseRule}</span><h2>{t.roadmap.releaseText}</h2></div>
      </section>
      <SiteFooter />
    </main>
  );
}
