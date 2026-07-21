"use client"

import Image from "next/image"
import Link from "next/link"
import { Code2, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

const nav = [["Overview", "/#overview"], ["Model", "/#model"], ["Migrate", "/#migrate"], ["Runtime", "/#runtime"], ["Docs", "/docs"]]

export function SiteHeader() {
  return <header className="sticky top-0 z-50 border-b border-white/8 bg-background/75 backdrop-blur-xl"><div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-5 px-5 md:px-8">
    <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tight"><Image src="/brand/nelo-mark.svg" alt="" width={28} height={34} className="h-8 w-7 object-contain" priority /><span className="text-base">Nelo</span></Link>
    <nav className="mx-auto hidden items-center gap-1 rounded-xl border border-white/8 bg-white/[0.035] p-1 md:flex">{nav.map(([label, href]) => <Link key={href} href={href} className="rounded-lg px-3 py-1.5 text-xs text-muted-foreground transition hover:bg-white/[0.06] hover:text-foreground">{label}</Link>)}</nav>
    <div className="ml-auto flex items-center gap-2 md:ml-0"><div className="hidden items-center gap-1 rounded-lg border border-white/8 bg-white/[0.025] p-1 sm:flex">{["ja", "en", "ko", "zh"].map((locale) => <Link key={locale} href={`/${locale}`} className="rounded-md px-2 py-1 text-[10px] uppercase text-muted-foreground hover:bg-white/[0.06] hover:text-foreground">{locale}</Link>)}</div>
      <Button variant="outline" size="icon" asChild className="hidden sm:inline-flex"><Link href="https://github.com/lasder-ca/Nelo" aria-label="GitHub"><Code2 /></Link></Button>
      <Sheet><SheetTrigger asChild><Button variant="outline" size="icon" className="md:hidden" aria-label="Open menu"><Menu /></Button></SheetTrigger><SheetContent><SheetHeader><SheetTitle className="flex items-center gap-2"><Image src="/brand/nelo-mark.svg" alt="" width={24} height={28} /> Nelo</SheetTitle><SheetDescription>Every request owns its work.</SheetDescription></SheetHeader><nav className="mt-8 grid gap-2">{nav.map(([label, href]) => <Link key={href} href={href} className="rounded-xl border border-transparent px-4 py-3 text-sm text-muted-foreground hover:border-border hover:bg-accent hover:text-foreground">{label}</Link>)}</nav><div className="mt-auto grid grid-cols-4 gap-2 pt-8">{["ja", "en", "ko", "zh"].map((locale) => <Button key={locale} variant="outline" size="sm" asChild><Link href={`/${locale}`}>{locale.toUpperCase()}</Link></Button>)}</div></SheetContent></Sheet>
    </div>
  </div></header>
}
