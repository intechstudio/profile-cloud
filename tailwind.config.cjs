/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      colors: {
        neutral: {
          '950': '#121212'
        }
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography')
  ],
}
