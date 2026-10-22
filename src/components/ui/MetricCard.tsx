import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, spacing } from '@/theme/tokens';
import type { MetricCardData } from '@/types';
import { Card } from './Card';
import { Icon } from './Icon';

const accentMap = {
  primary: { bg: colors.primarySoft, icon: colors.primary },
  secondary: { bg: colors.secondarySoft, icon: colors.secondary },
  success: { bg: colors.successSoft, icon: colors.success },
  warning: { bg: colors.warningSoft, icon: colors.warning },
  danger: { bg: colors.dangerSoft, icon: colors.danger },
};

export function MetricCard({ data, compact }: { data: MetricCardData; compact?: boolean }) {
  const accent = accentMap[data.accent ?? 'primary'];
  const trendIcon =
    data.trend === 'up' ? 'ArrowUpRight' : data.trend === 'down' ? 'ArrowDownRight' : 'Minus';
  const trendColor =
    data.trend === 'up' ? colors.success : data.trend === 'down' ? colors.danger : colors.textMuted;

  return (
    <Card style={[styles.card, compact && styles.cardCompact]}>
      <View style={styles.top}>
        <View style={[styles.iconWrap, compact && styles.iconWrapCompact, { backgroundColor: accent.bg }]}>
          <Icon name={data.icon} size={compact ? 16 : 20} color={accent.icon} />
        </View>
        <View style={styles.trend}>
          <Icon name={trendIcon} size={compact ? 12 : 14} color={trendColor} />
        </View>
      </View>
      <Text style={[styles.label, compact && styles.labelCompact]} numberOfLines={2}>
        {data.label}
      </Text>
      <Text style={[styles.value, compact && styles.valueCompact]} numberOfLines={1}>
        {data.value}
      </Text>
      <Text style={[styles.delta, { color: trendColor }, compact && styles.deltaCompact]} numberOfLines={2}>
        {data.delta}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 160,
  },
  cardCompact: {
    minWidth: 0,
    padding: spacing.md,
  },
  top: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapCompact: {
    width: 32,
    height: 32,
    borderRadius: 10,
  },
  trend: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'right',
    marginBottom: 4,
    minHeight: 36,
  },
  labelCompact: {
    fontSize: 11,
    minHeight: 28,
    marginBottom: 2,
  },
  value: {
    fontFamily: fonts.bold,
    fontSize: 24,
    color: colors.text,
    textAlign: 'right',
    marginBottom: 4,
  },
  valueCompact: {
    fontSize: 18,
    marginBottom: 2,
  },
  delta: {
    fontFamily: fonts.regular,
    fontSize: 12,
    textAlign: 'right',
  },
  deltaCompact: {
    fontSize: 10,
  },
});
