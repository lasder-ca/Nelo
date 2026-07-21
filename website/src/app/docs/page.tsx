import type { Metadata } from "next";
import { DocsGrid, DocsShell } from "@/components/site/docs-shell";
import { getDictionary } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";

export const metadata: Metadata = { title: "Docs" };

export default async function DocsPage() {
  const locale = await getLocale();
  const t = getDictionary(locale);

  return (
    <DocsShell
      eyebrow={t.docs.eyebrow}
      title={t.docs.title}
      description={t.docs.description}
    >
      <DocsGrid />
      <section className="docs-note glass-surface">
        <span>{t.docs.readingOrder}</span>
        <p>{t.docs.readingText}</p>
      </section>
    </DocsShell>
  );
}
