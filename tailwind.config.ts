import type { Config } from "tailwindcss";

/** CSS変数（src/app/theme.css）を参照する色。テーマ差し替えはtheme.cssだけで完結する */
const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          50: v("ink-50"),
          100: v("ink-100"),
          200: v("ink-200"),
          300: v("ink-300"),
          400: v("ink-400"),
          500: v("ink-500"),
          600: v("ink-600"),
          700: v("ink-700"),
          800: v("ink-800"),
          900: v("ink-900"),
          950: v("ink-950"),
        },
        accent: {
          DEFAULT: v("accent"),
          hover: v("accent-hover"),
          fg: v("accent-fg"),
          soft: v("accent-soft"),
        },
        canvas: v("canvas"),
        surface: v("surface"),
        media: v("media"),
        overlay: v("overlay"),
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "marquee-up": {
          "0%": { transform: "translateY(0)" },
          "100%": { transform: "translateY(-50%)" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 0.4s ease-out",
        "marquee-up": "marquee-up 40s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
