/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Official Brand Color Palette:
        // 1. IMANYA BLUE: #2C6291
        // 2. LIME GREEN:  #9AC640
        // 3. TEAL:        #4C9091
        // 4. CLEAN WHITE: #FFFFFF
        imanya: {
          blue: {
            DEFAULT: '#2C6291',
            hover: '#235077',
            light: '#EBF2F7',
            dark: '#1C4263',
          },
          lime: {
            DEFAULT: '#9AC640',
            hover: '#88B035',
            light: '#F4F9EC',
            dark: '#6F9128',
          },
          teal: {
            DEFAULT: '#4C9091',
            hover: '#3E7879',
            light: '#EEF6F6',
            dark: '#346566',
          },
          white: '#FFFFFF',
        },
        brand: {
          50: '#F0F6FA',
          100: '#E0EDF5',
          200: '#C2DBEC',
          300: '#99C2DE',
          400: '#5F9DC9',
          500: '#3D7FB4',
          600: '#2C6291', // Primary Imanya Blue
          700: '#235077',
          800: '#1C405F',
          900: '#153149',
        }
      }
    },
  },
  plugins: [],
}
