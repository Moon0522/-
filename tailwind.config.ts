import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ["var(--font-playfair)", "Georgia", "serif"],
        mono: ["var(--font-mono)", "Courier New", "monospace"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        amber: {
          DEFAULT: "#f5a623",
          50: "#fef9ee",
          100: "#fdf0d0",
          200: "#fbde9d",
          300: "#f8c660",
          400: "#f5a623",
          500: "#e8900a",
          600: "#cc7006",
          700: "#a85208",
          800: "#89400e",
          900: "#70360f",
        },
        surface: {
          DEFAULT: "#111111",
          secondary: "#1a1a1a",
          tertiary: "#222222",
          border: "#2a2a2a",
        },
        verdict: {
          buy: "#22c55e",
          wait: "#f5a623",
          avoid: "#ef4444",
        },
      },
      borderColor: {
        DEFAULT: "#2a2a2a",
      },
    },
  },
  plugins: [],
};
export default config;
