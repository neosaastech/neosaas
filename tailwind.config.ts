import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "*.{js,ts,jsx,tsx,mdx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
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
        // NeoSaaS Brand Colors - Complete Scale (Compatible with admin theme customization)
        brand: {
          50: "hsl(var(--brand-50))",
          100: "hsl(var(--brand-100))",
          200: "hsl(var(--brand-200))",
          300: "hsl(var(--brand-300))",
          400: "hsl(var(--brand-400))",
          500: "hsl(var(--brand-500))",     // Main: #CD7F32
          DEFAULT: "hsl(var(--brand-500))", // Alias for bg-brand
          600: "hsl(var(--brand-600))",     // Hover: #B86F28
          hover: "hsl(var(--brand-600))",   // Alias for hover:bg-brand-hover
          700: "hsl(var(--brand-700))",
          800: "hsl(var(--brand-800))",
          900: "hsl(var(--brand-900))",
          950: "hsl(var(--brand-950))",
        },
        // Semantic Colors - Standardized
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
        },
        // Chart colors
        chart: {
          1: "hsl(var(--chart-1))",
          2: "hsl(var(--chart-2))",
          3: "hsl(var(--chart-3))",
          4: "hsl(var(--chart-4))",
          5: "hsl(var(--chart-5))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      // Typography system (uses CSS variables from theme)
      fontFamily: {
        sans: ["var(--font-family)", "system-ui", "sans-serif"],
        heading: ["var(--font-family-heading)", "system-ui", "sans-serif"],
        mono: ["var(--font-family-mono)", "monospace"],
      },
      fontSize: {
        xs: "var(--font-size-xs, 0.75rem)",
        sm: "var(--font-size-sm, 0.875rem)",
        base: "var(--font-size-base, 1rem)",
        lg: "var(--font-size-lg, 1.125rem)",
        xl: "var(--font-size-xl, 1.25rem)",
        "2xl": "var(--font-size-2xl, 1.5rem)",
        "3xl": "var(--font-size-3xl, 1.875rem)",
        "4xl": "var(--font-size-4xl, 2.25rem)",
      },
      fontWeight: {
        light: "var(--font-weight-light, 300)",
        normal: "var(--font-weight-normal, 400)",
        medium: "var(--font-weight-medium, 500)",
        semibold: "var(--font-weight-semibold, 600)",
        bold: "var(--font-weight-bold, 700)",
      },
      lineHeight: {
        tight: "var(--line-height-tight, 1.25)",
        normal: "var(--line-height-normal, 1.5)",
        relaxed: "var(--line-height-relaxed, 1.75)",
      },
      // Spacing system (uses CSS variables from theme)
      spacing: {
        xs: "var(--spacing-xs, 0.25rem)",
        sm: "var(--spacing-sm, 0.5rem)",
        md: "var(--spacing-md, 1rem)",
        lg: "var(--spacing-lg, 1.5rem)",
        xl: "var(--spacing-xl, 2rem)",
        "2xl": "var(--spacing-2xl, 3rem)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config
