/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                serif: ['"Playfair Display"', 'serif'],
                sans: ['"Inter"', 'sans-serif'],
            },
            colors: {
                brand: {
                    dark: '#1c1917',
                    primary: '#292524',
                    accent: '#c2410c',
                    soft: '#f5f5f4',
                    green: '#3f6212',
                }
            },
            animation: {
                'image-drift': 'imageDrift 20s ease-in-out infinite alternate',
                'fade-in-up': 'fadeInUp 0.6s ease-out forwards',
                'fade-in': 'fadeIn 0.8s ease-out forwards',
                'slide-up': 'slideUp 0.5s ease-out forwards',
                'bounce-slow': 'bounce 3s ease-in-out infinite',
                'pulse-slow': 'pulse 4s ease-in-out infinite',
            },
            keyframes: {
                imageDrift: {
                    '0%': { transform: 'scale(1.08) translate(0, 0)' },
                    '100%': { transform: 'scale(1.12) translate(-1%, -1%)' },
                },
                fadeInUp: {
                    '0%': { opacity: '0', transform: 'translateY(24px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { opacity: '0', transform: 'translateY(16px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
            },
        },
    },
    plugins: [],
}
