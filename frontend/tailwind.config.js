/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#6366f1', hover: '#4f46e5', light: '#eef2ff' },
        sidebar: { bg: '#0d1117', border: 'rgba(255,255,255,0.06)', hover: 'rgba(255,255,255,0.05)' },
      },
      fontFamily: { mono: ['JetBrains Mono', 'Fira Code', 'monospace'] }
    }
  },
  plugins: []
}
