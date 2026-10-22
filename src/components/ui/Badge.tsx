import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { colors, fonts, radii, spacing } from '@/theme/tokens';
import type { StatusTone } from '@/types';

const toneStyles: Record<StatusTone, { bg: string; text: string }> = {
  success: { bg: colors.successSoft, text: colors.success },
  warning: { bg: colors.warningSoft, text: colors.warning },
  danger: { bg: colors.dangerSoft, text: colors.danger },
  info: { bg: colors.infoSoft, text: colors.info },
  primary: { bg: colors.primarySoft, text: colors.primary },
  secondary: { bg: colors.secondarySoft, text: colors.secondary },
  neutral: { bg: '#F1F5F9', text: colors.textSecondary },
};

interface BadgeProps {
  label: string;
  tone?: StatusTone;
  style?: ViewStyle;
}

export function Badge({ label, tone = 'neutral', style }: BadgeProps) {
  const t = toneStyles[tone];
  return (
    <View style={[styles.base, { backgroundColor: t.bg }, style]}>
      <Text style={[styles.text, { color: t.text }]}>{label}</Text>
    </View>
  );
}

export function statusTone(status: string): StatusTone {
  const map: Record<string, StatusTone> = {
    نشط: 'success',
    حاضر: 'success',
    مدفوع: 'success',
    'تم الحل': 'success',
    معتمد: 'success',
    متأخر: 'danger',
    غائب: 'danger',
    موقوف: 'danger',
    عاجل: 'danger',
    عالي: 'danger',
    جزئي: 'warning',
    معلق: 'warning',
    إجازة: 'warning',
    بعذر: 'info',
    'قيد المراجعة': 'info',
    'جارٍ المعالجة': 'primary',
    جديد: 'secondary',
    متوسط: 'warning',
    منخفض: 'neutral',
    مغلق: 'neutral',
    تعارض: 'danger',
    مقروء: 'neutral',
  };
  return map[status] ?? 'neutral';
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radii.full,
  },
  text: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
  },
});
