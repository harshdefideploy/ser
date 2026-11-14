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
          DEFAULT: "#f4f7fc",
          elevated: "#ffffff",
          border: "#d7e3f4",
          soft: "#eaf1fb",
        },
        ink: {
          DEFAULT: "#0f1b2d",
          muted: "#5b6b82",
          faint: "#8a9bb3",
        },
        accent: {
          DEFAULT: "#2563eb",
          soft: "#dbe7ff",
          success: "#16a34a",
          warning: "#d97706",
          danger: "#dc2626",
          info: "#2563eb",
        },
      },
      fontFamily: {
        sans: [
          "Plus Jakarta Sans",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        display: ["Sora", "Plus Jakarta Sans", "ui-sans-serif", "sans-serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "monospace"],
      },
      boxShadow: {
        glow: "0 10px 30px rgba(37, 99, 235, 0.18)",
        "glow-success": "0 8px 24px rgba(22, 163, 74, 0.16)",
        card: "0 1px 2px rgba(15, 27, 45, 0.04), 0 12px 32px rgba(37, 99, 235, 0.06)",
        float: "0 18px 50px rgba(37, 99, 235, 0.12)",
      },
      minHeight: {
        touch: "44px",
      },
      minWidth: {
        touch: "44px",
      },
      backgroundImage: {
        "blue-mesh":
          "radial-gradient(1200px 600px at 8% -10%, rgba(37,99,235,0.14), transparent 55%), radial-gradient(900px 500px at 100% 0%, rgba(59,130,246,0.10), transparent 50%), linear-gradient(180deg, #f8fbff 0%, #eef3fb 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
