export const colors = {
  primary: '#3B82F6',
  primarySoft: '#EFF6FF',
  primaryDark: '#2563EB',
  /** Deep navy used at the start of brand gradients */
  primaryDeep: '#1E3A5F',
  secondary: '#F97316',
  secondarySoft: '#FFF7ED',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  text: '#0F172A',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  border: '#E2E8F0',
  borderStrong: '#CBD5E1',
  success: '#16A34A',
  successSoft: '#F0FDF4',
  warning: '#F59E0B',
  warningSoft: '#FFFBEB',
  danger: '#EF4444',
  dangerSoft: '#FEF2F2',
  dangerBorder: '#FECACA',
  info: '#0EA5E9',
  infoSoft: '#F0F9FF',
  sidebar: '#0F172A',
  sidebarMuted: '#1E293B',
  sidebarHover: '#1E293B',
  sidebarActive: 'rgba(59, 130, 246, 0.22)',
  sidebarBorder: '#243044',
  sidebarText: '#E2E8F0',
  sidebarTextMuted: '#94A3B8',
  overlay: 'rgba(15, 23, 42, 0.58)',
  onBrand: '#FFFFFF',
  onBrandMuted: 'rgba(255,255,255,0.82)',
  onBrandSoft: 'rgba(255,255,255,0.18)',
  brandGlow: 'rgba(255,255,255,0.12)',
  brandStatBg: 'rgba(15, 23, 42, 0.22)',
  brandStatDivider: 'rgba(255,255,255,0.2)',
} as const;

/** Shared EM School brand gradient — use on all hero headers */
export const brandGradient = [
  colors.primaryDeep,
  colors.primaryDark,
  colors.primary,
] as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
} as const;

export const radii = {
  sm: 8,
  md: 10,
  lg: 12,
  xl: 16,
  full: 999,
} as const;

export const shadows = {
  sm: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
} as const;

export const fonts = {
  regular: 'Cairo_400Regular',
  medium: 'Cairo_500Medium',
  semiBold: 'Cairo_600SemiBold',
  bold: 'Cairo_700Bold',
} as const;
