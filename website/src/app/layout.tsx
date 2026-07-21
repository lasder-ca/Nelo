import type { Metadata } from "next";
import "./globals.css";
import "./brand-refresh.css";
import { ThemeProvider } from "@/components/theme-provider";
import { htmlLang } from "@/lib/i18n";
import { getLocale } from "@/lib/locale";

export const metadata: Metadata = {
  metadataBase: new URL("https://nelo.lattee.jp"),
  title: {
    default: "Nelo — Every request owns its work.",
    template: "%s · Nelo",
  },
  description: "A request-ownership runtime and Web Standards framework for TypeScript.",
  openGraph: {
    title: "Nelo — Every request owns its work.",
    description: "Structured ownership for child tasks, cancellation, and scoped resources.",
    url: "https://nelo.lattee.jp",
    siteName: "Nelo",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Nelo — Every request owns its work.",
    description: "Structured request ownership for TypeScript.",
  },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();

  return (
    <html lang={htmlLang[locale]} suppressHydrationWarning>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
