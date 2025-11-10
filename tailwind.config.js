/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "*.{js,ts,jsx,tsx,mdx}",
  ],
  corePlugins: {
    preflight: true,
  },
  theme: {
    colors: {
      transparent: "transparent",
      current: "currentColor",
      black: "#000",
      white: "#fff",
      // Modern Tailwind color names
      gray: require("tailwindcss/colors").gray,
      slate: require("tailwindcss/colors").slate,
      neutral: require("tailwindcss/colors").neutral,
      stone: require("tailwindcss/colors").stone,
      sky: require("tailwindcss/colors").sky,
      red: require("tailwindcss/colors").red,
      orange: require("tailwindcss/colors").orange,
      amber: require("tailwindcss/colors").amber,
      yellow: require("tailwindcss/colors").yellow,
      lime: require("tailwindcss/colors").lime,
      green: require("tailwindcss/colors").green,
      emerald: require("tailwindcss/colors").emerald,
      teal: require("tailwindcss/colors").teal,
      cyan: require("tailwindcss/colors").cyan,
      blue: require("tailwindcss/colors").blue,
      indigo: require("tailwindcss/colors").indigo,
      violet: require("tailwindcss/colors").violet,
      purple: require("tailwindcss/colors").purple,
      fuchsia: require("tailwindcss/colors").fuchsia,
      pink: require("tailwindcss/colors").pink,
      rose: require("tailwindcss/colors").rose,
    },
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        neoblack: "#000000",
        neogold: "#CD7F32",
        neogray: "#1A1A1A",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
