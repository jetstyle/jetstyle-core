/** @type {import('tailwindcss').Config} */
import sharedConfig from '@jetstyle/config-tailwind'

module.exports = {
  theme: {
    extend: {
      colors: {
        'grey-neutral': '#9d9999',
      },
    }
  },
  content: [
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './helpers/**/*.{js,ts,jsx,tsx,mdx}',
    './hooks/**/*.{js,ts,jsx,tsx,mdx}',
    './models/**/*.{js,ts,jsx,tsx,mdx}',
    //  TODO если что /styles убрать, отсюда
    './styles/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  prefix: '',
  presets: [sharedConfig],
  plugins: [require('daisyui')],
  daisyui: {
    themes: false, // false: only light + dark | true: all themes | array: specific themes like this ["light", "dark", "cupcake"]
    darkTheme: 'dark', // name of one of the included themes for dark mode
    base: true, // applies background color and foreground color for root element by default
    styled: true, // include daisyUI colors and design decisions for all components
    utils: true, // adds responsive and modifier utility classes
    prefix: '', // prefix for daisyUI classnames (components, modifiers and responsive class names. Not colors)
    logs: false, // Shows info about daisyUI version and used config in the console when building your CSS
    themeRoot: ':root', // The element that receives theme color CSS variables
  },
}
