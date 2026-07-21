import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata = { title: "Examples" };
const examples = [
  ["Owned task", `app.get("/user/:id", async (c) => {\n  const user = c.fork("user", (signal) =>\n    loadUser(c.params.id, { signal })\n  )\n  return c.json(await user)\n})`],
  ["Scoped resource", `app.get("/report", async (c) => {\n  const db = await c.use("db", connect, (db) => db.close())\n  return c.json(await db.report())\n})`],
  ["Delivery work", `return c.stream((stream) => {\n  c.delivery.fork("heartbeat", (signal) =>\n    keepAlive(stream, { signal })\n  )\n})`],
];
export default function ExamplesPage() { return <main><SiteHeader /><div className="page-shell examples-page"><header><p className="eyebrow">Examples</p><h1>Small patterns for owned work.</h1><p>Each example focuses on a single lifetime rule and stays close to normal TypeScript.</p></header><div className="example-list">{examples.map(([title, code], i) => <article key={title}><span>0{i+1}</span><div><h2>{title}</h2><pre><code>{code}</code></pre></div></article>)}</div></div><SiteFooter /></main> }
