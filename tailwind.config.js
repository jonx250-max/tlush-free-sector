/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        cs: {
          primary: '#2563EB',
          'primary-dark': '#1D4ED8',
          'primary-light': '#3B82F6',
          secondary: '#7C3AED',
          'secondary-dark': '#6D28D9',
          surface: 'var(--cs-surface)',
          bg: 'var(--cs-bg)',
          text: 'var(--cs-text)',
          muted: 'var(--cs-muted)',
          border: 'var(--cs-border)',
          success: '#059669',
          'success-light': '#D1FAE5',
          warning: '#D97706',
          'warning-light': '#FEF3C7',
          danger: '#DC2626',
          'danger-light': '#FEE2E2',
          info: '#2563EB',
          'info-light': '#DBEAFE',
        },
      },
      fontFamily: {
        sans: ['Assistant', 'Heebo', 'Segoe UI Variable', 'system-ui', 'sans-serif'],
        heading: ['Heebo', 'Assistant', 'sans-serif'],
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-right': 'slideRight 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideRight: {
          '0%': { opacity: '0', transform: 'translateX(-10px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
}
