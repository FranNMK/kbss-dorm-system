import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#14213D",
          90: "rgba(20,33,61,0.90)",
          40: "rgba(20,33,61,0.40)",
          10: "rgba(20,33,61,0.10)",
        },
        neutral: {
          DEFAULT: "#FDFDFC",
          text: "#1B1B18",
        },
        accent: {
          DEFAULT: "#E8A33D",
          90: "rgba(232,163,61,0.90)",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
