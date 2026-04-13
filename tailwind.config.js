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
          primary: 'var(--cs-primary)',
          'primary-dark': 'var(--cs-primary-dark)',
          'primary-light': 'var(--cs-primary-light)',
          secondary: 'var(--cs-secondary)',
          surface: 'var(--cs-surface)',
          'surface-strong': 'var(--cs-surface-strong)',
          bg: 'var(--cs-bg)',
          'bg-deep': 'var(--cs-bg-deep)',
          text: 'var(--cs-text)',
          muted: 'var(--cs-muted)',
          border: 'var(--cs-border)',
          'border-strong': 'var(--cs-border-strong)',
          success: 'var(--cs-success)',
          'success-light': 'var(--cs-success-light)',
          warning: 'var(--cs-warning)',
          'warning-light': 'var(--cs-warning-light)',
          danger: 'var(--cs-danger)',
          'danger-light': 'var(--cs-danger-light)',
          info: 'var(--cs-primary)',
          'info-light': '#DBEAFE',
        },
      },
      fontFamily: {
        sans: ['Heebo', 'Assistant', 'Segoe UI Variable', 'system-ui', 'sans-serif'],
        heading: ['Heebo', 'Assistant', 'sans-serif'],
        serif: ['Noto Serif Hebrew', 'serif'],
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        'cs': 'var(--cs-shadow)',
        'cs-strong': 'var(--cs-shadow-strong)',
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
