import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: {
          DEFAULT: "#070b12",
          elevated: "#121821",
          border: "#1e2836",
          soft: "#0d1420",
        },
        ink: {
          DEFAULT: "#e8eef7",
          muted: "#8b9bb0",
          faint: "#5c6b80",
        },
        accent: {
          DEFAULT: "#3b82f6",
          success: "#22c55e",
          warning: "#eab308",
          danger: "#ef4444",
          info: "#3b82f6",
        },
      },
      fontFamily: {
        sans: ["IBM Plex Sans", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "monospace"],
      },
      boxShadow: {
        glow: "0 0 24px rgba(59, 130, 246, 0.25)",
        "glow-success": "0 0 20px rgba(34, 197, 94, 0.2)",
      },
      minHeight: {
        touch: "44px",
      },
      minWidth: {
        touch: "44px",
      },
    },
  },
  plugins: [],
};

export default config;
