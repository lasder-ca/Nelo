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
        ink: { 950: "#070a0f", 900: "#0a0f16", 850: "#0d141d" },
        nelo: { blue: "#438af4", mint: "#66d6be", navy: "#172738" },
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(67,138,244,.15), 0 24px 80px rgba(10,37,78,.28)",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translate3d(0,0,0)" },
          "50%": { transform: "translate3d(0,-10px,0)" },
        },
        scan: {
          "0%": { transform: "translateY(-120%)", opacity: "0" },
          "15%": { opacity: ".45" },
          "85%": { opacity: ".15" },
          "100%": { transform: "translateY(520%)", opacity: "0" },
        },
        pulseRing: {
          "0%": { transform: "scale(.7)", opacity: ".65" },
          "100%": { transform: "scale(1.7)", opacity: "0" },
        },
      },
      animation: {
        float: "float 7s ease-in-out infinite",
        scan: "scan 5.5s ease-in-out infinite",
        pulseRing: "pulseRing 2.2s ease-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
