/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'ui-sans-serif', 'system-ui'],
        mono: ['JetBrains Mono', 'ui-monospace'],
        display: ['Syne', 'ui-sans-serif'],
      },
      colors: {
        brand: {
          50: '#f0f4ff',
          100: '#dde6ff',
          200: '#c3d1ff',
          300: '#9db4ff',
          400: '#718eff',
          500: '#4c67f5',
          600: '#3648e8',
          700: '#2d39ce',
          800: '#2832a7',
          900: '#273085',
          950: '#1a1f55',
        },
        surface: {
          0: '#ffffff',
          50: '#f8f9fc',
          100: '#f1f3f9',
          200: '#e4e8f0',
          300: '#d0d7e6',
          400: '#9aa3b8',
          500: '#6b7590',
          600: '#4d5568',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
          950: '#030712',
        },
      },
      animation: {
        'slide-in': 'slideIn 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
        'pulse-dot': 'pulseDot 2s ease-in-out infinite',
        'bounce-in': 'bounceIn 0.4s cubic-bezier(0.68,-0.55,0.265,1.55)',
      },
      keyframes: {
        slideIn: {
          from: { transform: 'translateY(-10px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        pulseDot: {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.5)', opacity: '0.7' },
        },
        bounceIn: {
          from: { transform: 'scale(0.8)', opacity: '0' },
          to: { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};