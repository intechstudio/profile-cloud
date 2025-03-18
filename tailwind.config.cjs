const defaultTheme = require("tailwindcss/defaultTheme");
const colors = require("tailwindcss/colors");
const uiKitConfig = require("@intechstudio/grid-uikit/tailwind.config");

/** @type {import('tailwindcss').Config} */
module.exports = {
  mode: "jit",
  darkMode: "class",
  content: ["./src/**/*.{html,js,svelte,ts}"],
  presets: [uiKitConfig], // Use the UI kit's Tailwind configuration as a preset
  theme: {
    extend: {
      colors: {
        black: colors.black,
        white: colors.white,
        gray: colors.neutral,
        green: colors.green,
        red: colors.rose,
        yellow: colors.amber,
        pink: colors.pink,
        purple: colors.purple,
        orange: colors.orange,
        neutral: {
          950: "#121212",
        },
      },
      fontFamily: {
        sans: ["Inter var", ...defaultTheme.fontFamily.sans],
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
