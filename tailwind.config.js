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
        success: '#4CAF50',
        info: '#2196F3',
        error: '#f44336'
      },
      boxShadow: {
        card: '0 2px 4px rgba(0,0,0,0.1)',
        'card-hover': '0 4px 6px rgba(0,0,0,0.1)',
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
      },
      fontSize: {
        'stat': '2.5rem',
      },
      spacing: {
        '72': '18rem',
        '84': '21rem',
        '96': '24rem',
      },
    },
  },
  plugins: [],
} 