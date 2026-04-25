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
          strong: 'var(--accent-strong)',
        },
        border: {
          DEFAULT: 'var(--border)',
          light: 'var(--border-light)',
        },
        surface: {
          DEFAULT: 'var(--surface-card)',
          strong: 'var(--surface-card-strong)',
          muted: 'var(--surface-muted)',
          glass: 'var(--surface-glass)',
        },
        story: {
          bg: '#041f18',
          surface: '#062920',
          card: '#0b3228',
          border: '#1a5140',
          accent: '#30d7ab',
          'accent-warm': '#f0b429',
          'accent-pink': '#f472b6',
          'accent-purple': '#a78bfa',
          glow: 'rgba(48,215,171,0.4)',
          muted: '#739f91',
          text: '#e2fff5',
          'text-dim': '#8cc4b3',
          'glass-bg': 'rgba(4, 31, 24, 0.65)',
          'glass-border': 'rgba(48, 215, 171, 0.12)',
          'glass-surface': 'rgba(6, 41, 32, 0.75)',
          // Highlight tokens
          'highlight-ring': '#1e6b52',
          'highlight-bg': '#0a2e23',
        },
      },
      aspectRatio: {
        'story': '9 / 16',
      fontFamily: {
        body: ['var(--font-body)', 'sans-serif'],
        display: ['var(--font-display)', 'sans-serif'],
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
        // Ring & glow
        'story-ring': 'story-ring-spin 3s linear infinite',
        'story-glow': 'story-ring-glow 2.5s ease-in-out infinite',
        'story-pulse': 'story-pulse 2s ease-in-out infinite',
        'story-ring-shimmer': 'story-ring-shimmer 2s ease-in-out infinite',

        // Enter / exit
        'story-enter': 'story-item-enter 0.4s cubic-bezier(0.22,1,0.36,1) both',
        'story-viewer-in': 'story-viewer-open 0.35s cubic-bezier(0.22,1,0.36,1) both',
        'story-viewer-out': 'story-viewer-close 0.3s cubic-bezier(0.55,0,1,0.45) both',
        'story-backdrop': 'story-viewer-backdrop 0.4s ease-out both',
        'story-backdrop-out': 'story-viewer-backdrop-out 0.3s ease-in both',
        'story-modal': 'story-modal-slide 0.4s cubic-bezier(0.22,1,0.36,1) both',
        'story-swipe-exit': 'story-swipe-exit 0.35s cubic-bezier(0.55,0,1,0.45) both',

        // Content transitions
        'story-cube-next': 'story-cube-next 0.45s cubic-bezier(0.22,1,0.36,1) both',
        'story-cube-prev': 'story-cube-prev 0.45s cubic-bezier(0.22,1,0.36,1) both',
        'story-content-in': 'story-content-fade-in 0.3s cubic-bezier(0.22,1,0.36,1) both',
        'story-ken-burns': 'story-ken-burns 8s ease-in-out infinite alternate',
        'story-blur-reveal': 'story-blur-reveal 0.6s ease-out both',

        // 3D perspective transitions
        'story-3d-next': 'story-3d-next 0.5s cubic-bezier(0.22,1,0.36,1) both',
        'story-3d-prev': 'story-3d-prev 0.5s cubic-bezier(0.22,1,0.36,1) both',

        // Reactions & interactions
        'story-reaction-pop': 'story-reaction-pop 0.35s cubic-bezier(0.34,1.56,0.64,1) both',
        'story-float': 'story-float 2s ease-in-out infinite',
        'story-heart-burst': 'story-heart-burst 0.6s cubic-bezier(0.17,0.89,0.32,1.35) both',
        'story-fade-up': 'story-fade-up 0.4s cubic-bezier(0.22,1,0.36,1) both',
        'story-fade-down': 'story-fade-down 0.3s ease-in both',
        'story-scale-in': 'story-scale-in 0.3s cubic-bezier(0.22,1,0.36,1) both',

        // Progress & loading
        'story-progress-glow': 'story-progress-glow 2s ease-in-out infinite',
        'story-shimmer': 'story-shimmer 2.5s ease-in-out infinite',
        'story-skeleton-wave': 'story-skeleton-wave 1.8s ease-in-out infinite',

        // Preview
        'preview-slide-in': 'preview-slide-in 0.4s cubic-bezier(0.22,1,0.36,1) both',
        'preview-slide-out': 'preview-slide-out 0.3s cubic-bezier(0.55,0,1,0.45) both',
        'preview-progress': 'preview-progress 8s linear both',

        // Action bar
        'story-action-bounce': 'story-action-bounce 0.5s cubic-bezier(0.34,1.56,0.64,1) both',

        // CTA button
        'story-cta-bounce': 'story-cta-bounce 0.6s cubic-bezier(0.34,1.56,0.64,1) both',

        // Volume slider
        'story-volume-slide': 'story-volume-slide 0.25s cubic-bezier(0.22,1,0.36,1) both',

        // Share fly
        'story-share-fly': 'story-share-fly 0.5s cubic-bezier(0.22,1,0.36,1) both',

        // Unseen dot pulse
        'story-dot-pulse': 'story-dot-pulse 2s ease-in-out infinite',

        // Preview hover
        'story-preview-zoom': 'story-preview-zoom 0.4s cubic-bezier(0.22,1,0.36,1) both',
      },
      keyframes: {
        'story-ring-spin': {
          to: { '--story-ring-angle': '360deg' },
        },
        'story-ring-glow': {
          '0%, 100%': { filter: 'drop-shadow(0 0 6px rgba(48,215,171,0.35))' },
          '50%': { filter: 'drop-shadow(0 0 14px rgba(48,215,171,0.6)) drop-shadow(0 0 28px rgba(48,215,171,0.2))' },
        },
        'story-ring-shimmer': {
          '0%, 100%': { opacity: '0.7' },
          '50%': { opacity: '1' },
        },
        'story-pulse': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(48,215,171,0.4)' },
          '50%': { boxShadow: '0 0 0 8px rgba(48,215,171,0)' },
        },
        'story-item-enter': {
          from: { opacity: '0', transform: 'scale(0.85) translateY(8px)' },
          to: { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        'story-viewer-open': {
          from: { opacity: '0', transform: 'scale(0.88) translateY(20px)' },
          to: { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        'story-viewer-close': {
          from: { opacity: '1', transform: 'scale(1) translateY(0)' },
          to: { opacity: '0', transform: 'scale(0.88) translateY(20px)' },
        },
        'story-viewer-backdrop': {
          from: { backdropFilter: 'blur(0px)', backgroundColor: 'rgba(0,0,0,0)' },
          to: { backdropFilter: 'blur(24px)', backgroundColor: 'rgba(2,8,6,0.95)' },
        },
        'story-viewer-backdrop-out': {
          from: { backdropFilter: 'blur(24px)', backgroundColor: 'rgba(2,8,6,0.95)' },
          to: { backdropFilter: 'blur(0px)', backgroundColor: 'rgba(0,0,0,0)' },
        },
        'story-modal-slide': {
          from: { opacity: '0', transform: 'translateY(24px) scale(0.96)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'story-swipe-exit': {
          from: { opacity: '1', transform: 'translateY(0) scale(1)' },
          to: { opacity: '0', transform: 'translateY(60vh) scale(0.7)' },
        },
        'story-cube-next': {
          from: { opacity: '0', transform: 'translateX(100%) scale(0.88)' },
          to: { opacity: '1', transform: 'translateX(0) scale(1)' },
        },
        'story-cube-prev': {
          from: { opacity: '0', transform: 'translateX(-100%) scale(0.88)' },
          to: { opacity: '1', transform: 'translateX(0) scale(1)' },
        },
        'story-3d-next': {
          '0%': { opacity: '0', transform: 'perspective(1200px) rotateY(-25deg) translateX(60%) scale(0.85)' },
          '100%': { opacity: '1', transform: 'perspective(1200px) rotateY(0deg) translateX(0) scale(1)' },
        },
        'story-3d-prev': {
          '0%': { opacity: '0', transform: 'perspective(1200px) rotateY(25deg) translateX(-60%) scale(0.85)' },
          '100%': { opacity: '1', transform: 'perspective(1200px) rotateY(0deg) translateX(0) scale(1)' },
        },
        'story-content-fade-in': {
          from: { opacity: '0', transform: 'scale(1.04)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'story-ken-burns': {
          '0%': { transform: 'scale(1) translate(0, 0)' },
          '100%': { transform: 'scale(1.08) translate(-1%, -1%)' },
        },
        'story-blur-reveal': {
          from: { opacity: '0', filter: 'blur(12px)' },
          to: { opacity: '1', filter: 'blur(0px)' },
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
        'story-heart-burst': {
          '0%': { transform: 'scale(0)', opacity: '0' },
          '40%': { transform: 'scale(1.4)', opacity: '1' },
          '70%': { transform: 'scale(0.9)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'story-fade-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'story-fade-down': {
          from: { opacity: '1', transform: 'translateY(0)' },
          to: { opacity: '0', transform: 'translateY(12px)' },
        },
        'story-scale-in': {
          from: { opacity: '0', transform: 'scale(0.85)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'story-progress-glow': {
          '0%, 100%': { boxShadow: '0 0 4px rgba(48,215,171,0.3)' },
          '50%': { boxShadow: '0 0 8px rgba(48,215,171,0.6), 0 0 16px rgba(48,215,171,0.15)' },
        },
        'story-shimmer': {
          from: { transform: 'translateX(-100%)' },
          to: { transform: 'translateX(100%)' },
        },
        'story-skeleton-wave': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'story-action-bounce': {
          '0%': { transform: 'scale(0.7)', opacity: '0' },
          '50%': { transform: 'scale(1.1)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'story-cta-bounce': {
          '0%': { transform: 'translateY(16px) scale(0.9)', opacity: '0' },
          '60%': { transform: 'translateY(-3px) scale(1.02)' },
          '100%': { transform: 'translateY(0) scale(1)', opacity: '1' },
        },
        'story-volume-slide': {
          from: { opacity: '0', transform: 'translateY(8px) scaleY(0.8)' },
          to: { opacity: '1', transform: 'translateY(0) scaleY(1)' },
        },
        'story-share-fly': {
          '0%': { transform: 'scale(1) translate(0,0)' },
          '50%': { transform: 'scale(0.85) translate(6px,-10px)', opacity: '0.5' },
          '100%': { transform: 'scale(1) translate(0,0)', opacity: '1' },
        },
        'story-dot-pulse': {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.4)', opacity: '0.6' },
        },
        'story-preview-zoom': {
          from: { opacity: '0', transform: 'scale(0.92)' },
          to: { opacity: '1', transform: 'scale(1)' },
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
        'story-heavy': '32px',
      },
    },
  },
  plugins: [],
};
