import { brandGradient, colors, fonts, radii, shadows, spacing } from '@/theme/tokens';

/**
 * Student portal — light Clast operate surface (EdTech, easy scan, Arabic RTL).
 * Canvas soft slate; brand matches admin primary blue.
 */
export const studentTheme = {
  canvas: '#F8FAFC',
  card: '#FFFFFF',
  cardMuted: '#F1F5F9',
  ink: '#0F172A',
  inkSoft: '#475569',
  inkMute: '#94A3B8',
  line: '#E2E8F0',
  brand: colors.primary,
  brandDeep: colors.primaryDark,
  brandSoft: colors.primarySoft,
  accent: '#F97316',
  accentSoft: '#FFF7ED',
  success: '#059669',
  successSoft: '#ECFDF5',
  warning: '#D97706',
  warningSoft: '#FFFBEB',
  danger: '#E11D48',
  dangerSoft: '#FFF1F2',
  sky: '#0284C7',
  skySoft: '#E0F2FE',
  ai: '#7C3AED',
  aiSoft: '#F5F3FF',
  /** Inner-screen headers (white text on brand) */
  heroGradient: brandGradient,
  /** Home next-action panel */
  heroAccent: [colors.primaryDark, colors.primary] as const,
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
      shadowOpacity: 0.06,
      shadowRadius: 14,
      elevation: 2,
    },
    float: {
      ...shadows.md,
      shadowColor: colors.primary,
      shadowOpacity: 0.16,
      shadowRadius: 22,
      elevation: 6,
    },
  },
} as const;
