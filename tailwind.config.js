/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        gold:   "#F0B90B",
        gold2:  "#D4A00A",
        ink:    "#0B0E11",
        card:   "#111827",
        card2:  "#0F1923",
        muted:  "#8896B0",
        mint:   "#00C896",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
      },
    },
  },
  plugins: [],
}
