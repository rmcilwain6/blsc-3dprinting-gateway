import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'pg-bg': '#0A0E1A',
        'pg-surface': '#111827',
        'pg-navy': '#1B3764',
        'pg-red': '#E63322',
        'pg-cyan': '#00D4FF',
        'pg-text': '#F9FAFB',
        'pg-muted': '#9CA3AF',
        'pg-success': '#10B981',
        'pg-warning': '#F59E0B',
        'pg-error': '#EF4444',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'glow-cyan': '0 0 20px rgba(0, 212, 255, 0.3)',
        'glow-red': '0 0 20px rgba(230, 51, 34, 0.3)',
        'glow-green': '0 0 20px rgba(16, 185, 129, 0.3)',
      },
    },
  },
  plugins: [],
} satisfies Config;
