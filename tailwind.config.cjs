const defaultTheme = require("tailwindcss/defaultTheme");

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./src/**/*.{html,js,svelte,ts}"],
  theme: {
    extend: {
      colors: {
        neutral: {
          950: "#121212",
        },
        primary: {
          DEFAULT: "#1e2628",
          100: "#d3dcde",
          200: "#b6c5c8",
          300: "#99adb2",
          400: "#7c969d",
          500: "#627d83",
          600: "#4d6166",
          700: "#374549",
          800: "#212a2c",
          900: "#0b0e0f",
        },
        secondary: {
          DEFAULT: "#2a3439",
        },
      },
      fontFamily: {
        sans: ["Inter var", ...defaultTheme.fontFamily.sans],
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
