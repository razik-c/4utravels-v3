/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./dist/*.{html,js}"],
  
  theme: {
    extend: {
      container: {
        center: true,
        screens: {
          "2xl": "1400px",
        },
        padding: {
          DEFAULT: "1.5rem",
        },
      },
    },
    typography: {
      desktop: {
        css: {
          h1: {
            fontSize: "56px",
            lineHeight: "64px", // tighter than 67.2px
            letterSpacing: "-0.02em",
            fontWeight: 700,
          },
          h2: {
            fontSize: "48px",
            lineHeight: "56px",
            letterSpacing: "-0.02em",
            fontWeight: 700,
          },
          h3: {
            fontSize: "36px",
            lineHeight: "44px",
            letterSpacing: "-0.01em",
            fontWeight: 700,
          },
          h5: {
            fontSize: "24px",
            lineHeight: "32px",
            letterSpacing: "-0.01em",
            fontWeight: 700,
          },
          h6: {
            fontSize: "20px",
            lineHeight: "28px",
            letterSpacing: "-0.01em",
            fontWeight: 700,
          },
          p: {
            fontSize: "18px",
            lineHeight: "28px",
            letterSpacing: "-0.01em",
            fontWeight: 400,
          },
          span: {
            fontSize: "16px",
            lineHeight: "24px",
            letterSpacing: "-0.01em",
            fontWeight: 400,
          },
        },
      },

      // md and lg (Tablet)
      tablet: {
        css: {
          h1: {
            fontSize: "48px",
            lineHeight: "56px",
            letterSpacing: "-0.01em",
            fontWeight: 700,
          },
          h3: {
            fontSize: "36px",
            lineHeight: "44px",
            letterSpacing: "-0.01em",
            fontWeight: 700,
          },
          p: {
            fontSize: "18px",
            lineHeight: "28px",
            letterSpacing: "-0.01em",
            fontWeight: 400,
          },
        },
      },

      // mobile and sm (Default)
      DEFAULT: {
        css: {
          h1: {
            fontSize: "40px",
            lineHeight: "48px",
            letterSpacing: "-0.01em",
            fontWeight: 700,
          },
          h2: {
            fontSize: "36px",
            lineHeight: "44px",
            letterSpacing: "-0.01em",
            fontWeight: 700,
          },
          h3: {
            fontSize: "32px",
            lineHeight: "40px",
            letterSpacing: "-0.01em",
            fontWeight: 700,
          },
          h4: {
            fontSize: "24px",
            lineHeight: "32px",
            letterSpacing: "-0.01em",
            fontWeight: 700,
          },
          h5: {
            fontSize: "20px",
            lineHeight: "28px",
            letterSpacing: "-0.01em",
            fontWeight: 700,
          },
          h6: {
            fontSize: "18px",
            lineHeight: "26px",
            letterSpacing: "-0.01em",
            fontWeight: 700,
          },
          p: {
            fontSize: "16px",
            lineHeight: "24px",
            letterSpacing: "-0.01em",
            fontWeight: 400,
          },
          span: {
            fontSize: "14px",
            lineHeight: "20px",
            letterSpacing: "-0.01em",
            fontWeight: 400,
          },
        },
      },
    },
  plugins: [require("@tailwindcss/typography")],

  },
};
