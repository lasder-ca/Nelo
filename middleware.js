export const config = { matcher: "/" };

const supported = new Set(["en", "ja", "ko", "zh"]);

function readCookie(header, name) {
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : "";
}

function localeFromCountry(country) {
  if (country === "JP") return "ja";
  if (country === "KR") return "ko";
  if (["CN", "TW", "HK", "MO"].includes(country)) return "zh";
  return "en";
}

function localeFromLanguage(header) {
  const language = header.toLowerCase();
  if (language.includes("ja")) return "ja";
  if (language.includes("ko")) return "ko";
  if (language.includes("zh")) return "zh";
  return "en";
}

export default function middleware(request) {
  const url = new URL(request.url);
  const queryLocale = url.searchParams.get("lang") || "";
  const cookieLocale = readCookie(request.headers.get("cookie") || "", "nelo_locale");
  const country = (request.headers.get("x-vercel-ip-country") || "").toUpperCase();
  const accepted = request.headers.get("accept-language") || "";
  const locale = supported.has(queryLocale)
    ? queryLocale
    : supported.has(cookieLocale)
      ? cookieLocale
      : country
        ? localeFromCountry(country)
        : localeFromLanguage(accepted);

  const destination = new URL(`/${locale}`, request.url);
  return new Response(null, {
    status: 307,
    headers: {
      Location: destination.toString(),
      "Set-Cookie": `nelo_locale=${locale}; Path=/; Max-Age=31536000; SameSite=Lax`,
      "Cache-Control": "private, no-store",
      Vary: "X-Vercel-IP-Country, Accept-Language, Cookie",
    },
  });
}
