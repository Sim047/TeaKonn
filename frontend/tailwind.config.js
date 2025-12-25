export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: '#22d3ee', // cyan-400
          light: '#67e8f9',
          dark: '#0891b2',
        },
        accentViolet: {
          DEFAULT: '#7c3aed', // violet-600
          light: '#a78bfa',
          dark: '#6d28d9',
        },
        accentAmber: {
          DEFAULT: '#f59e0b', // amber-500
          light: '#fbbf24',
          dark: '#d97706',
        },
      },
    },
  },
  plugins: [
    // Enable utilities like `line-clamp-3` across the app
    require('@tailwindcss/line-clamp'),
  ],
};
