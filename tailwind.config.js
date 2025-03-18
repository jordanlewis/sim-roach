/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cockroach: {
          blue: '#0055FF',
          green: '#6BD425',
          dark: '#242A35',
        }
      },
    },
  },
  plugins: [],
}