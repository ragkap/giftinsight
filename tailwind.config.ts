import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: '#24a9a7',
          50:  '#effaf9',
          100: '#d6f1ef',
          200: '#aee3df',
          300: '#7dcfca',
          400: '#4cb9b3',
          500: '#24a9a7',
          600: '#1c8987',
          700: '#196e6d',
          800: '#175855',
          900: '#0f3c3a',
        },
        ink: {
          900: '#0a0a0a',
          800: '#1a1a1a',
          700: '#2e2e2e',
          500: '#525252',
          400: '#737373',
          300: '#a3a3a3',
          200: '#d4d4d4',
          100: '#e5e5e5',
          50:  '#fafafa',
        },
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Inter"', '"Segoe UI"', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 1px 2px rgba(10,10,10,0.04), 0 4px 12px rgba(10,10,10,0.05)',
      },
    },
  },
  plugins: [],
} satisfies Config;
