import type { Metadata } from "next";
import { DocsGrid, DocsShell } from "@/components/site/docs-shell";

export const metadata: Metadata = { title: "Docs" };

export default function DocsPage() {
  return (
    <DocsShell
      eyebrow="Documentation"
      title="Own the lifetime, not the platform."
      description="Nelo keeps Request, Response, ReadableStream, and AbortSignal familiar. These pages document only the ownership boundaries added around ordinary TypeScript."
    >
      <DocsGrid />
      <section className="docs-note glass-surface">
        <span>Reading order</span>
        <p>Start with Getting started, then read Request ownership. The API reference is intentionally small and can be used as a quick lookup.</p>
      </section>
    </DocsShell>
  );
}
