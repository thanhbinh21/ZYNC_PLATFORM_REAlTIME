// Unified teal palette matching Web design tokens (--accent: #0f9d8e / #22c7b5)
export const lightTheme = {
  bgPrimary: '#eaf1f8',
  bgSecondary: '#e8f0f6',
  bgSidebar: 'rgba(255, 255, 255, 0.65)',
  bgHover: '#e0eaf3',
  bgActive: '#d0e2ec',
  bgCode: '#e1e7f0',
  bgCard: '#f6f9fc',

  textPrimary: '#0b1120',
  textSecondary: '#1e293b',
  textTertiary: '#5c6c85',
  textLink: '#0a7569',

  accent: '#0f9d8e',
  accentHover: '#0b8073',
  accentLight: '#ccebe6',
  accentStrong: '#07544b',
  textOnAccent: '#FFFFFF',

  info: '#2563EB',
  warning: '#F59E0B',
  danger: '#EF4444',
  violet: '#8B5CF6',
  pink: '#EC4899',
  neutral: '#64748B',
  dangerSoft: 'rgba(239, 68, 68, 0.08)',
  dangerBorder: 'rgba(239, 68, 68, 0.2)',

  border: '#D0D7DE',
  borderLight: '#E8ECEF',

  surfaceCard: 'rgba(250, 252, 255, 0.84)',
  surfaceCardStrong: 'rgba(255, 255, 255, 0.98)',
  surfaceMuted: 'rgba(240, 244, 248, 0.82)',
  surfaceGlass: 'rgba(250, 252, 255, 0.52)',
  surfaceGlassStrong: 'rgba(255, 255, 255, 0.85)',

  glassBorder: 'rgba(15, 157, 142, 0.24)',
  glassBorderSoft: 'rgba(15, 157, 142, 0.14)',
  glassGlow: 'rgba(15, 157, 142, 0.22)',
  glassShadow: 'rgba(11, 17, 32, 0.5)',
  divider: 'rgba(11, 17, 32, 0.1)',
};

export const darkTheme = {
  bgPrimary: '#08111f',
  bgSecondary: '#0d1727',
  bgSidebar: 'rgba(9, 18, 33, 0.86)',
  bgHover: '#162235',
  bgActive: '#1c3140',
  bgCode: '#0d1727',
  bgCard: '#111d31',

  textPrimary: '#edf4fb',
  textSecondary: '#9fb0c4',
  textTertiary: '#74859b',
  textLink: '#53ddcf',

  accent: '#22c7b5',
  accentHover: '#1ab1a1',
  accentLight: 'rgba(34, 199, 181, 0.16)',
  accentStrong: '#0d6b62',
  textOnAccent: '#FFFFFF',

  info: '#60A5FA',
  warning: '#FBBF24',
  danger: '#F87171',
  violet: '#A78BFA',
  pink: '#F472B6',
  neutral: '#94A3B8',
  dangerSoft: 'rgba(248, 113, 113, 0.12)',
  dangerBorder: 'rgba(248, 113, 113, 0.28)',

  border: '#30363D',
  borderLight: '#21262D',

  surfaceCard: 'rgba(17, 29, 49, 0.84)',
  surfaceCardStrong: 'rgba(17, 29, 49, 0.96)',
  surfaceMuted: 'rgba(14, 24, 40, 0.82)',
  surfaceGlass: 'rgba(12, 21, 36, 0.74)',
  surfaceGlassStrong: 'rgba(12, 21, 36, 0.86)',

  glassBorder: 'rgba(34, 199, 181, 0.24)',
  glassBorderSoft: 'rgba(34, 199, 181, 0.14)',
  glassGlow: 'rgba(34, 199, 181, 0.22)',
  glassShadow: 'rgba(2, 6, 23, 0.5)',
  divider: 'rgba(255, 255, 255, 0.1)',
};

// Flat color aliases (dark-mode defaults; components must use getAppTheme for light/dark)
export const colors = {
  // Teal accent (Web-aligned)
  primary: '#0f9d8e',
  primaryHover: '#0b8073',
  accent: '#0f9d8e',
  accentSoft: '#ccebe6',
  info: '#2563EB',
  warning: '#F59E0B',
  danger: '#EF4444',
  violet: '#8B5CF6',
  pink: '#EC4899',
  neutral: '#64748B',

  backgroundDeep: '#021612',
  backgroundMid: '#031e18',
  backgroundSoft: '#0f4738',
  backgroundAuth: '#044f3a',

  background: '#08111f',
  surface: 'rgba(15, 157, 142, 0.08)',
  surfaceHover: 'rgba(15, 157, 142, 0.14)',

  glassUltra: 'rgba(15, 157, 142, 0.08)',
  glassSoft: 'rgba(15, 157, 142, 0.28)',
  glassStrong: 'rgba(5, 30, 25, 0.72)',
  glassPanel: 'rgba(15, 157, 142, 0.46)',
  glassPanelStrong: 'rgba(3, 20, 18, 0.80)',

  glassBorder: 'rgba(15, 157, 142, 0.24)',
  glassBorderSoft: 'rgba(15, 157, 142, 0.14)',
  glassGlow: 'rgba(15, 157, 142, 0.22)',
  glassShadow: 'rgba(2, 6, 23, 0.5)',
  divider: 'rgba(255, 255, 255, 0.1)',

  text: '#edf4fb',
  textMuted: '#74859b',
  textSubtle: '#9fb0c4',

  error: '#EF4444',
  success: '#22c7b5',
  dangerSoft: 'rgba(239, 68, 68, 0.12)',
  dangerBorder: 'rgba(248, 113, 113, 0.28)',

  border: '#30363D',
};
