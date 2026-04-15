/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      boxShadow: {
        soft: "0 24px 80px rgba(15, 23, 42, 0.14)",
        glow: "0 0 0 1px rgba(255,255,255,0.06), 0 18px 48px rgba(15, 23, 42, 0.18)",
      },
      transitionTimingFunction: {
        premium: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
      },
      backgroundImage: {
        "grid-fade":
          "linear-gradient(to right, rgba(148,163,184,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.08) 1px, transparent 1px)",
      },
    },
  },
  plugins: [],
};
