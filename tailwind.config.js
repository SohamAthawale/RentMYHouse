/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Sora"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 6px 16px rgba(26, 33, 28, 0.12)',
        card: '0 18px 36px rgba(26, 33, 28, 0.16)',
      },
      borderRadius: {
        xl: '0.9rem',
        '2xl': '1.2rem',
      },
    },
  },
  plugins: [],
};
