const defaultTheme = require('tailwindcss/defaultTheme')

const spacings = {
  'none': '20px',
  'xs': '10px',
  'sm': '20px',
  'base': '50px',
  'xl': '100px'
};

module.exports = {
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
      },
      colors: {
        primary: '#1D4ED8',    
        secondary: '#F59E0B',  
        accent: '#10B981',     
        neutral: '#F3F4F6',   
        black: {
          100: '#EFEFEF',
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
      fontSize: {
        'xxs': 'xxx',  
        'xs': 'xx',   
        'sm': '0.8rem',     
        'base': 'xx',    
        'l': 'xx',      
        'xl': '2rem',    
        'xxl': '4rem',      
        'xxxl': '7.5rem',    
        'display': '5rem',      
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
    require('@tailwindcss/container-queries'),
  ]
}