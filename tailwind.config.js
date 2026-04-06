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
          crimson:      '#8B0000',
          'crimson-light': '#A31515',
          'crimson-dark':  '#5C0000',
          orange:       '#F97316',
          gold:         '#FACC15',
          // Admin fixed dark colors
          black:        '#0f1117',
          charcoal:     '#1a1d27',
          gray:         '#2d3044',
          'gray-light': '#D1D5DB',
          // CSS-variable-driven store colors
          neon:     'var(--color-primary, #8B0000)',
          emerald:  'var(--color-secondary, #5C0000)',
          accent:   'var(--color-accent, #F97316)',
        },
      },
      textColor: {
        theme: 'var(--color-text, #1A1A1A)',
      },
      backgroundColor: {
        'theme-bg':      'var(--color-background, #FAF9F7)',
        'theme-surface': 'var(--color-surface, #FFFFFF)',
      },
      boxShadow: {
        'crimson':    '0 0 15px rgba(139, 0, 0, 0.25)',
        'crimson-sm': '0 0 8px rgba(139, 0, 0, 0.15)',
        'crimson-lg': '0 0 30px rgba(139, 0, 0, 0.35)',
        'warm':       '0 4px 20px rgba(139, 0, 0, 0.08)',
      },
    },
  },
  plugins: [],
}
