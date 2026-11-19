/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        night: '#0B0D14',
        surface: '#131624',
        borderdark: '#1E2338',
        violetmain: '#8B5CF6',
        violethover: '#7C3AED',
        adoblue: '#1E3A8A',
        adobright: '#2563EB',
      },
    },
  },
  plugins: [],
};