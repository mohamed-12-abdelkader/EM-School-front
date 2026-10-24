import { studentTheme } from '@/components/student/theme';

/** Parent portal shares Clast operate surface with student (light EdTech). */
export const parentTheme = {
  ...studentTheme,
  /** Warm teal accent for guardian context (distinct from student indigo-only) */
  guardian: '#0D9488',
  guardianSoft: '#F0FDFA',
  guardianDeep: '#0F766E',
} as const;
