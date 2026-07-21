import Link from "next/link";
import {
  ArrowRight,
  Braces,
  Check,
  CircleDot,
  Github,
  Radio,
  TerminalSquare,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CodeBlock } from "@/components/code-block";
import { RequestLab } from "@/components/request-lab";
import { RuntimeMatrix } from "@/components/runtime-matrix";
import { Roadmap } from "@/components/roadmap";
import { getRepositorySnapshot } from "@/lib/github";
import { githubUrl, heroCode } from "@/lib/content";
import { brandAssets } from "@/lib/brand";

function formatCount(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: value >= 1000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value);
}

const principles = [
  {
    index: "01",
    title: "Child work has an owner.",
    body: "context.fork() creates a named task that belongs to the current request. It cannot quietly become an untracked promise.",
    code: 'context.fork("profile", (signal) => loadProfile({ signal }))',
  },
  {
    index: "02",
    title: "Cancellation keeps its reason.",
    body: "The same cooperative signal travels through child scopes while the first abort reason remains available for diagnostics.",
    code: "context.signal.reason // client_disconnect",
  },
  {
    index: "03",
    title: "Cleanup runs once.",
    body: "Resources are released in reverse acquisition order after the work that owns them has settled.",
    code: 'context.use("database", connect, (db) => db.close())',
  },
] as const;

export default async function HomePage() {
  const repo = await getRepositorySnapshot();

  return (
    <main>
      <SiteHeader />

      <section className="hero section-shell" id="top">
        <div className="hero-copy-block">
          <div className="project-mark">
            <img src={brandAssets.icon} alt="Nelo" width={40} height={40} />
            <span>Request ownership runtime</span>
          </div>
          <h1>Every request owns its work.</h1>
          <p>
            Nelo is a Web Standards framework for TypeScript that makes child tasks,
            cancellation, resource cleanup, and response delivery explicit parts of the request lifecycle.
          </p>
          <div className="hero-actions">
            <Link href="/docs" className="primary-button">
              Read the docs <ArrowRight size={15} />
            </Link>
            <a href={githubUrl} className="secondary-button">
              <Github size={15} /> GitHub
            </a>
          </div>
        </div>

        <div className="hero-code">
          <div className="hero-code-label">
            <span>app.ts</span>
            <span>Handler Scope</span>
          </div>
          <CodeBlock code={heroCode} filename="app.ts" compact />
        </div>
      </section>

      <section className="status-strip" aria-label="Project status">
        <div className="section-shell status-grid">
          <div><span>phase</span><strong>04 complete</strong></div>
          <div><span>tests</span><strong>62 passing</strong></div>
          <div><span>repository</span><strong>{formatCount(repo.stars)} stars · {repo.openIssues} issues</strong></div>
          <div><span>license</span><strong>Apache-2.0</strong></div>
        </div>
      </section>

      <section className="section-shell section-block" id="concept">
        <div className="section-index">01 / Model</div>
        <div className="section-content">
          <div className="section-intro">
            <p className="eyebrow">Request ownership</p>
            <h2>Async work needs a boundary.</h2>
            <p>
              A handler returning does not always mean the request is finished. Nelo separates work owned by
              the handler from work required while the response body is still being delivered.
            </p>
          </div>

          <div className="lifetime-board">
            <div className="lifetime-row">
              <div className="lifetime-number">A</div>
              <div>
                <strong>Handler Scope</strong>
                <p>middleware · route handler · context.fork() · context.use()</p>
              </div>
              <span>settles first</span>
            </div>
            <div className="lifetime-divider" />
            <div className="lifetime-row">
              <div className="lifetime-number">B</div>
              <div>
                <strong>Delivery Scope</strong>
                <p>Response.body · delivery.fork() · delivery.use()</p>
              </div>
              <span>closes last</span>
            </div>
          </div>

          <div className="principle-list">
            {principles.map((item) => (
              <article key={item.index} className="principle-row">
                <span className="principle-index">{item.index}</span>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </div>
                <code>{item.code}</code>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section-shell section-block" id="api">
        <div className="section-index">02 / Live API</div>
        <div className="section-content">
          <div className="section-intro compact-intro">
            <p className="eyebrow">Server-backed lifecycle demo</p>
            <h2>Run the boundary.</h2>
            <p>
              The demo calls a real Next.js route and returns the Handler and Delivery timeline for success,
              disconnect, and producer failure.
            </p>
          </div>
          <RequestLab />
        </div>
      </section>

      <section className="section-shell section-block" id="surface">
        <div className="section-index">03 / Surface</div>
        <div className="section-content">
          <div className="section-intro compact-intro">
            <p className="eyebrow">Small API</p>
            <h2>Normal TypeScript, explicit ownership.</h2>
          </div>
          <div className="api-list">
            <div><span><TerminalSquare size={17} /> Owned tasks</span><code>context.fork(name, operation)</code></div>
            <div><span><CircleDot size={17} /> Cancellation</span><code>context.signal</code></div>
            <div><span><Braces size={17} /> Resources</span><code>context.use(name, acquire, cleanup)</code></div>
            <div><span><Radio size={17} /> Delivery</span><code>context.delivery.fork() / use()</code></div>
          </div>
          <div className="standards-row">
            {["Request", "Response", "ReadableStream", "AbortSignal"].map((item) => (
              <span key={item}><Check size={12} /> {item}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="section-shell section-block" id="runtimes">
        <div className="section-index">04 / Runtimes</div>
        <div className="section-content"><RuntimeMatrix /></div>
      </section>

      <Roadmap />

      <section className="section-shell final-callout">
        <div>
          <p className="eyebrow">Experimental software</p>
          <h2>Make request lifetime part of the program.</h2>
        </div>
        <div className="final-actions">
          <Link href="/docs" className="primary-button">Documentation <ArrowRight size={15} /></Link>
          <Link href="/examples" className="secondary-button">Examples</Link>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
