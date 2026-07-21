import { redirect } from "next/navigation";

export type Locale = "ja" | "en" | "ko" | "zh";

export function HomePage() {
  redirect("/");
}
