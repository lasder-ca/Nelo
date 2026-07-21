import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata = { title: "Docs" };

export default function DocsPage() {
  return <main><SiteHeader /><div className="page-shell docs-page">
    <aside className="docs-index"><span>Documentation</span><a href="#start">Getting started</a><a href="#ownership">Ownership model</a><a href="#api">Core API</a><a href="#runtime">Runtime notes</a></aside>
    <article className="docs-content">
      <header><p className="eyebrow">Documentation</p><h1>Build around explicit request lifetime.</h1><p>Everything needed to start using the current experimental API, kept in one maintained documentation surface.</p></header>
      <section id="start"><h2>Getting started</h2><pre><code>npm install nelo</code></pre><pre><code>{`import { Nelo } from "nelo"
import { serve } from "nelo/node"

const app = new Nelo()
app.get("/", (c) => c.text("Hello"))
await serve(app, { port: 3000 }).listen()`}</code></pre></section>
      <section id="ownership"><h2>Ownership model</h2><p><strong>Handler Scope</strong> owns middleware, the route handler, <code>context.fork()</code>, and <code>context.use()</code>. <strong>Delivery Scope</strong> owns work that must remain alive while the response body is being delivered.</p></section>
      <section id="api"><h2>Core API</h2><div className="api-doc-grid"><div><code>context.fork(name, operation)</code><p>Create a named task owned by the request.</p></div><div><code>context.use(name, acquire, cleanup)</code><p>Acquire a resource and release it once.</p></div><div><code>context.signal</code><p>Receive cooperative cancellation with a typed reason.</p></div><div><code>context.delivery.fork()</code><p>Attach work to response delivery.</p></div></div></section>
      <section id="runtime"><h2>Runtime notes</h2><p>The portable core works with Web Standards. Node.js currently has the fully tested transport behavior, including client disconnect tracking and graceful shutdown.</p></section>
    </article>
  </div><SiteFooter /></main>;
}
