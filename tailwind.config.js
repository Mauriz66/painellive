/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      colors: {
        primary: '#0088FE',
        secondary: '#00C49F',
        accent: '#FFBB28',
        warning: '#FF8042',
        purple: '#8884d8',
        green: '#82ca9d'
      }
    },
  },
  plugins: [],
} 