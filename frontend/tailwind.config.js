/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#0b1120',
          blue: '#1d4ed8',
          green: '#10b981',
          orange: '#f97316',
          cyan: '#22d3ee',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundOpacity: {
        '8': '0.08',
      }
    },
  },
  plugins: [],
}
