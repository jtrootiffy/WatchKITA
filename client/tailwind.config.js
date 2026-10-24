/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0C0A0C',
        surface: '#131113',
        raised: '#191619',
        line: '#262226',
        primary: '#D00000',
        accent: '#664400',
        muted: '#A7A3A7',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        serif: ['"Playfair Display"', 'Georgia', 'Cambria', 'serif'],
      },
      maxWidth: {
        shell: '1440px',
      },
      letterSpacing: {
        wider: '0.08em',
        widest: '0.18em',
        editorial: '0.26em',
      },
      transitionTimingFunction: {
        editorial: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
}
