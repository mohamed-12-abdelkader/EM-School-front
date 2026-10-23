import { fonts, radii, shadows, spacing } from '@/theme/tokens';

/**
 * Teacher portal — calm light workspace (teal + slate)
 * Easy scan, RTL-first, avoids dark-purple dashboard cliché.
 */
export const teacherTheme = {
  canvas: '#F3F6FA',
  canvasTint: '#E8F5F3',
  card: '#FFFFFF',
  cardMuted: '#F8FAFC',
  ink: '#0F172A',
  inkSoft: '#475569',
  inkMute: '#94A3B8',
  line: '#E2E8F0',
  brand: '#0F766E',
  brandHover: '#0D9488',
  brandSoft: '#CCFBF1',
  brandDeep: '#115E59',
  accent: '#0369A1',
  accentSoft: '#E0F2FE',
  success: '#059669',
  successSoft: '#D1FAE5',
  warning: '#D97706',
  warningSoft: '#FEF3C7',
  danger: '#DC2626',
  dangerSoft: '#FEE2E2',
  info: '#0284C7',
  infoSoft: '#E0F2FE',
  heroGradient: ['#115E59', '#0F766E', '#14B8A6'] as const,
  radius: {
    sm: radii.sm,
    md: radii.md,
    lg: 18,
    xl: 24,
    full: radii.full,
  },
  space: spacing,
  fonts,
  shadow: {
    card: {
      ...shadows.sm,
      shadowColor: '#0F172A',
      shadowOpacity: 0.05,
      shadowRadius: 12,
      elevation: 2,
    },
    float: {
      ...shadows.md,
      shadowColor: '#0F172A',
      shadowOpacity: 0.08,
      shadowRadius: 20,
      elevation: 5,
    },
  },
} as const;
