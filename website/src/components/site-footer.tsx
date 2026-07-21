import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div><strong>Nelo</strong><span>Every request owns its work.</span></div>
      <nav><Link href="/docs">Docs</Link><Link href="/examples">Examples</Link><Link href="/roadmap">Roadmap</Link></nav>
    </footer>
  );
}
