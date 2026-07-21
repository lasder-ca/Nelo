import Link from "next/link";
import { ArrowRight, BookOpen, Boxes, Code2, FileCode2 } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";

const navPaths = [
  "/docs",
  "/docs/getting-started",
  "/docs/concepts/request-ownership",
  "/docs/api",
] as const;

export async function DocsShell({
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
  const locale = await getLocale();
  const t = getDictionary(locale);

  return (
    <main>
      <SiteHeader />
      <div className="docs-page page-shell">
        <aside className="docs-sidebar glass-surface">
          <p>{t.docs.sidebarTitle}</p>
          <nav aria-label={t.docs.sidebarTitle}>
            {t.docs.nav.map((label, index) => (
              <Link key={navPaths[index]} href={navPaths[index]}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                {label}
              </Link>
            ))}
          </nav>
          <div className="docs-sidebar-note">
            <strong>{t.docs.noteTitle}</strong>
            <span>{t.docs.noteText}</span>
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

export async function DocsGrid() {
  const locale = await getLocale();
  const t = getDictionary(locale);
  const cardMeta = [
    [BookOpen, "/docs/getting-started"],
    [Boxes, "/docs/concepts/request-ownership"],
    [FileCode2, "/docs/api"],
    [Code2, "/examples"],
  ] as const;

  return (
    <div className="docs-grid">
      {t.docs.cards.map(([title, text], index) => {
        const [Icon, href] = cardMeta[index]!;
        return (
          <Link className="docs-card glass-surface" key={title} href={href}>
            <div className="docs-card-top"><span>0{index + 1}</span><Icon size={18} /></div>
            <h2>{title}</h2>
            <p>{text}</p>
            <ArrowRight size={15} />
          </Link>
        );
      })}
    </div>
  );
}
