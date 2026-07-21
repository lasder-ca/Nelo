import type { Metadata } from "next"
import { Badge } from "@/components/ui/badge"
import { DocsShell } from "@/components/site/docs-shell"
export const metadata: Metadata = { title: "Changelog" }
export default function Page() { return <DocsShell eyebrow="Changelog" title="Small releases, explicit changes." description="Nelo remains experimental. Entries describe shipped behavior without implying unverified runtime support."><div className="space-y-8"><section><Badge>0.2.0-alpha.1</Badge><h2>Node adapter and delivery lifetime</h2><ul><li>Added the Node real-socket adapter.</li><li>Separated handler and delivery resource scopes.</li><li>Added typed abort reasons and request diagnostics.</li></ul></section><section><Badge variant="outline">0.1.0-alpha.1</Badge><h2>Portable core</h2><ul><li>Introduced request-owned tasks and resources.</li><li>Kept Fetch Request and Response as the platform boundary.</li></ul></section></div></DocsShell> }
