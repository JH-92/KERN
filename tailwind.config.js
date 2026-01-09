
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        emerald: {
          500: '#10b981',
          600: '#059669',
          700: '#047857'
        }
      }
    },
  },
  plugins: [],
}
