import type { Metadata } from "next"
import { Check, CircleDashed } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DocsShell } from "@/components/site/docs-shell"
export const metadata: Metadata = { title: "Roadmap" }
const groups = [["Available", ["Portable request execution", "Handler and delivery scopes", "Typed cancellation reasons", "Node real-socket adapter"]], ["Next", ["Diagnostics ergonomics", "More delivery examples", "Adapter contract documentation"]], ["Later", ["Cloudflare adapter verification", "Bun adapter verification", "Stable 1.0 API review"]]]
export default function Page() { return <DocsShell eyebrow="Roadmap" title="Verified before advertised." description="The roadmap separates implemented behavior from planned adapter claims."><div className="grid gap-4 md:grid-cols-3">{groups.map(([title, items], i) => <Card key={title as string}><CardHeader><CardTitle>{title}</CardTitle></CardHeader><CardContent className="grid gap-3">{(items as string[]).map((item) => <div key={item} className="flex gap-2 text-sm text-muted-foreground">{i === 0 ? <Check className="mt-1 size-4 shrink-0 text-emerald-300" /> : <CircleDashed className="mt-1 size-4 shrink-0" />}{item}</div>)}</CardContent></Card>)}</div></DocsShell> }
