module.exports = {
  darkMode: ["selector", '[zaui-theme="dark"]'],
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        sumi: "var(--sumi)",
        surface: "var(--surface)",
        surface2: "var(--surface-2)",
        surface3: "var(--surface-3)",
        washi: "var(--washi)",
        muted: "var(--muted)",
        faint: "var(--faint)",
        shu: "var(--shu)",
        gold: "var(--gold)",
        jade: "var(--jade)",
        line: "var(--line)",
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
      },
      borderRadius: {
        card: "var(--radius)",
        lg2: "var(--radius-lg)",
      },
    },
  },
  plugins: [],
};
