import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { MotiView } from 'moti';
import { Icon } from '@/components/ui';
import {
  FadeIn,
  formatShortDate,
  rowRtl,
} from '@/components/student/ui';
import { attendanceStatusLabel } from '@/services/parentPortal';
import type { AttendanceStatus } from '@/types/parentPortal';
import { parentTheme as t } from './theme';

export { FadeIn, formatShortDate, rowRtl };

export function LoadingBlock({ label = 'جارٍ التحميل...' }: { label?: string }) {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={t.guardian} size="large" />
      <Text style={styles.loadingText}>{label}</Text>
    </View>
  );
}

export function percentTone(p: number) {
  if (p >= 85) return { color: t.success, soft: t.successSoft };
  if (p >= 60) return { color: t.sky, soft: t.skySoft };
  if (p >= 40) return { color: t.warning, soft: t.warningSoft };
  return { color: t.danger, soft: t.dangerSoft };
}

export function attendanceTone(status: AttendanceStatus | string) {
  switch (status) {
    case 'present':
      return { color: t.success, soft: t.successSoft };
    case 'late':
      return { color: t.warning, soft: t.warningSoft };
    case 'excused':
      return { color: t.sky, soft: t.skySoft };
    default:
      return { color: t.danger, soft: t.dangerSoft };
  }
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = 'brand',
  delay = 0,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: string;
  tone?: 'brand' | 'success' | 'warning' | 'danger' | 'guardian';
  delay?: number;
}) {
  const colors =
    tone === 'success'
      ? { fg: t.success, bg: t.successSoft }
      : tone === 'warning'
        ? { fg: t.warning, bg: t.warningSoft }
        : tone === 'danger'
          ? { fg: t.danger, bg: t.dangerSoft }
          : tone === 'guardian'
            ? { fg: t.guardian, bg: t.guardianSoft }
            : { fg: t.brand, bg: t.brandSoft };

  return (
    <FadeIn delay={delay} style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: colors.bg }]}>
        <Icon name={icon} size={18} color={colors.fg} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {hint ? <Text style={styles.statHint}>{hint}</Text> : null}
    </FadeIn>
  );
}

export function RateRing({
  percent,
  label,
  size = 112,
}: {
  percent: number;
  label: string;
  size?: number;
}) {
  const tone = percentTone(percent);
  const clamped = Math.max(0, Math.min(100, percent || 0));

  return (
    <View style={[styles.ringWrap, { width: size, height: size }]}>
      <View
        style={[
          styles.ringOuter,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: tone.soft,
          },
        ]}
      />
      <MotiView
        from={{ opacity: 0.4 }}
        animate={{ opacity: 1 }}
        transition={{ type: 'timing', duration: 500 }}
        style={[
          styles.ringProgress,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: tone.color,
            // Approximate fill via thicker border when high; visual cue only
            borderWidth: clamped > 0 ? 8 : 4,
          },
        ]}
      />
      <View style={styles.ringInner}>
        <Text style={[styles.ringValue, { color: tone.color }]}>
          {Math.round(clamped)}%
        </Text>
        <Text style={styles.ringLabel}>{label}</Text>
      </View>
    </View>
  );
}

export function StatusPill({ status }: { status: AttendanceStatus | string }) {
  const tone = attendanceTone(status);
  return (
    <View style={[styles.pill, { backgroundColor: tone.soft }]}>
      <Text style={[styles.pillText, { color: tone.color }]}>
        {attendanceStatusLabel[status] || status}
      </Text>
    </View>
  );
}

export function SectionHeader({
  title,
  action,
}: {
  title: string;
  action?: ReactNode;
}) {
  return (
    <View style={[styles.sectionHead, { flexDirection: rowRtl as 'row' }]}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action}
    </View>
  );
}

export function EmptyHint({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    paddingVertical: 48,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontFamily: t.fonts.medium,
    fontSize: 14,
    color: t.inkMute,
  },
  statCard: {
    flex: 1,
    minWidth: 140,
    backgroundColor: t.card,
    borderRadius: t.radius.lg,
    borderWidth: 1,
    borderColor: t.line,
    padding: 14,
    gap: 6,
    ...t.shadow.card,
  },
  statIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
  },
  statValue: {
    fontFamily: t.fonts.bold,
    fontSize: 22,
    color: t.ink,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontFamily: t.fonts.medium,
    fontSize: 13,
    color: t.inkSoft,
    textAlign: 'right',
  },
  statHint: {
    fontFamily: t.fonts.regular,
    fontSize: 11,
    color: t.inkMute,
    textAlign: 'right',
  },
  ringWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringOuter: {
    position: 'absolute',
    borderWidth: 8,
  },
  ringProgress: {
    position: 'absolute',
  },
  ringInner: {
    alignItems: 'center',
    gap: 2,
  },
  ringValue: {
    fontFamily: t.fonts.bold,
    fontSize: 26,
    fontVariant: ['tabular-nums'],
  },
  ringLabel: {
    fontFamily: t.fonts.medium,
    fontSize: 12,
    color: t.inkMute,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: t.radius.full,
  },
  pillText: {
    fontFamily: t.fonts.semiBold,
    fontSize: 12,
  },
  sectionHead: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginTop: 8,
  },
  sectionTitle: {
    fontFamily: t.fonts.bold,
    fontSize: 16,
    color: t.ink,
    textAlign: 'right',
  },
  empty: {
    backgroundColor: t.cardMuted,
    borderRadius: t.radius.lg,
    padding: 18,
    gap: 6,
  },
  emptyTitle: {
    fontFamily: t.fonts.semiBold,
    fontSize: 14,
    color: t.ink,
    textAlign: 'right',
  },
  emptyBody: {
    fontFamily: t.fonts.regular,
    fontSize: 13,
    color: t.inkSoft,
    textAlign: 'right',
    lineHeight: 20,
  },
});
