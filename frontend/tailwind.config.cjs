/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#0064FF', hover: '#0050D0', light: '#EBF3FF' },
        sidebar: { bg: '#111827', border: 'rgba(255,255,255,0.07)', hover: 'rgba(255,255,255,0.06)' },
      },
      fontFamily: { mono: ['JetBrains Mono', 'Fira Code', 'monospace'] },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
      },
    }
  },
  plugins: []
}
