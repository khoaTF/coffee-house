/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./public/**/*.{html,js}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Velvet Crema Palette
        "background": "#FEF9EF",
        "surface": "#FFFFFF",
        "surface-container": "#F5EFE6",
        "surface-variant": "#E8DFD5",
        "primary": "#2A1A14",      // Deep Espresso
        "on-primary": "#FFFFFF",
        "secondary": "#D97531",    // Warm Orange / Crema
        "on-secondary": "#FFFFFF",
        "tertiary": "#8C6A5D",     // Latte Brown
        "on-tertiary": "#FFFFFF",
        "outline": "#D1C4B9",
        "outline-variant": "#E8DFD5",
        "error": "#BA1A1A",
        "on-error": "#FFFFFF",
        "error-container": "#FFDAD6",
        "on-error-container": "#410002",
        "inverse-surface": "#322F2D",
        "inverse-on-surface": "#F5EFE6",
        "inverse-primary": "#E8DFD5",
        "on-surface": "#2A1A14",
        "on-surface-variant": "#5C4A42",
      },
      fontFamily: {
        "headline": ["'Noto Serif'", "serif"],
        "body": ["'Manrope'", "sans-serif"],
        "label": ["'Manrope'", "sans-serif"]
      },
      borderRadius: {"DEFAULT": "1rem", "lg": "1.5rem", "xl": "2rem", "full": "9999px"},
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(42, 26, 20, 0.05)',
        'float': '0 10px 30px -5px rgba(42, 26, 20, 0.1)',
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/container-queries'),
  ],
}
