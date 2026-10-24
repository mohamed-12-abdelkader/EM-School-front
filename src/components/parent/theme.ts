import { colors } from '@/theme/tokens';
import { studentTheme } from '@/components/student/theme';

/** Parent portal shares Clast operate surface with student (admin brand blue). */
export const parentTheme = {
  ...studentTheme,
  /** Guardian accent aligned with admin primary */
  guardian: colors.primary,
  guardianSoft: colors.primarySoft,
  guardianDeep: colors.primaryDeep,
} as const;
