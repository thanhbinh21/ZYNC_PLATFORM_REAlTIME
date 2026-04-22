/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: 'var(--bg-primary)',
          secondary: 'var(--bg-secondary)',
          sidebar: 'var(--bg-sidebar)',
          hover: 'var(--bg-hover)',
          active: 'var(--bg-active)',
          code: 'var(--bg-code)',
          card: 'var(--bg-card)',
        },
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          tertiary: 'var(--text-tertiary)',
          link: 'var(--text-link)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          hover: 'var(--accent-hover)',
          light: 'var(--accent-light)',
        },
        border: {
          DEFAULT: 'var(--border)',
          light: 'var(--border-light)',
        },
        story: {
          bg: '#041f18',
          surface: '#062920',
          card: '#0b3228',
          border: '#1a5140',
          accent: '#30d7ab',
          'accent-warm': '#f0b429',
          glow: 'rgba(48,215,171,0.4)',
          muted: '#739f91',
          text: '#e2fff5',
          'text-dim': '#8cc4b3',
        },
      },
      fontFamily: {
        body: ['var(--font-body)', 'sans-serif'],
        code: ['var(--font-code)', 'monospace'],
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
      },
      animation: {
        'story-ring': 'story-ring-spin 3s linear infinite',
        'story-glow': 'story-ring-glow 2.5s ease-in-out infinite',
        'story-pulse': 'story-pulse 2s ease-in-out infinite',
        'story-enter': 'story-item-enter 0.4s cubic-bezier(0.22,1,0.36,1) both',
        'story-viewer-in': 'story-viewer-open 0.35s cubic-bezier(0.22,1,0.36,1) both',
        'story-backdrop': 'story-viewer-backdrop 0.4s ease-out both',
        'story-modal': 'story-modal-slide 0.4s cubic-bezier(0.22,1,0.36,1) both',
        'story-reaction-pop': 'story-reaction-pop 0.35s cubic-bezier(0.34,1.56,0.64,1) both',
        'story-float': 'story-float 2s ease-in-out infinite',
        'story-progress-glow': 'story-progress-glow 2s ease-in-out infinite',
        'story-fade-up': 'story-fade-up 0.4s cubic-bezier(0.22,1,0.36,1) both',
        'story-shimmer': 'story-shimmer 2.5s ease-in-out infinite',
        'preview-slide-in': 'preview-slide-in 0.4s cubic-bezier(0.22,1,0.36,1) both',
        'preview-slide-out': 'preview-slide-out 0.3s cubic-bezier(0.55,0,1,0.45) both',
        'preview-progress': 'preview-progress 8s linear both',
      },
      keyframes: {
        'story-ring-spin': {
          to: { '--story-ring-angle': '360deg' },
        },
        'story-ring-glow': {
          '0%, 100%': { filter: 'drop-shadow(0 0 6px rgba(48,215,171,0.35))' },
          '50%': { filter: 'drop-shadow(0 0 14px rgba(48,215,171,0.6)) drop-shadow(0 0 28px rgba(48,215,171,0.2))' },
        },
        'story-pulse': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(48,215,171,0.4)' },
          '50%': { boxShadow: '0 0 0 6px rgba(48,215,171,0)' },
        },
        'story-item-enter': {
          from: { opacity: '0', transform: 'scale(0.85) translateY(8px)' },
          to: { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        'story-viewer-open': {
          from: { opacity: '0', transform: 'scale(0.92)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'story-viewer-backdrop': {
          from: { backdropFilter: 'blur(0px)', backgroundColor: 'rgba(0,0,0,0)' },
          to: { backdropFilter: 'blur(16px)', backgroundColor: 'rgba(2,8,6,0.92)' },
        },
        'story-modal-slide': {
          from: { opacity: '0', transform: 'translateY(24px) scale(0.96)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'story-reaction-pop': {
          '0%': { transform: 'scale(0.3)', opacity: '0' },
          '50%': { transform: 'scale(1.15)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'story-float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-3px)' },
        },
        'story-progress-glow': {
          '0%, 100%': { boxShadow: '0 0 4px rgba(48,215,171,0.3)' },
          '50%': { boxShadow: '0 0 8px rgba(48,215,171,0.6), 0 0 16px rgba(48,215,171,0.15)' },
        },
        'story-fade-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'story-shimmer': {
          from: { transform: 'translateX(-100%)' },
          to: { transform: 'translateX(100%)' },
        },
        'preview-slide-in': {
          from: { opacity: '0', transform: 'translateY(24px) scale(0.95)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'preview-slide-out': {
          from: { opacity: '1', transform: 'translateY(0) scale(1)' },
          to: { opacity: '0', transform: 'translateY(24px) scale(0.95)' },
        },
        'preview-progress': {
          from: { width: '100%' },
          to: { width: '0%' },
        },
      },
      backdropBlur: {
        'story': '20px',
      },
    },
  },
  plugins: [],
};
