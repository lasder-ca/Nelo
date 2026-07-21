import Link from "next/link";
import { Github } from "lucide-react";
import { githubUrl } from "@/lib/content";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="page-shell footer-inner">
        <div><strong>Nelo</strong><span>Every request owns its work.</span></div>
        <nav>
          <Link href="/docs">Docs</Link>
          <Link href="/examples">Examples</Link>
          <Link href="/roadmap">Roadmap</Link>
          <a href={githubUrl}><Github size={13} /> GitHub</a>
        </nav>
      </div>
    </footer>
  );
}
