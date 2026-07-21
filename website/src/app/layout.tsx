import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Nelo — Every request owns its work.", template: "%s · Nelo" },
  description: "A request ownership runtime and Web Standards framework for TypeScript.",
  metadataBase: new URL("https://nelo.lattee.jp"),
  openGraph: { title: "Nelo — Every request owns its work.", description: "Structured ownership for child tasks, cancellation, and scoped resources.", url: "https://nelo.lattee.jp", siteName: "Nelo", type: "website" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
