"use client";

import Link from "next/link";
import { Github, Menu, X } from "lucide-react";
import { useState } from "react";
import { brandAssets } from "@/lib/brand";

const links = [
  { href: "/", label: "Home" },
  { href: "/docs", label: "Docs" },
  { href: "/examples", label: "Examples" },
  { href: "/roadmap", label: "Roadmap" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="floating-header">
      <div className="glass-nav">
        <Link href="/" className="brand-link" aria-label="Nelo home">
          <img src={brandAssets.icon} alt="" />
          <span>Nelo</span>
        </Link>
        <nav className="desktop-links" aria-label="Primary navigation">
          {links.map((link) => <Link key={link.href} href={link.href}>{link.label}</Link>)}
        </nav>
        <div className="nav-actions">
          <a href="https://github.com/lasder-ca/Nelo" className="nav-icon" aria-label="GitHub"><Github size={17} /></a>
          <button className="nav-icon mobile-menu" onClick={() => setOpen(!open)} aria-label="Toggle menu">
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>
      {open && (
        <nav className="mobile-panel" aria-label="Mobile navigation">
          {links.map((link) => <Link key={link.href} href={link.href} onClick={() => setOpen(false)}>{link.label}</Link>)}
        </nav>
      )}
    </header>
  );
}
