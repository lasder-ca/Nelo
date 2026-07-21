import Link from "next/link";
import { Github } from "lucide-react";
import { githubUrl } from "@/lib/content";
import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";

export async function SiteFooter() {
  const locale = await getLocale();
  const t = getDictionary(locale);

  return (
    <footer className="site-footer">
      <div className="page-shell footer-inner">
        <div><strong>Nelo</strong><span>{t.footer.tagline}</span></div>
        <nav>
          <Link href="/docs">{t.nav.docs}</Link>
          <Link href="/examples">{t.nav.examples}</Link>
          <Link href="/roadmap">{t.nav.roadmap}</Link>
          <a href={githubUrl}><Github size={13} /> GitHub</a>
        </nav>
      </div>
    </footer>
  );
}
