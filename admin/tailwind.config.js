/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        sumi: "#0b0b0c",
        surface: "#141416",
        surface2: "#1b1b1e",
        surface3: "#232327",
        washi: "#f3f1ec",
        muted: "#9c978d",
        faint: "#6b6862",
        shu: "#e2231a",
        gold: "#c9a96a",
        jade: "#5f9e7a",
        line: "rgba(255,255,255,0.09)",
        line2: "rgba(255,255,255,0.16)",
      },
      fontFamily: {
        display: ["var(--font-display)"],
      },
    },
  },
  plugins: [],
};
