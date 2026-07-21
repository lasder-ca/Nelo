"use client";

import Link from "next/link";
import { Github, Menu, X } from "lucide-react";
import { useState } from "react";
import { githubUrl } from "@/lib/content";
import { ThemeToggle } from "@/components/theme-toggle";
import { brandAssets } from "@/lib/brand";

const links = [
  ["Model", "/#concept"],
  ["API", "/#api"],
  ["Runtimes", "/#runtimes"],
  ["Roadmap", "/#roadmap"],
  ["Docs", "/docs"],
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="site-header">
      <div className="section-shell header-inner">
        <Link href="/" className="header-brand" aria-label="Nelo home">
          <img src={brandAssets.icon} alt="" />
          <span>Nelo</span>
          <small>experimental</small>
        </Link>

        <nav className="desktop-nav" aria-label="Primary navigation">
          {links.map(([label, href]) => <Link key={label} href={href}>{label}</Link>)}
        </nav>

        <div className="header-actions">
          <ThemeToggle />
          <a className="icon-button github-button" href={githubUrl} aria-label="View Nelo on GitHub"><Github size={16} /></a>
          <button className="icon-button menu-button" type="button" aria-label="Open menu" onClick={() => setOpen(true)}><Menu size={17} /></button>
        </div>
      </div>

      {open ? (
        <div className="mobile-menu" role="dialog" aria-modal="true">
          <div className="mobile-menu-panel">
            <div className="mobile-menu-top">
              <span>Nelo</span>
              <button className="icon-button" type="button" aria-label="Close menu" onClick={() => setOpen(false)}><X size={17} /></button>
            </div>
            <nav>
              {links.map(([label, href]) => <Link key={label} href={href} onClick={() => setOpen(false)}>{label}</Link>)}
            </nav>
            <a href={githubUrl} className="secondary-button"><Github size={15} /> GitHub</a>
          </div>
        </div>
      ) : null}
    </header>
  );
}
