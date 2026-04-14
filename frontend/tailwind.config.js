/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        panel: "#0f172a",
        ink: "#e2e8f0",
        accent: "#7c3aed",
        cool: "#2563eb",
        slate: {
          950: "#020617"
        },
        brand: {
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81"
        },
        success: {
          50: "#ecfdf5",
          100: "#d1fae5",
          500: "#22c55e",
          700: "#15803d",
          900: "#14532d"
        },
        warning: {
          50: "#fffbeb",
          100: "#fef3c7",
          500: "#f59e0b",
          700: "#b45309",
          900: "#78350f"
        },
        danger: {
          50: "#fef2f2",
          100: "#fee2e2",
          500: "#ef4444",
          700: "#b91c1c",
          900: "#7f1d1d"
        }
      },
      fontFamily: {
        display: ["Sora", "Segoe UI", "sans-serif"],
        body: ["Manrope", "Segoe UI", "sans-serif"]
      },
      boxShadow: {
        soft: "0 18px 60px rgba(15, 23, 42, 0.18)",
        glass: "0 24px 80px rgba(15, 23, 42, 0.24)",
        glow: "0 0 0 1px rgba(255,255,255,0.12), 0 24px 70px rgba(79, 70, 229, 0.28)"
      },
      backgroundImage: {
        "hero-mesh":
          "radial-gradient(circle at top left, rgba(96, 165, 250, 0.24), transparent 28%), radial-gradient(circle at top right, rgba(167, 139, 250, 0.18), transparent 26%), linear-gradient(135deg, rgba(15, 23, 42, 0.96), rgba(30, 41, 59, 0.92))"
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" }
        },
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" }
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(18px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        pulseSoft: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(99, 102, 241, 0.16)" },
          "50%": { boxShadow: "0 0 0 12px rgba(99, 102, 241, 0)" }
        }
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        shimmer: "shimmer 2.2s linear infinite",
        "slide-up": "slide-up 0.65s ease-out both",
        "pulse-soft": "pulseSoft 2.6s ease-in-out infinite"
      }
    }
  },
  plugins: []
};
