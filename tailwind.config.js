/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1a1a2e',
          light: '#16213e',
          lighter: '#0f3460',
        },
        accent: {
          DEFAULT: '#e94560',
          light: '#ff6b6b',
          dark: '#c23a51',
        },
        surface: {
          DEFAULT: '#1a1a2e',
          elevated: '#16213e',
          hover: '#0f3460',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Source Sans Pro', 'system-ui', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
