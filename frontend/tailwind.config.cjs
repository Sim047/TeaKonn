// tailwind.config.cjs
module.exports = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // keep tailwind palette available; we'll also use CSS variables for light theme
        auralink: {
          50: '#f7fbff',
          100: '#eef7ff',
          200: '#d6efff',
          500: '#22d3ee', // cyan used in buttons
        },
      },
    },
  },
  plugins: [
    // Ensure classic CommonJS config also loads line-clamp utilities
    require('@tailwindcss/line-clamp'),
  ],
};
