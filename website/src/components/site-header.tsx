"use client";

import Link from "next/link";
import { Github, Menu, X } from "lucide-react";
import { useState } from "react";
import { githubUrl } from "@/lib/content";
import { ThemeToggle } from "@/components/theme-toggle";
import { brandAssets } from "@/lib/brand";

const links = [
  ["Concept", "/#concept"],
  ["API", "/#api"],
  ["Runtimes", "/#runtimes"],
  ["Roadmap", "/#roadmap"],
  ["Docs", "/docs"],
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-6">
      <div className="header-shell mx-auto flex h-14 max-w-6xl items-center justify-between px-3 sm:px-4">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Nelo home">
          <span className="relative h-8 w-8 overflow-hidden rounded-[10px] border border-white/10 shadow-sm">
            <img src={brandAssets.icon} alt="" className="h-full w-full object-cover" />
          </span>
          <span className="text-sm font-semibold tracking-[-0.02em]">Nelo</span>
          <span className="hidden rounded-full border border-blue-400/20 bg-blue-400/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.16em] text-blue-400 sm:inline-flex">Experimental</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary navigation">
          {links.map(([label, href]) => <Link key={label} href={href} className="nav-link">{label}</Link>)}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <a className="icon-button hidden sm:inline-flex" href={githubUrl} aria-label="View Nelo on GitHub"><Github size={16} /></a>
          <Link href="/docs" className="primary-button hidden h-9 px-4 text-xs sm:inline-flex">Get started</Link>
          <button className="icon-button md:hidden" type="button" aria-label="Open menu" onClick={() => setOpen(true)}><Menu size={17} /></button>
        </div>
      </div>

      {open ? (
        <div className="fixed inset-0 z-[60] bg-black/65 p-3 backdrop-blur-md md:hidden" role="dialog" aria-modal="true">
          <div className="ml-auto flex h-full max-w-sm flex-col rounded-3xl border border-white/10 bg-[#0a0f16] p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <span className="font-semibold">Navigate</span>
              <button className="icon-button" type="button" aria-label="Close menu" onClick={() => setOpen(false)}><X size={17} /></button>
            </div>
            <nav className="mt-8 flex flex-col" aria-label="Mobile navigation">
              {links.map(([label, href]) => <Link key={label} href={href} className="border-b border-white/8 py-4 text-lg" onClick={() => setOpen(false)}>{label}</Link>)}
            </nav>
            <a href={githubUrl} className="secondary-button mt-auto"><Github size={16} /> View on GitHub</a>
          </div>
        </div>
      ) : null}
    </header>
  );
}
