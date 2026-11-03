/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        managerium: {
          blue: '#2F6FDE',
          blueHover: '#255cc0',
          blueLight: '#EEF4FC',
          tableHeader: '#DCEBFA',
          sidebarBg: '#F0F5FC',
          sidebarHover: '#E4ECF8',
          border: '#D1D5DB',
          dark: '#1E293B',
          grayText: '#64748B'
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
