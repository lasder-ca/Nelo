import { NextRequest, NextResponse } from "next/server";
import { isLocale, type Locale } from "@/lib/i18n";

const localeCookieName = "nelo_locale";
const oneYear = 60 * 60 * 24 * 365;

function localeFromCountry(country: string | null): Locale {
  switch (country?.toUpperCase()) {
    case "JP":
      return "ja";
    case "KR":
    case "KP":
      return "ko";
    case "CN":
    case "HK":
    case "MO":
    case "TW":
    case "SG":
      return "zh";
    default:
      return "en";
  }
}

function localeFromAcceptLanguage(value: string | null): Locale {
  const language = value?.toLowerCase() ?? "";
  if (language.includes("ja")) return "ja";
  if (language.includes("ko")) return "ko";
  if (language.includes("zh")) return "zh";
  return "en";
}

function setLocaleCookie(response: NextResponse, locale: Locale) {
  response.cookies.set(localeCookieName, locale, {
    path: "/",
    maxAge: oneYear,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const explicitMatch = pathname.match(/^\/(ja|en|ko|zh)(?=\/|$)/);
  const explicitLocale = explicitMatch?.[1];

  if (isLocale(explicitLocale)) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.slice(explicitLocale.length + 1) || "/";
    const response = NextResponse.redirect(url);
    setLocaleCookie(response, explicitLocale);
    return response;
  }

  const cookieLocale = request.cookies.get(localeCookieName)?.value;
  const locale = isLocale(cookieLocale)
    ? cookieLocale
    : request.headers.get("x-vercel-ip-country")
      ? localeFromCountry(request.headers.get("x-vercel-ip-country"))
      : localeFromAcceptLanguage(request.headers.get("accept-language"));

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nelo-locale", locale);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  if (!isLocale(cookieLocale)) setLocaleCookie(response, locale);
  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|brand|favicon.ico|robots.txt|sitemap.xml).*)"],
};
