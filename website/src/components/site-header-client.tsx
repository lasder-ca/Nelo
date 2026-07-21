"use client";

import Link from "next/link";
import { ChevronDown, Github, Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { brandAssets } from "@/lib/brand";
import { githubUrl } from "@/lib/content";
import { getDictionary, htmlLang, localeNames, locales, type Locale } from "@/lib/i18n";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function LanguagePicker({ locale, label, mobile = false }: { locale: Locale; label: string; mobile?: boolean }) {
  function changeLocale(nextLocale: Locale) {
    document.cookie = `nelo_locale=${nextLocale}; Path=/; Max-Age=31536000; SameSite=Lax`;
    document.documentElement.lang = htmlLang[nextLocale];
    window.location.reload();
  }

  return (
    <label className={`language-picker${mobile ? " mobile-language-picker" : ""}`}>
      <span className="sr-only">{label}</span>
      <select
        value={locale}
        aria-label={label}
        onChange={(event) => changeLocale(event.target.value as Locale)}
      >
        {locales.map((item) => (
          <option value={item} key={item}>{localeNames[item]}</option>
        ))}
      </select>
      <ChevronDown size={13} aria-hidden="true" />
    </label>
  );
}

export function SiteHeaderClient({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const t = getDictionary(locale);
  const links = [
    [t.nav.home, "/"],
    [t.nav.docs, "/docs"],
    [t.nav.examples, "/examples"],
    [t.nav.roadmap, "/roadmap"],
  ] as const;

  return (
    <header className="site-header">
      <div className="glass-nav-wrap">
        <div className="glass-nav">
          <Link href="/" className="glass-brand" aria-label={t.nav.brandAria}>
            <img src={brandAssets.icon} alt="" />
            <span>Nelo</span>
          </Link>

          <nav className="desktop-nav" aria-label={t.nav.primary}>
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
            <LanguagePicker locale={locale} label={t.nav.language} />
            <ThemeToggle />
            <a className="icon-button github-button" href={githubUrl} aria-label={t.nav.githubAria}>
              <Github size={16} />
            </a>
            <button
              className="icon-button menu-button"
              type="button"
              aria-label={t.nav.openMenu}
              onClick={() => setOpen(true)}
            >
              <Menu size={17} />
            </button>
          </div>
        </div>
      </div>

      {open ? (
        <div className="mobile-menu" role="dialog" aria-modal="true" aria-label={t.nav.dialog}>
          <button className="mobile-menu-backdrop" aria-label={t.nav.closeMenu} onClick={() => setOpen(false)} />
          <div className="mobile-menu-panel">
            <div className="mobile-menu-top">
              <div className="glass-brand"><img src={brandAssets.icon} alt="" /><span>Nelo</span></div>
              <button className="icon-button" type="button" aria-label={t.nav.closeMenu} onClick={() => setOpen(false)}>
                <X size={17} />
              </button>
            </div>
            <LanguagePicker locale={locale} label={t.nav.language} mobile />
            <nav>
              {links.map(([label, href]) => (
                <Link
                  key={href}
                  href={href}
                  className={isActive(pathname, href) ? "active" : undefined}
                  onClick={() => setOpen(false)}
                >
                  <span>{label}</span><small>{t.nav.open}</small>
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
