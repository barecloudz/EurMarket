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
          // Dynamic theme colors (from CSS variables)
          black: 'var(--color-background, #F8F9FA)',
          charcoal: 'var(--color-surface, #FFFFFF)',
          gray: 'var(--color-border, #E5E7EB)',
          'gray-light': '#D1D5DB',
          neon: 'var(--color-primary, #2E7D32)',
          emerald: 'var(--color-secondary, #1B5E20)',
          'emerald-dark': '#1B5E20',
          accent: 'var(--color-accent, #9AFF00)',
        }
      },
      textColor: {
        'theme': 'var(--color-text, #f5f5f5)',
      },
      backgroundColor: {
        'theme-bg': 'var(--color-background, #0a0a0a)',
        'theme-surface': 'var(--color-surface, #1a1a1a)',
      },
      boxShadow: {
        'neon': '0 0 15px rgba(46, 125, 50, 0.35)',
        'neon-sm': '0 0 8px rgba(46, 125, 50, 0.25)',
        'neon-lg': '0 0 25px rgba(46, 125, 50, 0.45)',
      }
    },
  },
  plugins: [],
}
