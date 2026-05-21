import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ['JetBrains Mono', 'Courier New', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        background: '#0A0A0A',
        surface: { DEFAULT: '#111111', secondary: '#1a1a1a' },
        green: { DEFAULT: '#00D26A', dim: '#00D26A22' },
        red: { DEFAULT: '#FF4444', dim: '#FF444422' },
        amber: { DEFAULT: '#F5A623', dim: '#F5A62322' },
        muted: '#666666',
      },
      borderColor: {
        DEFAULT: '#222222',
      },
    },
  },
  plugins: [],
};
export default config;
