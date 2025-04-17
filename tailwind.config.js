import plugin from "tailwindcss/plugin";
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "var(--ring)",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          50: 'hsl(228 100% 96%)',   // #EBEEFF
          100: 'hsl(228 100% 90%)',  // #CCD5FF
          200: 'hsl(228 75% 76%)',   // #93A4F0
          300: 'hsl(228 70% 67%)',   // #6E84E9
          400: 'hsl(228 65% 50%)',   // #4057BF
          500: 'hsl(228 40% 40%)',   // #3D4C8F
          600: 'hsl(228 25% 25%)',   // #303650
          DEFAULT: 'hsl(228 100% 71%)'  // #6B86FF
        },
        secondary: {
          50: 'hsl(84 100% 97%)',    // #F8FEF2
          100: 'hsl(84 100% 93%)',   // #EBFFD6
          200: 'hsl(84 100% 84%)',   // #D6FFAD
          300: 'hsl(84 100% 74%)',   // #BDFF7A
          400: 'hsl(84 60% 62%)',    // #9EE25A
          500: 'hsl(84 50% 38%)',    // #6BA136
          600: 'hsl(84 40% 32%)',    // #527231
          DEFAULT: 'hsl(84 100% 54%)'  // #89FF14
        },
        neutral: {
          50: 'hsl(228 20% 99%)',    // #FCFCFD
          100: 'hsl(228 15% 98%)',   // #F9F9FB
          200: 'hsl(228 15% 94%)',   // #EEEFF3
          300: 'hsl(228 25% 90%)',   // #DEE2ED
          400: 'hsl(228 15% 81%)',   // #C7CBD6
          500: 'hsl(228 15% 61%)',   // #8D95AA
          600: 'hsl(228 15% 41%)',   // #596178
          700: 'hsl(228 3% 31%)',    // #4B4D53
          DEFAULT: 'hsl(228 12% 71%)'  // #AAB0C0
        },
        alert: {
          DEFAULT: "hsl(var(--alert))",
          foreground: "hsl(var(--alert-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        green: {
          50: 'hsl(90 100% 97%)',    // #F8FEF2
          100: 'hsl(84 100% 93%)',   // #EBFFD6
          200: 'hsl(84 100% 85%)',   // #D6FFAD
          300: 'hsl(84 100% 74%)',   // #BDFF7A
          400: 'hsl(84 60% 62%)',    // #9EE25A
          500: 'hsl(84 50% 38%)',    // #6BA136
          600: 'hsl(84 40% 32%)',    // #527231
        },
        textColor: {
          DEFAULT: 'hsl(228 25% 25%)',  // Same as primary-600
        }
      },
      borderColor: {
        DEFAULT: 'hsl(228 25% 90%)', //Neutral 300
      },
      borderRadius: {
        base: "var(--border-radius)",
        sm: "calc(var(--border-radius) + 0.125rem)",
        DEFAULT: "calc(var(--border-radius) + 0.25rem)",
        md: "calc(var(--border-radius) + 0.375rem)",
        lg: "calc(var(--border-radius) + 0.5rem)",
        xl: "calc(var(--border-radius) + 0.75rem)",
        "2xl": "calc(var(--border-radius) + 1rem)",
        "3xl": "calc(var(--border-radius) + 1.5rem)",
      },
      borderWidth: {
        base: "var(--border-width)",
        DEFAULT: "calc(var(--border-width) + 1px)",
        2: "calc(var(--border-width) + 2px)",
        4: "calc(var(--border-width) + 4px)",
        8: "calc(var(--border-width) + 8px)",
      },
      boxShadow: {
        base: "var(--shadow-base)",
        sm: "var(--shadow-sm)",
        DEFAULT: "var(--shadow)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        xl: "var(--shadow-xl)",
        "2xl": "var(--shadow-2xl)",
        inner: "var(--shadow-inner)",
      },
      strokeWidth: {
        0: "0",
        base: "var(--stroke-width)",
        1: "calc(var(--stroke-width) + 1px)",
        2: "calc(var(--stroke-width) + 2px)",
      },
      animation: {
        "accordion-up": "collapsible-up 0.2s ease-out 0s 1 normal forwards",
        "accordion-down": "collapsible-down 0.2s ease-out 0s 1 normal forwards",
      },
      keyframes: {
        "collapsible-down": {
          from: { height: "0" },
          to: { height: "var(--qwikui-collapsible-content-height)" },
        },
        "collapsible-up": {
          from: { height: "var(--qwikui-collapsible-content-height)" },
          to: { height: "0" },
        },
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    plugin(function ({ addUtilities }) {
      addUtilities({
        ".press": {
          transform: "var(--transform-press)",
        },
      });
    }),
  ],
};
