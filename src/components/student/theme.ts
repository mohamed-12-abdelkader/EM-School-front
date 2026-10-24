import { fonts, radii, shadows, spacing } from '@/theme/tokens';

/**
 * Student portal — light Clast operate surface (EdTech, easy scan, Arabic RTL).
 * Canvas soft slate; brand indigo; clear status colors.
 */
export const studentTheme = {
  canvas: '#F8FAFC',
  card: '#FFFFFF',
  cardMuted: '#F1F5F9',
  ink: '#0F172A',
  inkSoft: '#475569',
  inkMute: '#94A3B8',
  line: '#E2E8F0',
  brand: '#4F46E5',
  brandDeep: '#4338CA',
  brandSoft: '#EEF2FF',
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
  heroGradient: ['#312E81', '#4F46E5', '#6366F1'] as const,
  /** Home next-action panel */
  heroAccent: ['#4F46E5', '#6366F1'] as const,
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
      shadowColor: '#4F46E5',
      shadowOpacity: 0.16,
      shadowRadius: 22,
      elevation: 6,
    },
  },
} as const;
