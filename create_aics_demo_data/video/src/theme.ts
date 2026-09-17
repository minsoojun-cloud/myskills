/**
 * Google Cloud 4-Color Theme & Executive Typography System
 */
export const GOOGLE_THEME = {
  colors: {
    blue: '#4285F4',
    green: '#34A853',
    red: '#EA4335',
    yellow: '#FBBC04',
    ink: '#202124',
    surface: '#292A2D',
    border: '#3C4043',
    textPrimary: '#FFFFFF',
    textSecondary: '#E8EAED',
    textMuted: '#9AA0A6',
  },
  gradient: 'linear-gradient(90deg, #4285F4 0%, #34A853 33%, #FBBC04 66%, #EA4335 100%)',
  fonts: {
    sans: "'Noto Sans JP', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    mono: "'JetBrains Mono', 'Fira Code', monospace",
  },
  layout: {
    width: 1920,
    height: 1080,
    topBarHeight: 8,
    railHeight: 68,
  },
} as const;
