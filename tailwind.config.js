/** @type {import('tailwindcss').Config} */
export default {
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
    theme: {
        extend: {
            fontFamily: {
                sans: ['DM Sans', 'system-ui', 'sans-serif'],
                display: ['Fraunces', 'Georgia', 'serif'],
                mono: ['DM Mono', 'monospace'],
            },
            colors: {
                brand: { 500: '#e8650a', 600: '#d05a08' },
                surface: { 900: '#ffffff', 800: '#fafafa', 700: '#f4f6f9', 600: '#e2e7ef', border: '#c8d0dc' },
            },
        },
    },
    plugins: [],
}
