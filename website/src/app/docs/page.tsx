import type { Metadata } from "next"
import { DocsGrid, DocsShell } from "@/components/site/docs-shell"
export const metadata: Metadata = { title: "Docs" }
export default function DocsPage() { return <DocsShell eyebrow="Documentation" title="Own the lifetime, not the platform." description="Nelo keeps standard Request and Response APIs. The documentation focuses only on the ownership lines you add around ordinary TypeScript code."><DocsGrid /></DocsShell> }
