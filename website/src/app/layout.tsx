import type { Metadata, Viewport } from "next"
import "./globals.css"
import { SiteHeader } from "@/components/site/site-header"
import { SiteFooter } from "@/components/site/site-footer"

export const metadata: Metadata = {
  metadataBase: new URL("https://nelo.lattee.jp"),
  title: { default: "Nelo — Every request owns its work.", template: "%s — Nelo" },
  description: "A request-ownership runtime and Web Standards framework for TypeScript.",
  icons: { icon: "/brand/nelo-mark.svg" },
  openGraph: { title: "Nelo", description: "Every request owns its work.", type: "website" }
}
export const viewport: Viewport = { themeColor: "#080c14", colorScheme: "dark" }
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="ja"><body><SiteHeader />{children}<SiteFooter /></body></html> }
