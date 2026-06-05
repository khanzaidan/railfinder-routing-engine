/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50:  '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
      },
      maxWidth: {
        content: '1024px',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-slow': {
          '0%, 100%': { opacity: '1' },
          '50%':       { opacity: '0.4' },
        },
        'ping-once': {
          '0%':        { transform: 'scale(1)',   opacity: '0.8' },
          '80%, 100%': { transform: 'scale(2.2)', opacity: '0'   },
        },
        'shimmer': {
          '0%':   { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center'  },
        },
      },
      animation: {
        'fade-in':    'fade-in 0.25s ease-out both',
        'pulse-slow': 'pulse-slow 2.5s ease-in-out infinite',
        'ping-once':  'ping-once 1.6s ease-out infinite',
        'shimmer':    'shimmer 2.2s linear infinite',
      },
    },
  },
  plugins: [],
};
