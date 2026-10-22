import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Badge, Card, Icon } from '@/components/ui';
import {
  dashboardMetrics,
  overduePayments,
  todayAttendanceSummary,
  upcomingEvents,
} from '@/data/mock';
import { colors, fonts, radii, spacing } from '@/theme/tokens';
import { formatCurrency, formatNumber } from '@/utils/format';
import { currentUser } from '@/navigation/navConfig';

const quickActions = [
  { label: 'حضور', href: '/attendance', icon: 'ClipboardCheck', color: colors.success },
  { label: 'طلاب', href: '/students', icon: 'GraduationCap', color: colors.primary },
  { label: 'دفعة', href: '/installments', icon: 'Receipt', color: colors.secondary },
  { label: 'شكاوى', href: '/complaints', icon: 'MessageCircleWarning', color: colors.danger },
];

const mobileKpis = [
  dashboardMetrics.find((m) => m.id === 'students')!,
  dashboardMetrics.find((m) => m.id === 'attendance')!,
  dashboardMetrics.find((m) => m.id === 'overdue')!,
  dashboardMetrics.find((m) => m.id === 'complaints')!,
];

export function MobileDashboard() {
  const router = useRouter();

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.hello}>
        <Text style={styles.helloEyebrow}>اليوم · ٢٠٢٥ / ٢٠٢٦</Text>
        <Text style={styles.helloTitle}>مرحباً، {currentUser.name.replace('أ. ', '')}</Text>
        <Text style={styles.helloSub}>ملخص سريع لأهم أعمال المدرسة اليوم</Text>
      </View>

      <View style={styles.kpiList}>
        {mobileKpis.map((kpi) => {
          const accent = accentColor(kpi.accent);
          return (
            <Pressable
              key={kpi.id}
              style={styles.kpiRow}
              onPress={() => {
                if (kpi.id === 'students') router.push('/students');
                else if (kpi.id === 'attendance') router.push('/attendance');
                else if (kpi.id === 'overdue') router.push('/overdue');
                else if (kpi.id === 'complaints') router.push('/complaints');
              }}
            >
              <View style={[styles.kpiIcon, { backgroundColor: accent.bg }]}>
                <Icon name={kpi.icon} size={18} color={accent.fg} />
              </View>
              <View style={styles.kpiText}>
                <Text style={styles.kpiLabel}>{kpi.label}</Text>
                <Text style={styles.kpiHint} numberOfLines={1}>
                  {kpi.delta}
                </Text>
              </View>
              <Text style={styles.kpiValue}>{kpi.value}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.sectionLabel}>إجراءات سريعة</Text>
      <View style={styles.actions}>
        {quickActions.map((action) => (
          <Pressable
            key={action.href}
            style={styles.actionBtn}
            onPress={() => router.push(action.href as never)}
          >
            <View style={[styles.actionIcon, { backgroundColor: `${action.color}18` }]}>
              <Icon name={action.icon} size={20} color={action.color} />
            </View>
            <Text style={styles.actionLabel}>{action.label}</Text>
          </Pressable>
        ))}
      </View>

      <Card style={styles.card}>
        <View style={styles.cardHead}>
          <Text style={styles.cardTitle}>حضور اليوم</Text>
          <Pressable onPress={() => router.push('/attendance')}>
            <Text style={styles.link}>تسجيل</Text>
          </Pressable>
        </View>
        <View style={styles.attRow}>
          {todayAttendanceSummary.map((item) => (
            <View key={item.id} style={styles.attCell}>
              <Text style={[styles.attNum, { color: toneFg(item.tone) }]}>
                {formatNumber(item.value)}
              </Text>
              <Text style={styles.attLabel}>{item.label}</Text>
            </View>
          ))}
        </View>
      </Card>

      <Card style={styles.card}>
        <View style={styles.cardHead}>
          <Text style={styles.cardTitle}>قادم قريباً</Text>
          <Pressable onPress={() => router.push('/calendar')}>
            <Text style={styles.link}>التقويم</Text>
          </Pressable>
        </View>
        {upcomingEvents.slice(0, 3).map((event, index) => (
          <View
            key={event.id}
            style={[styles.listRow, index === upcomingEvents.slice(0, 3).length - 1 && styles.listRowLast]}
          >
            <View style={styles.listText}>
              <Text style={styles.listTitle} numberOfLines={1}>
                {event.title}
              </Text>
              <Text style={styles.listMeta}>{event.date}</Text>
            </View>
            <Badge
              label={event.type}
              tone={
                event.type === 'امتحان'
                  ? 'primary'
                  : event.type === 'مالي'
                    ? 'secondary'
                    : event.type === 'اجتماع'
                      ? 'info'
                      : 'success'
              }
            />
          </View>
        ))}
      </Card>

      <Card style={styles.card}>
        <View style={styles.cardHead}>
          <Text style={styles.cardTitle}>مستحقات عاجلة</Text>
          <Pressable onPress={() => router.push('/overdue')}>
            <Text style={styles.link}>الكل</Text>
          </Pressable>
        </View>
        {overduePayments.slice(0, 3).map((item, index) => (
          <View
            key={item.id}
            style={[styles.listRow, index === 2 && styles.listRowLast]}
          >
            <View style={styles.listText}>
              <Text style={styles.listTitle} numberOfLines={1}>
                {item.student}
              </Text>
              <Text style={styles.listMeta}>استحقاق {item.due}</Text>
            </View>
            <Text style={styles.money}>{formatCurrency(item.amount)}</Text>
          </View>
        ))}
      </Card>

      <Pressable style={styles.addStudent} onPress={() => router.push('/students/create')}>
        <Icon name="UserPlus" size={18} color="#fff" />
        <Text style={styles.addStudentText}>إضافة طالب جديد</Text>
      </Pressable>
    </ScrollView>
  );
}

function accentColor(accent?: string) {
  const map: Record<string, { bg: string; fg: string }> = {
    primary: { bg: colors.primarySoft, fg: colors.primary },
    secondary: { bg: colors.secondarySoft, fg: colors.secondary },
    success: { bg: colors.successSoft, fg: colors.success },
    warning: { bg: colors.warningSoft, fg: colors.warning },
    danger: { bg: colors.dangerSoft, fg: colors.danger },
  };
  return map[accent ?? 'primary'] ?? map.primary;
}

function toneFg(tone: string) {
  const map: Record<string, string> = {
    success: colors.success,
    danger: colors.danger,
    warning: colors.warning,
    info: colors.info,
  };
  return map[tone] ?? colors.text;
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: 120,
    gap: spacing.lg,
  },
  hello: {
    gap: 4,
  },
  helloEyebrow: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.primary,
    textAlign: 'right',
  },
  helloTitle: {
    fontFamily: fonts.bold,
    fontSize: 24,
    color: colors.text,
    textAlign: 'right',
  },
  helloSub: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'right',
    lineHeight: 20,
  },
  kpiList: {
    gap: spacing.sm,
  },
  kpiRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  kpiIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiText: {
    flex: 1,
    gap: 2,
  },
  kpiLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: colors.text,
    textAlign: 'right',
  },
  kpiHint: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'right',
  },
  kpiValue: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.text,
  },
  sectionLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: colors.text,
    textAlign: 'right',
    marginBottom: -4,
  },
  actions: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    paddingVertical: spacing.md,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    color: colors.text,
  },
  card: {
    gap: 0,
    paddingVertical: spacing.md,
  },
  cardHead: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingHorizontal: 4,
  },
  cardTitle: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.text,
    textAlign: 'right',
  },
  link: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: colors.primary,
  },
  attRow: {
    flexDirection: 'row-reverse',
    backgroundColor: colors.background,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  attCell: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  attNum: {
    fontFamily: fonts.bold,
    fontSize: 18,
  },
  attLabel: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.textSecondary,
  },
  listRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  listRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 4,
  },
  listText: {
    flex: 1,
    gap: 2,
  },
  listTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: colors.text,
    textAlign: 'right',
  },
  listMeta: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'right',
  },
  money: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.danger,
  },
  addStudent: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radii.xl,
    minHeight: 52,
  },
  addStudentText: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: '#FFFFFF',
  },
});
