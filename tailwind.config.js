/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cc: {
          dark: '#1b222c',
          darker: '#141921',
          slate: '#262f3d',
          red: '#c83e37',
          redHover: '#b2342d',
          redLight: '#e04f47',
          green: '#28a745',
          greenHover: '#218838',
        }
      },
      keyframes: {
        stripes: {
          '0%': { backgroundPosition: '0 0' },
          '100%': { backgroundPosition: '40px 0' },
        }
      },
      animation: {
        stripes: 'stripes 1s linear infinite',
      }
    },
  },
  plugins: [],
};
