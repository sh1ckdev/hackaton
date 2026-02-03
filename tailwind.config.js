/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'terminal-green': '#22c55e',
        'terminal-cyan': '#38bdf8',
        'terminal-blue': '#60a5fa',
        'terminal-purple': '#a78bfa',
        'terminal-red': '#f87171',
        'terminal-bg': '#0b1220',
        'terminal-dark': '#0f172a',
        'terminal-gray': '#1f2937',
        'terminal-light': '#334155',
        'glass-bg': 'rgba(15, 23, 42, 0.55)',
        'glass-border': 'rgba(148, 163, 184, 0.25)',
        'glass-highlight': 'rgba(255, 255, 255, 0.08)',
      },
      fontFamily: {
        'mono': ['Consolas', 'Monaco', 'Courier New', 'monospace'],
      },
      boxShadow: {
        'glass': '0 8px 30px rgba(15, 23, 42, 0.35)',
      },
      animation: {
        'glitch': 'glitch 0.3s infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'typing': 'typing 3.5s steps(40, end)',
      },
      keyframes: {
        glitch: {
          '0%, 100%': { transform: 'translate(0)' },
          '20%': { transform: 'translate(-2px, 2px)' },
          '40%': { transform: 'translate(-2px, -2px)' },
          '60%': { transform: 'translate(2px, 2px)' },
          '80%': { transform: 'translate(2px, -2px)' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: 1, boxShadow: '0 0 10px rgba(0, 255, 65, 0.5)' },
          '50%': { opacity: 0.8, boxShadow: '0 0 20px rgba(0, 255, 65, 0.8)' },
        },
        typing: {
          'from': { width: '0' },
          'to': { width: '100%' },
        },
      },
    },
  },
  plugins: [],
}
