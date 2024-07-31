const defaultTheme = require('tailwindcss/defaultTheme')

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
        custom: {
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',
        },
      },
      margin: {
        'none': '20px',       
        'xs': '10px',  
        'sm': '20px',       
        'base': '50px',
        'x-large': '100px'      
      },
      padding: {
        'none': '20px',      
        'xs': '10px', 
        'sm': '20px',    
        'base': '50px',
        'xl': '100px'
      },
      fontSize: {
        'xxs': '0.625rem',  
        'xs': '1.75rem',   
        'sm': '13px',     
        'base': '2.5rem',    
        'l': '3rem',      
        'xl': '40px',    
        'xxl': '4rem',      
        'xxxl': '4.5rem',    
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
