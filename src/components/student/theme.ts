import { colors, fonts, radii, shadows, spacing } from '@/theme/tokens';

/** Student portal surface tokens — calm, high contrast, brand-led */
export const studentTheme = {
  canvas: '#F1F5F9',
  card: '#FFFFFF',
  cardMuted: '#F8FAFC',
  ink: colors.text,
  inkSoft: colors.textSecondary,
  inkMute: colors.textMuted,
  line: '#E2E8F0',
  brand: colors.primary,
  brandDeep: colors.primaryDeep,
  brandSoft: colors.primarySoft,
  accent: colors.secondary,
  accentSoft: colors.secondarySoft,
  success: colors.success,
  successSoft: colors.successSoft,
  warning: colors.warning,
  danger: colors.danger,
  heroGradient: [colors.primaryDeep, colors.primaryDark, colors.primary] as const,
  radius: {
    sm: radii.sm,
    md: radii.md,
    lg: 16,
    xl: 22,
    full: radii.full,
  },
  space: spacing,
  fonts,
  shadow: {
    card: {
      ...shadows.sm,
      shadowOpacity: 0.06,
      shadowRadius: 10,
      elevation: 2,
    },
    float: {
      ...shadows.md,
      shadowOpacity: 0.1,
      shadowRadius: 16,
      elevation: 4,
    },
  },
} as const;
