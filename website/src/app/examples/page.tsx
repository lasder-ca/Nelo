import type { Metadata } from "next";
import { ArrowRight, Database, Radio, Workflow } from "lucide-react";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = { title: "Examples" };

const examples = [
  {
    icon: Workflow,
    title: "Owned parallel work",
    description: "Start independent child tasks while preserving one request boundary.",
    code: `const user = context.fork("user", (signal) =>\n  fetchUser(id, { signal })\n)\n\nconst feed = context.fork("feed", (signal) =>\n  fetchFeed(id, { signal })\n)\n\nreturn context.json({\n  user: await user,\n  feed: await feed,\n})`,
  },
  {
    icon: Database,
    title: "Scoped database resource",
    description: "Acquire once and guarantee cleanup after the owning scope settles.",
    code: `const db = await context.use(\n  "database",\n  (signal) => connect({ signal }),\n  (resource) => resource.close(),\n)\n\nreturn context.json(await db.query(...))`,
  },
  {
    icon: Radio,
    title: "Streaming delivery",
    description: "Keep the file handle alive until the response stream closes.",
    code: `const file = await context.delivery.use(\n  "file",\n  () => openFile(path),\n  (resource) => resource.close(),\n)\n\nreturn new Response(file.stream())`,
  },
] as const;

export default function ExamplesPage() {
  return (
    <main>
      <SiteHeader />
      <section className="page-hero page-shell">
        <p className="eyebrow">Examples</p>
        <h1>Patterns you can copy.</h1>
        <p>Each example isolates one ownership concern so the lifetime remains visible in ordinary TypeScript.</p>
      </section>

      <section className="examples-grid page-shell">
        {examples.map(({ icon: Icon, title, description, code }, index) => (
          <article className="example-card glass-surface" key={title}>
            <header><span>0{index + 1}</span><Icon size={19} /></header>
            <h2>{title}</h2>
            <p>{description}</p>
            <pre><code>{code}</code></pre>
          </article>
        ))}
      </section>

      <section className="compact-callout page-shell glass-surface">
        <div><span>Need the underlying model?</span><h2>Read request ownership before building an adapter.</h2></div>
        <Link href="/docs/concepts/request-ownership" className="glass-button primary">Open the concept guide <ArrowRight size={15} /></Link>
      </section>
      <SiteFooter />
    </main>
  );
}
