/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // UMAテーマカラー
        'uma': {
          'primary': '#58a6ff',
          'secondary': '#8e44ad',
          'dark': '#0d1117',
          'card': '#161b22',
          'border': '#30363d',
          'text': '#c9d1d9',
          'muted': '#8b949e'
        },
        // 草パワーカラー
        'grass': {
          'power': '#238636',
          'light': '#2ea043',
          'dark': '#1a7f37'
        },
        // レア度カラー
        'rarity': {
          'common': '#666666',
          'rare': '#4a90e2',
          'super': '#8e44ad',
          'ultra': '#d68910',
          'legend': '#c0392b'
        },
        // アクションカラー
        'action': {
          'danger': '#da3633',
          'warning': '#f39c12',
          'success': '#16a34a',
          'info': '#58a6ff'
        }
      },
      fontFamily: {
        'mono': ['Monaco', 'Menlo', 'monospace'],
        'pixel': ['"Press Start 2P"', 'monospace'],
        'futuristic': ['Orbitron', 'sans-serif'],
      },
      animation: {
        'float': 'float 3s ease-in-out infinite',
        'bounce-soft': 'bounce-soft 2s ease-in-out infinite',
        'pulse-soft': 'pulse-soft 4s ease-in-out infinite',
        'sparkle': 'sparkle 2s ease-in-out infinite',
        'discovery': 'discovery 1.5s ease-out',
        'modal-fade': 'modal-fade 0.5s ease-out'
      },
      boxShadow: {
        'uma': '0 4px 8px rgba(0,0,0,0.5)',
        'uma-lg': '0 8px 16px rgba(0,0,0,0.6)',
        'glow-blue': '0 0 15px rgba(88, 166, 255, 0.3)',
        'glow-purple': '0 0 15px rgba(142, 68, 173, 0.3)',
        'glow-gold': '0 0 15px rgba(251, 191, 36, 0.5)'
      },
      backdropBlur: {
        'uma': '10px'
      }
    },
  },
  plugins: [],
}