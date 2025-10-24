const { join } = require("path");

/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    join(__dirname, "app/**/*.{js,ts,jsx,tsx,mdx}"),
    join(__dirname, "components/**/*.{js,ts,jsx,tsx,mdx}"),
    join(__dirname, "contexts/**/*.{js,ts,jsx,tsx,mdx}"),
    join(__dirname, "lib/**/*.{js,ts,jsx,tsx,mdx}"),
    join(__dirname, "config/**/*.{js,ts,jsx,tsx,mdx}")
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)"
      }
    }
  },
  plugins: []
};

module.exports = config;
