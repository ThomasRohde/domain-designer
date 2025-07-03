/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'domain-channel': '#E3F2FD',
        'domain-relationship': '#F3E5F5',
        'domain-business': '#E8F5E8',
        'domain-product': '#FFF3E0',
        'domain-control': '#F1F8E9',
        'domain-risk': '#FFEBEE',
        'domain-platform': '#E8EAF6',
        'domain-data': '#F3E5F5',
        'domain-support': '#E0F2F1',
      },
      fontFamily: {
        'sans': ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'scale-in': 'scaleIn 0.1s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}