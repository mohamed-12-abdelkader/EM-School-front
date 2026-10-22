import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Badge,
  BarChartCard,
  Button,
  Card,
  DonutChartCard,
  Icon,
  MetricCard,
  PageHeader,
  useToast,
} from '@/components/ui';
import { MobileDashboard } from '@/components/modules/MobileDashboard';
import {
  attendanceWeekly,
  dashboardMetrics,
  enrollmentGrowth,
  feeCollection,
  gradeDistribution,
  overduePayments,
  recentActivity,
  revenueVsExpenses,
  upcomingEvents,
} from '@/data/mock';
import { colors, fonts, radii, spacing } from '@/theme/tokens';
import { useBreakpoint } from '@/hooks/useBreakpoint';

export default function DashboardHome() {
  const router = useRouter();
  const { showToast } = useToast();
  const { isMobile } = useBreakpoint();

  if (isMobile) {
    return <MobileDashboard />;
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <PageHeader
        title="لوحة التحكم"
        subtitle="نظرة شاملة على أداء مدارس EM الخاصة — العام الدراسي ٢٠٢٥ / ٢٠٢٦"
        breadcrumbs={['الرئيسية', 'لوحة التحكم']}
        actions={
          <>
            <Button
              label="إشعار لأولياء الأمور"
              icon="MessageSquare"
              variant="outline"
              onPress={() => {
                showToast('تم فتح محرر الإشعارات (واجهة تجريبية)', 'info');
                router.push('/parent-messages');
              }}
            />
            <Button label="إضافة طالب" icon="UserPlus" onPress={() => router.push('/students/create')} />
          </>
        }
      />

      <View style={styles.metrics}>
        {dashboardMetrics.map((metric) => (
          <View key={metric.id} style={styles.metricItem}>
            <MetricCard data={metric} />
          </View>
        ))}
      </View>

      <View style={styles.chartsRow}>
        <BarChartCard
          title="نمو تسجيل الطلاب"
          subtitle="عدد الطلاب المسجلين خلال الأشهر الماضية"
          data={enrollmentGrowth}
        />
        <BarChartCard
          title="الإيرادات مقابل المصروفات"
          subtitle="بالألف جنيه مصري"
          data={revenueVsExpenses.map((d) => ({
            label: d.label,
            value: d.revenue,
            secondary: d.expenses,
          }))}
          dual
        />
      </View>

      <View style={styles.chartsRow}>
        <BarChartCard title="نسبة الحضور الأسبوعي" data={attendanceWeekly} />
        <DonutChartCard title="توزيع الطلاب حسب المرحلة" data={gradeDistribution} />
        <DonutChartCard title="تقدم تحصيل المصروفات" data={feeCollection} />
      </View>

      <View style={styles.opsRow}>
        <Card style={styles.opsCard}>
          <View style={styles.cardHead}>
            <Text style={styles.cardTitle}>المواعيد القادمة</Text>
            <Button label="التقويم" variant="ghost" size="sm" onPress={() => router.push('/calendar')} />
          </View>
          {upcomingEvents.map((event) => (
            <View key={event.id} style={styles.listItem}>
              <View style={styles.listText}>
                <Text style={styles.itemTitle}>{event.title}</Text>
                <Text style={styles.itemMeta}>{event.date}</Text>
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

        <Card style={styles.opsCard}>
          <View style={styles.cardHead}>
            <Text style={styles.cardTitle}>مستحقات تحتاج متابعة</Text>
            <Button label="الكل" variant="ghost" size="sm" onPress={() => router.push('/overdue')} />
          </View>
          {overduePayments.map((item) => (
            <View key={item.id} style={styles.listItem}>
              <View style={styles.listText}>
                <Text style={styles.itemTitle}>{item.student}</Text>
                <Text style={styles.itemMeta}>استحقاق: {item.due}</Text>
              </View>
              <Text style={styles.amount}>{item.amount.toLocaleString('ar-EG')} ج.م</Text>
            </View>
          ))}
        </Card>

        <Card style={styles.opsCard}>
          <View style={styles.cardHead}>
            <Text style={styles.cardTitle}>النشاط الإداري الأخير</Text>
          </View>
          {recentActivity.map((item) => (
            <View key={item.id} style={styles.activityItem}>
              <View style={[styles.dot, { backgroundColor: toneColor(item.tone) }]} />
              <View style={styles.listText}>
                <Text style={styles.itemTitle}>{item.title}</Text>
                <Text style={styles.itemMeta}>{item.detail}</Text>
                <Text style={styles.time}>{item.time}</Text>
              </View>
            </View>
          ))}
        </Card>
      </View>

      <Card>
        <Text style={styles.cardTitle}>إجراءات سريعة</Text>
        <View style={styles.quickActions}>
          {[
            { label: 'تسجيل دفعة', href: '/installments', icon: 'Receipt' },
            { label: 'إنشاء فصل', href: '/classes', icon: 'School' },
            { label: 'تسجيل حضور', href: '/attendance', icon: 'ClipboardCheck' },
            { label: 'شكوى جديدة', href: '/complaints', icon: 'MessageCircleWarning' },
          ].map((action) => (
            <Pressable
              key={action.href}
              style={styles.quickBtn}
              onPress={() => router.push(action.href as never)}
            >
              <Icon name={action.icon} size={18} color={colors.primary} />
              <Text style={styles.quickLabel}>{action.label}</Text>
            </Pressable>
          ))}
        </View>
      </Card>
    </ScrollView>
  );
}

function toneColor(tone: string) {
  const map: Record<string, string> = {
    success: colors.success,
    primary: colors.primary,
    warning: colors.warning,
    info: colors.info,
  };
  return map[tone] ?? colors.primary;
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing['2xl'], paddingBottom: spacing['4xl'], gap: spacing.xl },
  metrics: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: spacing.lg },
  metricItem: { flexGrow: 1, flexBasis: 220, maxWidth: '100%' },
  chartsRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: spacing.lg },
  opsRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: spacing.lg },
  opsCard: { flex: 1, minWidth: 280 },
  cardHead: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
    color: colors.text,
    textAlign: 'right',
    marginBottom: spacing.sm,
  },
  listItem: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  listText: { flex: 1, gap: 2 },
  itemTitle: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.text, textAlign: 'right' },
  itemMeta: { fontFamily: fonts.regular, fontSize: 12, color: colors.textSecondary, textAlign: 'right' },
  amount: { fontFamily: fonts.bold, fontSize: 13, color: colors.danger },
  activityItem: {
    flexDirection: 'row-reverse',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 6 },
  time: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted, textAlign: 'right' },
  quickActions: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: spacing.md },
  quickBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  quickLabel: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.text },
});
