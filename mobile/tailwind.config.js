/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#1A3A5C",
          50: "#E8EEF5",
          100: "#C5D5E8",
          200: "#9FBAD9",
          300: "#799FCA",
          400: "#5F8ABF",
          500: "#1A3A5C",
          600: "#163250",
          700: "#122942",
          800: "#0E2135",
          900: "#091627",
        },
        accent: {
          DEFAULT: "#C0392B",
          50: "#FDECEA",
          100: "#F9C6C2",
          200: "#F49E98",
          300: "#EE766D",
          400: "#E85749",
          500: "#C0392B",
          600: "#A83224",
          700: "#8E2A1E",
          800: "#752318",
          900: "#5C1B12",
        },
      },
    },
  },
  plugins: [],
};
