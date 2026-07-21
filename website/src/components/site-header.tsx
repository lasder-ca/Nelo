"use client";

import Link from "next/link";
import { Github, Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { brandAssets } from "@/lib/brand";
import { githubUrl } from "@/lib/content";

const links = [
  ["Home", "/"],
  ["Docs", "/docs"],
  ["Examples", "/examples"],
  ["Roadmap", "/roadmap"],
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="site-header">
      <div className="glass-nav-wrap">
        <div className="glass-nav">
          <Link href="/" className="glass-brand" aria-label="Nelo home">
            <img src={brandAssets.icon} alt="" />
            <span>Nelo</span>
          </Link>

          <nav className="desktop-nav" aria-label="Primary navigation">
            {links.map(([label, href]) => (
              <Link
                key={href}
                href={href}
                className={isActive(pathname, href) ? "active" : undefined}
                aria-current={isActive(pathname, href) ? "page" : undefined}
              >
                {label}
              </Link>
            ))}
          </nav>

          <div className="header-actions">
            <ThemeToggle />
            <a className="icon-button github-button" href={githubUrl} aria-label="View Nelo on GitHub">
              <Github size={16} />
            </a>
            <button
              className="icon-button menu-button"
              type="button"
              aria-label="Open menu"
              onClick={() => setOpen(true)}
            >
              <Menu size={17} />
            </button>
          </div>
        </div>
      </div>

      {open ? (
        <div className="mobile-menu" role="dialog" aria-modal="true" aria-label="Navigation">
          <button className="mobile-menu-backdrop" aria-label="Close menu" onClick={() => setOpen(false)} />
          <div className="mobile-menu-panel">
            <div className="mobile-menu-top">
              <div className="glass-brand"><img src={brandAssets.icon} alt="" /><span>Nelo</span></div>
              <button className="icon-button" type="button" aria-label="Close menu" onClick={() => setOpen(false)}>
                <X size={17} />
              </button>
            </div>
            <nav>
              {links.map(([label, href]) => (
                <Link
                  key={href}
                  href={href}
                  className={isActive(pathname, href) ? "active" : undefined}
                  onClick={() => setOpen(false)}
                >
                  <span>{label}</span><small>Open</small>
                </Link>
              ))}
            </nav>
            <a href={githubUrl} className="glass-button secondary"><Github size={15} /> GitHub</a>
          </div>
        </div>
      ) : null}
    </header>
  );
}
