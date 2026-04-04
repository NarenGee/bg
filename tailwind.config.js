/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        wood: {
          light: '#A0522D',
          DEFAULT: '#6B3A1F',
          dark: '#3D1C08',
        },
        point: {
          red: '#8B1A1A',
          ivory: '#F5F0DC',
        },
        checker: {
          light: '#F5DEB3',
          dark: '#2C1A0E',
        },
        parchment: '#FDF6E3',
        gold: '#C8960C',
      },
      fontFamily: {
        serif: ['Georgia', 'Cambria', 'serif'],
      },
    },
  },
  plugins: [],
}
