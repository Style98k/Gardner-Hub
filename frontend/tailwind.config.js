/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./*.html",
    "./pages/**/*.html",
    "./js/**/*.js"
  ],
  theme: {
    extend: {
      fontFamily: { 
        sans: ['Inter', 'ui-sans-serif', 'system-ui'] 
      },
      colors: {
        brand: {
          50:  '#eef4ff',
          100: '#dae6ff',
          200: '#bdcfff',
          300: '#90adff',
          400: '#6282fc',
          500: '#3b56f7',
          600: '#2537ec',
          700: '#1c28d9',
          800: '#1e24af',
          900: '#1b2263',
          950: '#141740',
        },
      },
    },
  },
  plugins: [],
}