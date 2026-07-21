import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/app/**/*.{ts,tsx}", "./src/components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        mono: ["JetBrains Mono", "SFMono-Regular", "Cascadia Code", "Roboto Mono", "monospace"],
      },
      colors: {
        ink: { 950: "#11120f", 900: "#171815", 850: "#1d1f1b" },
        nelo: { blue: "#91a6c0", mint: "#a7bea8", navy: "#222b35" },
      },
    },
  },
  plugins: [],
};

export default config;
