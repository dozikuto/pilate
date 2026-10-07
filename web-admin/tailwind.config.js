/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1A3A5C',
          50: '#E8EEF5',
          100: '#C5D4E6',
          200: '#9FB8D5',
          300: '#789CC4',
          400: '#5280B3',
          500: '#1A3A5C',
          600: '#163250',
          700: '#122944',
          800: '#0E2138',
          900: '#0A182C',
        },
        accent: {
          DEFAULT: '#C0392B',
          50: '#FAEAE8',
          100: '#F2C4BF',
          200: '#E89C95',
          300: '#DF756B',
          400: '#D55041',
          500: '#C0392B',
          600: '#A83225',
          700: '#8F2A1F',
          800: '#762219',
          900: '#5D1B13',
        },
        background: '#F8FAFC',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
