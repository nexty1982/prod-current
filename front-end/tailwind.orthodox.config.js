/**
 * Tailwind CSS Extensions for Orthodox Metrics
 * Adds custom animations and utilities for liturgical styling
 */

module.exports = {
  theme: {
    extend: {
      animation: {
        'colorflow': 'colorflow 20s ease-in-out infinite',
        'flow': 'colorflow 20s ease-in-out infinite',
      },
      keyframes: {
        colorflow: {
          '0%': { backgroundPosition: '0% 50%' },
          '14.3%': { backgroundPosition: '25% 50%' },
          '28.6%': { backgroundPosition: '50% 50%' },
          '42.9%': { backgroundPosition: '75% 50%' },
          '57.2%': { backgroundPosition: '100% 50%' },
          '71.5%': { backgroundPosition: '75% 50%' },
          '85.8%': { backgroundPosition: '50% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
      },
      backgroundSize: {
        '400': '400% 400%',
      },
      colors: {
        orthodox: {
          purple: '#6B21A8',
          gold: '#FFD700',
          red: '#DC2626',
          green: '#059669',
          blue: '#2563EB',
          white: '#F9FAFB',
          black: '#1F2937',
        },
      },
      fontFamily: {
        'noto-serif-georgian': ['"Noto Serif Georgian"', '"Noto Serif"', '"Times New Roman"', 'serif'],
      },
    },
  },
  plugins: [],
};
