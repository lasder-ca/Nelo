import { cookies, headers } from "next/headers";
import { isLocale, type Locale } from "@/lib/i18n";

export const localeCookieName = "nelo_locale";

export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(localeCookieName)?.value;
  if (isLocale(cookieLocale)) return cookieLocale;

  const headerStore = await headers();
  const headerLocale = headerStore.get("x-nelo-locale");
  if (isLocale(headerLocale)) return headerLocale;

  return "en";
}
