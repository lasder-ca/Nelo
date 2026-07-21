import Link from "next/link";
import { ArrowRight, BookOpen, Boxes, Code2, FileCode2 } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

const nav = [
  ["Overview", "/docs"],
  ["Getting started", "/docs/getting-started"],
  ["Request ownership", "/docs/concepts/request-ownership"],
  ["API reference", "/docs/api"],
] as const;

export function DocsShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <main>
      <SiteHeader />
      <div className="docs-page page-shell">
        <aside className="docs-sidebar glass-surface">
          <p>Documentation</p>
          <nav aria-label="Documentation navigation">
            {nav.map(([label, href], index) => (
              <Link key={href} href={href}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                {label}
              </Link>
            ))}
          </nav>
          <div className="docs-sidebar-note">
            <strong>Web Standards first.</strong>
            <span>Only the ownership layer is new.</span>
          </div>
        </aside>

        <article className="docs-article">
          <header className="docs-hero">
            <p className="eyebrow">{eyebrow}</p>
            <h1>{title}</h1>
            <p>{description}</p>
          </header>
          <div className="docs-body">{children}</div>
        </article>
      </div>
      <SiteFooter />
    </main>
  );
}

export function DocsGrid() {
  const cards = [
    [BookOpen, "Getting started", "Install Nelo and run the smallest owned route.", "/docs/getting-started"],
    [Boxes, "Request ownership", "Understand handler, task, resource, and delivery lifetimes.", "/docs/concepts/request-ownership"],
    [FileCode2, "API reference", "Read the compact surface for tasks, signals, resources, and delivery.", "/docs/api"],
    [Code2, "Examples", "Copy focused patterns for common route shapes.", "/examples"],
  ] as const;

  return (
    <div className="docs-grid">
      {cards.map(([Icon, title, text, href], index) => (
        <Link className="docs-card glass-surface" key={title} href={href}>
          <div className="docs-card-top"><span>0{index + 1}</span><Icon size={18} /></div>
          <h2>{title}</h2>
          <p>{text}</p>
          <ArrowRight size={15} />
        </Link>
      ))}
    </div>
  );
}
