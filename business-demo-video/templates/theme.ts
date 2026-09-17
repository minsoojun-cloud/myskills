/**
 * Google Cloud 4-Color Design System Theme for BDD (Business-Driven Development / Business Requirements) Demo Videos
 * Pure TypeScript/React theme (100% Apache-2.0 / MIT compatible - Zero proprietary dependencies)
 * - Blue (#4285F4): Primary Business Workflow / Operational Efficiency
 * - Green (#34A853): Business Value & SLA Fulfillment / ROI & Saga Compensation
 * - Red (#EA4335): Risk & Governance Control / Security & Compliance Guardrails
 * - Yellow (#FBBC04): Exception Management / Human-in-the-Loop Escalation
 */
export const GOOGLE_THEME = {
  colors: {
    blue: '#4285F4',
    red: '#EA4335',
    yellow: '#FBBC04',
    green: '#34A853',
    ink: '#202124',
    inkSecondary: '#3C4043',
    inkMuted: '#5F6368',
    surface: '#FFFFFF',
    surfaceSubtle: '#F8F9FA',
    border: '#DADCE0',
    blueTint: '#E8F0FE',
    redTint: '#FCE8E6',
    yellowTint: '#FEF7E0',
    greenTint: '#E6F4EA',
  },
  gradient: 'linear-gradient(90deg, #4285F4 0%, #EA4335 33%, #FBBC04 66%, #34A853 100%)',
  fonts: {
    sans: '"Google Sans", "Roboto", "Noto Sans JP", -apple-system, BlinkMacSystemFont, sans-serif',
    mono: '"Roboto Mono", "JetBrains Mono", monospace',
  },
  layout: {
    width: 1920,
    height: 1080,
    fps: 30,
    topBarHeight: 6,
    railHeight: 44,
  },
} as const;

export const SCENE_COLORS = [
  GOOGLE_THEME.colors.blue,
  GOOGLE_THEME.colors.green,
  GOOGLE_THEME.colors.red,
  GOOGLE_THEME.colors.yellow,
];
