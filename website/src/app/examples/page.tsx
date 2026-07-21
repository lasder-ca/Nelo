import type { Metadata } from "next";
import { ArrowRight, Database, Radio, Workflow } from "lucide-react";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";

export const metadata: Metadata = { title: "Examples" };

const exampleMeta = [
  {
    icon: Workflow,
    code: `const user = context.fork("user", (signal) =>\n  fetchUser(id, { signal })\n)\n\nconst feed = context.fork("feed", (signal) =>\n  fetchFeed(id, { signal })\n)\n\nreturn context.json({\n  user: await user,\n  feed: await feed,\n})`,
  },
  {
    icon: Database,
    code: `const db = await context.use(\n  "database",\n  (signal) => connect({ signal }),\n  (resource) => resource.close(),\n)\n\nreturn context.json(await db.query(...))`,
  },
  {
    icon: Radio,
    code: `const file = await context.delivery.use(\n  "file",\n  () => openFile(path),\n  (resource) => resource.close(),\n)\n\nreturn new Response(file.stream())`,
  },
] as const;

export default async function ExamplesPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);

  return (
    <main>
      <SiteHeader />
      <section className="page-hero page-shell">
        <p className="eyebrow">{t.examples.eyebrow}</p>
        <h1>{t.examples.title}</h1>
        <p>{t.examples.description}</p>
      </section>

      <section className="examples-grid page-shell">
        {t.examples.items.map(([title, description], index) => {
          const { icon: Icon, code } = exampleMeta[index]!;
          return (
            <article className="example-card glass-surface" key={title}>
              <header><span>0{index + 1}</span><Icon size={19} /></header>
              <h2>{title}</h2>
              <p>{description}</p>
              <pre><code>{code}</code></pre>
            </article>
          );
        })}
      </section>

      <section className="compact-callout page-shell glass-surface">
        <div><span>{t.examples.calloutLabel}</span><h2>{t.examples.calloutTitle}</h2></div>
        <Link href="/docs/concepts/request-ownership" className="glass-button primary">{t.examples.calloutButton} <ArrowRight size={15} /></Link>
      </section>
      <SiteFooter />
    </main>
  );
}
