import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Rect } from 'react-native-svg';
import { colors, fonts, radii, spacing } from '@/theme/tokens';
import { Card } from './Card';

interface BarPoint {
  label: string;
  value: number;
  secondary?: number;
}

export function BarChartCard({
  title,
  subtitle,
  data,
  dual,
}: {
  title: string;
  subtitle?: string;
  data: BarPoint[];
  dual?: boolean;
}) {
  const max = Math.max(...data.map((d) => Math.max(d.value, d.secondary ?? 0)), 1);

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      <View style={styles.chart}>
        {data.map((item) => (
          <View key={item.label} style={styles.barCol}>
            <View style={styles.bars}>
              {dual ? (
                <View
                  style={[
                    styles.bar,
                    {
                      height: `${(item.secondary! / max) * 100}%`,
                      backgroundColor: colors.secondary,
                      opacity: 0.85,
                    },
                  ]}
                />
              ) : null}
              <View
                style={[
                  styles.bar,
                  {
                    height: `${(item.value / max) * 100}%`,
                    backgroundColor: colors.primary,
                  },
                ]}
              />
            </View>
            <Text style={styles.barLabel}>{item.label}</Text>
          </View>
        ))}
      </View>
      {dual ? (
        <View style={styles.legend}>
          <LegendDot color={colors.primary} label="الإيرادات" />
          <LegendDot color={colors.secondary} label="المصروفات" />
        </View>
      ) : null}
    </Card>
  );
}

export function DonutChartCard({
  title,
  data,
}: {
  title: string;
  data: { label: string; value: number; color: string }[];
}) {
  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
  const size = 140;
  const stroke = 18;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.donutRow}>
        <Svg width={size} height={size}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={colors.border}
            strokeWidth={stroke}
            fill="none"
          />
          {data.map((slice) => {
            const length = (slice.value / total) * circumference;
            const cx = size / 2;
            const cy = size / 2;
            const circle = (
              <Circle
                key={slice.label}
                cx={cx}
                cy={cy}
                r={radius}
                stroke={slice.color}
                strokeWidth={stroke}
                fill="none"
                strokeDasharray={`${length} ${circumference - length}`}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
                transform={`rotate(-90 ${cx} ${cy})`}
              />
            );
            offset += length;
            return circle;
          })}
        </Svg>
        <View style={styles.donutLegend}>
          {data.map((slice) => (
            <View key={slice.label} style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: slice.color }]} />
              <Text style={styles.legendText}>
                {slice.label} — {slice.value}
                {total <= 100 ? '%' : ''}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </Card>
  );
}

export function MiniSparkline({ values, color = colors.primary }: { values: number[]; color?: string }) {
  const max = Math.max(...values, 1);
  const width = values.length * 10;
  return (
    <Svg width={width} height={28}>
      {values.map((v, i) => (
        <Rect
          key={i}
          x={i * 10}
          y={28 - (v / max) * 24}
          width={6}
          height={(v / max) * 24}
          rx={2}
          fill={color}
          opacity={0.85}
        />
      ))}
    </Svg>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 280,
  },
  title: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
    color: colors.text,
    textAlign: 'right',
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'right',
    marginBottom: spacing.lg,
  },
  chart: {
    height: 180,
    flexDirection: 'row-reverse',
    alignItems: 'flex-end',
    gap: 8,
    marginTop: spacing.md,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  bars: {
    flex: 1,
    width: '100%',
    flexDirection: 'row-reverse',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 3,
  },
  bar: {
    width: 10,
    borderTopLeftRadius: radii.sm,
    borderTopRightRadius: radii.sm,
    minHeight: 4,
  },
  barLabel: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.textMuted,
  },
  legend: {
    flexDirection: 'row-reverse',
    gap: spacing.lg,
    marginTop: spacing.lg,
  },
  donutRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.xl,
    marginTop: spacing.lg,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  donutLegend: {
    gap: spacing.sm,
  },
  legendItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.textSecondary,
  },
});
