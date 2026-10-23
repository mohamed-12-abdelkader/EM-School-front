import { colors, fonts, radii, shadows, spacing } from '@/theme/tokens';

/** Student portal — light Clast-style operate surface */
export const studentTheme = {
  canvas: '#F8FAFC',
  card: '#FFFFFF',
  cardMuted: '#F1F5F9',
  ink: '#0F172A',
  inkSoft: '#475569',
  inkMute: '#94A3B8',
  line: '#E2E8F0',
  brand: '#2563EB',
  brandDeep: '#1D4ED8',
  brandSoft: '#EFF6FF',
  accent: '#F97316',
  accentSoft: '#FFF7ED',
  success: '#059669',
  successSoft: '#ECFDF5',
  warning: '#D97706',
  danger: '#E11D48',
  sky: '#0284C7',
  skySoft: '#E0F2FE',
  /** Inner-screen headers (white text on brand) */
  heroGradient: ['#1E3A5F', '#2563EB', '#3B82F6'] as const,
  /** Home summary card */
  heroAccent: ['#2563EB', '#0EA5E9'] as const,
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
      shadowColor: '#2563EB',
      shadowOpacity: 0.12,
      shadowRadius: 20,
      elevation: 5,
    },
  },
} as const;
