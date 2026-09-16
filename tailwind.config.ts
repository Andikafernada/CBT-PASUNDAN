import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  safelist: [
    { pattern: /bg-(sky|blue)-(50|100|200|300|400|500|600)/ },
    { pattern: /text-(sky|blue)-(600|700|800|900)/ },
    { pattern: /border-(sky|blue)-(200|300|400)/ },
    { pattern: /shadow-(sky|blue)-(300|400|500)/ },
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f9ff",
          100: "#e0f2fe",
          200: "#bae6fd",
          300: "#7dd3fc",
          400: "#38bdf8",
          500: "#0ea5e9",
          600: "#0284c7",
          700: "#0369a1",
          800: "#075985",
          900: "#0c4a6e",
          950: "#082f49",
        },
        surface: {
          light: "#f0f9ff",
          DEFAULT: "#e0f2fe",
          dark: "#bae6fd",
        },
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
      boxShadow: {
        glass: "0 8px 32px rgba(56, 189, 248, 0.22)",
        "glass-lg": "0 20px 48px rgba(56, 189, 248, 0.28)",
        glow: "0 0 25px rgba(56, 189, 248, 0.4), 0 4px 16px rgba(125, 211, 252, 0.35)",
        card: "0 4px 20px -2px rgba(56, 189, 248, 0.22)",
        soft: "0 10px 30px -5px rgba(56, 189, 248, 0.28)",
      },
      backdropBlur: {
        xs: "2px",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      animation: {
        "fade-up": "fadeUp 0.4s ease-out both",
      },
      backgroundImage: {
        "mesh-light":
          "radial-gradient(1200px 600px at 10% -10%, rgba(186, 230, 253, 0.6), transparent 60%), radial-gradient(800px 500px at 110% 10%, rgba(125, 211, 252, 0.5), transparent 55%), radial-gradient(900px 600px at 50% 120%, rgba(224, 242, 254, 0.7), transparent 60%)",
        "mesh-dark":
          "radial-gradient(1200px 600px at 10% -10%, rgba(186, 230, 253, 0.5), transparent 60%), radial-gradient(800px 500px at 110% 10%, rgba(125, 211, 252, 0.45), transparent 55%), radial-gradient(900px 600px at 50% 120%, rgba(224, 242, 254, 0.6), transparent 60%)",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
