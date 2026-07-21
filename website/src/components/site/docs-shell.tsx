import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Boxes,
  Code2,
  FileCode2,
  Map,
  ScrollText,
} from "lucide-react";

const nav = [
  ["Overview", "/docs"],
  ["Getting started", "/docs/getting-started"],
  ["Request ownership", "/docs/concepts/request-ownership"],
  ["Examples", "/examples"],
  ["Roadmap", "/roadmap"],
  ["Changelog", "/changelog"],
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
    <main className="section-shell docs-layout">
      <aside className="docs-sidebar">
        <Link className="docs-home" href="/">
          <ArrowLeft size={14} /> Home
        </Link>
        <nav className="docs-nav" aria-label="Documentation navigation">
          {nav.map(([label, href], index) => (
            <Link key={href} href={href}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              {label}
            </Link>
          ))}
        </nav>
      </aside>

      <article className="docs-article">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="docs-title">{title}</h1>
        <p className="docs-description">{description}</p>
        <div className="docs-body">{children}</div>
      </article>
    </main>
  );
}

export function DocsGrid() {
  const cards = [
    [BookOpen, "Getting started", "Install Nelo and run the smallest owned route.", "/docs/getting-started"],
    [Boxes, "Request ownership", "Understand task, resource, and delivery lifetimes.", "/docs/concepts/request-ownership"],
    [Code2, "Examples", "Copy focused patterns for common route shapes.", "/examples"],
    [Map, "Roadmap", "See what is implemented, verified, and still planned.", "/roadmap"],
    [ScrollText, "Changelog", "Track product and runtime changes.", "/changelog"],
    [FileCode2, "Source", "Read the implementation and open issues on GitHub.", "https://github.com/lasder-ca/Nelo"],
  ] as const;

  return (
    <div className="docs-grid">
      {cards.map(([Icon, title, text, href], index) => (
        <Link className="docs-card" key={title} href={href}>
          <span className="docs-card-index">{String(index + 1).padStart(2, "0")}</span>
          <Icon size={18} />
          <div>
            <h2>{title}</h2>
            <p>{text}</p>
          </div>
          <ArrowRight className="docs-card-arrow" size={14} />
        </Link>
      ))}
    </div>
  );
}
