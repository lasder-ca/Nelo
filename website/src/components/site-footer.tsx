import Link from "next/link";
import { ExternalLink, Github } from "lucide-react";
import { githubUrl } from "@/lib/content";
import { brandAssets } from "@/lib/brand";

export function SiteFooter() {
  return (
    <footer className="section-shell pb-8 pt-10">
      <div className="footer-panel">
        <div className="flex items-center gap-3">
          <img src={brandAssets.icon} alt="Nelo" width={42} height={42} className="rounded-xl" />
          <div><p className="font-semibold">Nelo</p><p className="text-xs text-[var(--muted)]">Every request owns its work.</p></div>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-xs text-[var(--muted)]">
          <Link href="/docs" className="footer-link">Docs</Link>
          <Link href="/examples" className="footer-link">Examples</Link>
          <a href={`${githubUrl}/blob/main/LICENSE`} className="footer-link">Apache-2.0</a>
          <a href={githubUrl} className="footer-link inline-flex items-center gap-1.5"><Github size={13} /> GitHub <ExternalLink size={11} /></a>
        </div>
      </div>
      <div className="mt-5 flex flex-col gap-2 px-1 text-[11px] text-[var(--muted)] sm:flex-row sm:justify-between">
        <span>Experimental software. The package is not published to npm yet.</span>
        <span>Web Standards · TypeScript strict · Node.js ready</span>
      </div>
    </footer>
  );
}
