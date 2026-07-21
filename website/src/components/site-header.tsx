import { SiteHeaderClient } from "@/components/site-header-client";
import { getLocale } from "@/lib/locale";

export async function SiteHeader() {
  const locale = await getLocale();
  return <SiteHeaderClient locale={locale} />;
}
