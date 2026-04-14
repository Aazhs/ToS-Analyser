/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        panel: "#fffdf8",
        ink: "#1e1a16",
        accent: "#d97706",
        cool: "#0f766e"
      },
      boxShadow: {
        soft: "0 10px 30px rgba(30, 26, 22, 0.08)"
      }
    }
  },
  plugins: []
};
