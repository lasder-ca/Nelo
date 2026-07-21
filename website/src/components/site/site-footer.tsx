import Image from "next/image"
import Link from "next/link"
import { Separator } from "@/components/ui/separator"

export function SiteFooter() {
  return <footer className="mx-auto w-full max-w-7xl px-5 pb-10 pt-20 md:px-8"><Separator className="mb-8 bg-white/8" /><div className="grid gap-8 text-sm text-muted-foreground md:grid-cols-[1fr_auto_auto]">
    <div><div className="flex items-center gap-2 text-foreground"><Image src="/brand/nelo-mark.svg" alt="" width={24} height={28} /><strong>Nelo</strong></div><p className="mt-3 max-w-sm">A request-ownership runtime and Web Standards framework for TypeScript.</p></div>
    <div className="grid gap-2"><strong className="text-foreground">Explore</strong><Link href="/docs">Docs</Link><Link href="/examples">Examples</Link><Link href="/roadmap">Roadmap</Link></div>
    <div className="grid gap-2"><strong className="text-foreground">Project</strong><Link href="https://github.com/lasder-ca/Nelo">GitHub</Link><Link href="/changelog">Changelog</Link><span>Apache-2.0</span></div>
  </div><p className="mt-12 text-xs text-muted-foreground">© 2026 Nelo. Every request owns its work.</p></footer>
}
