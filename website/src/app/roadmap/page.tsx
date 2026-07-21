import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
export const metadata = { title: "Roadmap" };
const phases = [
  ["01", "Ownership core", "Complete", "Lifetime scopes, owned tasks, typed cancellation, and deterministic cleanup."],
  ["02", "Portable web surface", "Complete", "Router, middleware, context helpers, and Fetch-style application API."],
  ["03", "Node transport", "Complete", "Real socket disconnect tests, delivery tracking, graceful shutdown, and CI."],
  ["04", "Handler + Delivery", "Complete", "Separate lifetimes, delivery-owned work, typed abort reasons, and diagnostics."],
  ["05", "Runtime expansion", "Planned", "Cloudflare, Deno, and Bun adapters with real transport-specific tests."],
];
export default function RoadmapPage(){return <main><SiteHeader/><div className="page-shell roadmap-page"><header><p className="eyebrow">Roadmap</p><h1>Claims follow tests.</h1><p>Nelo moves phase by phase. A runtime is listed as supported only after its transport behavior is verified.</p></header><div className="roadmap-list">{phases.map(([n,t,s,d])=><article key={n} className={s === 'Planned' ? 'planned' : ''}><span>{n}</span><div><h2>{t}</h2><p>{d}</p></div><small>{s}</small></article>)}</div></div><SiteFooter/></main>}
