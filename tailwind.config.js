/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy:  { DEFAULT: '#0a1f44', dark: '#05101f', mid: '#102a52' },
        gold:  { DEFAULT: '#c9a24b', light: '#e6c977', dark: '#9c7a2e' },
        ink:   '#0b1220',
        paper: '#ffffff',
        mist:  '#f4f6fb',
      },
    },
  },
  plugins: [],
}
