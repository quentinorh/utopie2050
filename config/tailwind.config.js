const defaultTheme = require('tailwindcss/defaultTheme')

const navbarHeight = {
  'navbar-height': '60px',
};

const spacings = {
  'none': '0px',
  'xxs': '5px',
  'xs': '10px',
  'sm': '20px',
  'base': '50px',
  'xl': '100px',
  '2xl': '200px'
};

module.exports = {
  darkMode: 'selector',
  content: [
    './public/*.html',
    './app/helpers/**/*.rb',
    './app/javascript/**/*.js',
    './app/views/**/*.{erb,haml,html,slim}'
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Apfel', ...defaultTheme.fontFamily.sans],
        Opendylexic: ['Opendylexic'],
        mono: ['Roboto Mono', 'monospace'],
      },
      colors: {
        primary: '#1D4ED8',
        secondary: '#F59E0B',
        accent: '#10B981',
        neutral: '#F3F4F6',
        black: {
          100: '#EFEFEF',
          500: '#989898',
          900: '#323232',
        },
      },
      margin: {
        ...spacings
      },
      padding: {
        ...spacings
      },
      gap: {
        ...spacings
      },
      height: {
        ...navbarHeight
      },
      top: {
        ...navbarHeight
      },
      fontSize: {
        'xxs': 'xxx',
        'xs': 'xx',
        'sm': '0.75rem',
        'base': '0.95rem',
        'l': '1.1875rem',
        '2l': '1.5rem',
        'xl': '2.1875rem',
        'xxlish': '3.5rem',
        'xxl': '4rem',
        'xxxl': '7.5rem',
        'display': '5rem',
      },
      animation: {
        'slide-down': 'slide-down 3s cubic-bezier(.9,.17,.12,.89) infinite',
      },
      keyframes: {
        'slide-down': {
          '0%': { transform: 'translateY(-100%)' },
          '50%': { transform: 'translateY(0)' },
          '100%': { transform: 'translateY(100%)' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
    require('@tailwindcss/container-queries'),
  ]
}
