import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DocsShell } from "@/components/site/docs-shell"
export const metadata: Metadata = { title: "Getting started" }
export default function Page() { return <DocsShell eyebrow="Getting started" title="Start with one route." description="Move a single promise into the request that owns it. Add resources and delivery scopes only when the route needs them."><h2>Install</h2><pre><code>{`npm install nelo`}</code></pre><h2>Create a route</h2><pre><code>{`import { Nelo } from "nelo"\nimport { serve } from "nelo/node"\n\nconst app = new Nelo()\n\napp.get("/report", async (context) => {\n  const report = context.fork(\n    "report",\n    (signal) => buildReport({ signal }),\n  )\n\n  return context.json(await report)\n})\n\nawait serve(app, { port: 3000 }).listen()`}</code></pre><h2>What Nelo owns</h2><ul><li>The child promise has a stable name and parent.</li><li>The request signal reaches the child task.</li><li>The scope waits for a settled outcome instead of leaving work behind.</li></ul><div className="pt-4"><Button asChild><Link href="/docs/concepts/request-ownership">Read the ownership model<ArrowRight /></Link></Button></div></DocsShell> }
