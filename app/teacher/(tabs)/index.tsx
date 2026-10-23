import { useCallback, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { Avatar, Icon } from '@/components/ui';
import { FadeIn, LoadingBlock, rowRtl } from '@/components/teacher/ui';
import { teacherTheme as t } from '@/components/teacher/theme';
import { useAuth } from '@/auth/AuthContext';
import { getTeacherClasses, getTeacherDashboard } from '@/api/teacherPortal';
import type { TeacherClass, TeacherDashboardData } from '@/types/teacherPortal';

const ACTIONS = [
  {
    key: 'lesson',
    title: 'درس جديد',
    sub: 'فيديو أو PDF للطلاب',
    icon: 'BookOpen',
    href: '/teacher/lesson/new',
    tint: t.brandSoft,
    color: t.brand,
  },
  {
    key: 'exam',
    title: 'اختبار',
    sub: 'اختيار من متعدد أو مقالي',
    icon: 'ClipboardList',
    href: '/teacher/exam/new',
    tint: t.accentSoft,
    color: t.accent,
  },
  {
    key: 'task',
    title: 'واجب',
    sub: 'درجات وملاحظات',
    icon: 'FileText',
    href: '/teacher/task/new',
    tint: t.warningSoft,
    color: t.warning,
  },
  {
    key: 'classes',
    title: 'صفوفي',
    sub: 'الطلاب والجدول',
    icon: 'Users',
    href: '/teacher/classes',
    tint: '#EDE9FE',
    color: '#7C3AED',
  },
] as const;

export default function TeacherHomeTab() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const [data, setData] = useState<TeacherDashboardData | null>(null);
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (soft?: boolean) => {
    if (!soft) setLoading(true);
    try {
      const [dash, cls] = await Promise.all([
        getTeacherDashboard(),
        getTeacherClasses().catch(() => ({ classes: [] as TeacherClass[] })),
      ]);
      setData(dash);
      setClasses(cls.classes.slice(0, 3));
    } catch {
      setData(null);
      setClasses([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const name = user?.name || 'معلّم';
  const first = name.split(' ')[0];
  const school = data?.school?.name || 'مدرستي';

  return (
    <View style={styles.root}>
      <View style={styles.bgBlob} />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            wide && styles.contentWide,
            { maxWidth: wide ? 920 : undefined, alignSelf: 'center', width: '100%' },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load(true);
              }}
              tintColor={t.brand}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          <FadeIn>
            <View style={[styles.topBar, { flexDirection: rowRtl as 'row' }]}>
              <View style={[styles.identity, { flexDirection: rowRtl as 'row' }]}>
                <View style={styles.avatarRing}>
                  <Avatar name={name} size={48} color={t.brand} />
                </View>
                <View style={styles.identityText}>
                  <Text style={styles.hello}>أهلاً، أستاذ {first}</Text>
                  <View style={[styles.schoolChip, { flexDirection: rowRtl as 'row' }]}>
                    <Icon name="School" size={12} color={t.brand} />
                    <Text style={styles.schoolText}>{school}</Text>
                  </View>
                </View>
              </View>
              <Pressable
                accessibilityLabel="تسجيل الخروج"
                onPress={async () => {
                  await logout();
                  router.replace('/login' as never);
                }}
                style={({ pressed }) => [styles.logoutBtn, pressed && { opacity: 0.85 }]}
              >
                <Icon name="LogOut" size={18} color={t.inkSoft} />
              </Pressable>
            </View>
          </FadeIn>

          {loading || !data ? (
            <LoadingBlock />
          ) : (
            <>
              <FadeIn delay={60}>
                <LinearGradient
                  colors={[...t.heroGradient]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.banner}
                >
                  <Text style={styles.bannerEyebrow}>مساحة العمل اليوم</Text>
                  <Text style={styles.bannerTitle}>ماذا تريد أن تنجز؟</Text>
                  <Text style={styles.bannerSub}>
                    أنشئ درساً، اختبر طلابك، أو صحّح واجباً — بخطوات بسيطة
                  </Text>
                </LinearGradient>
              </FadeIn>

              <FadeIn delay={100}>
                <View style={[styles.statsRow, { flexDirection: rowRtl as 'row' }]}>
                  <StatMini label="صفوف" value={data.stats.classes} />
                  <StatMini label="دروس" value={data.stats.lessons} />
                  <StatMini label="اختبارات" value={data.stats.exams} />
                  <StatMini label="واجبات" value={data.stats.tasks} />
                </View>
              </FadeIn>

              <FadeIn delay={140}>
                <Text style={styles.section}>إجراءات سريعة</Text>
                <View style={[styles.actionsGrid, { flexDirection: rowRtl as 'row' }]}>
                  {ACTIONS.map((a, i) => (
                    <MotiView
                      key={a.key}
                      from={{ opacity: 0, translateY: 8 }}
                      animate={{ opacity: 1, translateY: 0 }}
                      transition={{ type: 'timing', duration: 260, delay: i * 40 }}
                      style={styles.actionWrap}
                    >
                      <Pressable
                        onPress={() => router.push(a.href as never)}
                        style={({ pressed }) => [
                          styles.actionCard,
                          pressed && styles.actionPressed,
                        ]}
                      >
                        <View style={[styles.actionIcon, { backgroundColor: a.tint }]}>
                          <Icon name={a.icon} size={22} color={a.color} />
                        </View>
                        <Text style={styles.actionTitle}>{a.title}</Text>
                        <Text style={styles.actionSub}>{a.sub}</Text>
                        <View style={[styles.actionGo, { flexDirection: rowRtl as 'row' }]}>
                          <Text style={[styles.actionGoText, { color: a.color }]}>افتح</Text>
                          <Icon name="ChevronLeft" size={14} color={a.color} />
                        </View>
                      </Pressable>
                    </MotiView>
                  ))}
                </View>
              </FadeIn>

              <FadeIn delay={200}>
                <View style={[styles.sectionRow, { flexDirection: rowRtl as 'row' }]}>
                  <Text style={styles.section}>صفوفي</Text>
                  <Pressable onPress={() => router.push('/teacher/classes' as never)}>
                    <Text style={styles.linkAll}>عرض الكل</Text>
                  </Pressable>
                </View>

                {classes.length === 0 ? (
                  <View style={styles.emptyClass}>
                    <Icon name="CalendarDays" size={22} color={t.brand} />
                    <Text style={styles.emptyTitle}>لا صفوف معيّنة بعد</Text>
                    <Text style={styles.emptySub}>
                      عند نشر جدول يضم حصصك ستظهر هنا تلقائياً
                    </Text>
                  </View>
                ) : (
                  classes.map((c) => (
                    <Pressable
                      key={`${c.classroom_id}-${c.subject_id}`}
                      onPress={() =>
                        router.push(
                          `/teacher/class/${c.classroom_id}?subject_id=${c.subject_id}` as never,
                        )
                      }
                      style={({ pressed }) => [
                        styles.classCard,
                        pressed && { opacity: 0.92 },
                      ]}
                    >
                      <View style={[styles.classRow, { flexDirection: rowRtl as 'row' }]}>
                        <View style={styles.classIcon}>
                          <Icon name="GraduationCap" size={20} color={t.brand} />
                        </View>
                        <View style={{ flex: 1, gap: 2 }}>
                          <Text style={styles.classTitle}>
                            {c.grade_name} · {c.classroom_name}
                          </Text>
                          <Text style={styles.classSub}>{c.subject_name}</Text>
                        </View>
                        <View style={styles.classMeta}>
                          <Text style={styles.classMetaNum}>{c.students_count}</Text>
                          <Text style={styles.classMetaLabel}>طالب</Text>
                        </View>
                        <Icon name="ChevronLeft" size={18} color={t.inkMute} />
                      </View>
                    </Pressable>
                  ))
                )}
              </FadeIn>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function StatMini({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statMini}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: t.canvas },
  bgBlob: {
    position: 'absolute',
    top: -80,
    end: -40,
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: t.canvasTint,
    opacity: 0.9,
  },
  safe: { flex: 1 },
  content: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 120, gap: 16 },
  contentWide: { paddingHorizontal: 28 },
  topBar: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  identity: { alignItems: 'center', gap: 12, flex: 1 },
  avatarRing: {
    borderRadius: 999,
    borderWidth: 2,
    borderColor: t.brandSoft,
    padding: 2,
  },
  identityText: { flex: 1, gap: 4 },
  hello: {
    fontFamily: t.fonts.bold,
    fontSize: 20,
    color: t.ink,
    writingDirection: 'rtl',
  },
  schoolChip: {
    alignSelf: 'flex-start',
    alignItems: 'center',
    gap: 5,
    backgroundColor: t.brandSoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  schoolText: {
    fontFamily: t.fonts.semiBold,
    fontSize: 12,
    color: t.brandDeep,
    writingDirection: 'rtl',
  },
  logoutBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: t.card,
    borderWidth: 1,
    borderColor: t.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  banner: {
    borderRadius: t.radius.xl,
    padding: 20,
    overflow: 'hidden',
    ...t.shadow.card,
  },
  bannerEyebrow: {
    fontFamily: t.fonts.medium,
    fontSize: 12,
    color: 'rgba(255,255,255,0.78)',
    writingDirection: 'rtl',
    marginBottom: 6,
  },
  bannerTitle: {
    fontFamily: t.fonts.bold,
    fontSize: 22,
    color: '#fff',
    writingDirection: 'rtl',
  },
  bannerSub: {
    marginTop: 6,
    fontFamily: t.fonts.regular,
    fontSize: 13,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.88)',
    writingDirection: 'rtl',
  },
  statsRow: {
    backgroundColor: t.card,
    borderRadius: t.radius.lg,
    borderWidth: 1,
    borderColor: t.line,
    paddingVertical: 14,
    paddingHorizontal: 8,
    ...t.shadow.card,
  },
  statMini: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: {
    fontFamily: t.fonts.bold,
    fontSize: 20,
    color: t.ink,
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontFamily: t.fonts.medium,
    fontSize: 11,
    color: t.inkMute,
    writingDirection: 'rtl',
  },
  section: {
    fontFamily: t.fonts.bold,
    fontSize: 16,
    color: t.ink,
    writingDirection: 'rtl',
    marginBottom: 10,
  },
  sectionRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  linkAll: {
    fontFamily: t.fonts.semiBold,
    fontSize: 13,
    color: t.brand,
    writingDirection: 'rtl',
  },
  actionsGrid: {
    flexWrap: 'wrap',
    gap: 12,
  },
  actionWrap: {
    width: '47%',
    flexGrow: 1,
    flexBasis: '47%',
    minWidth: 150,
  },
  actionCard: {
    backgroundColor: t.card,
    borderRadius: t.radius.lg,
    borderWidth: 1,
    borderColor: t.line,
    padding: 16,
    gap: 6,
    minHeight: 132,
    ...t.shadow.card,
  },
  actionPressed: {
    transform: [{ scale: 0.98 }],
    borderColor: t.brandSoft,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  actionTitle: {
    fontFamily: t.fonts.bold,
    fontSize: 15,
    color: t.ink,
    writingDirection: 'rtl',
  },
  actionSub: {
    fontFamily: t.fonts.regular,
    fontSize: 12,
    color: t.inkSoft,
    writingDirection: 'rtl',
    lineHeight: 18,
  },
  actionGo: {
    marginTop: 8,
    alignItems: 'center',
    gap: 2,
  },
  actionGoText: {
    fontFamily: t.fonts.semiBold,
    fontSize: 12,
  },
  classCard: {
    backgroundColor: t.card,
    borderRadius: t.radius.lg,
    borderWidth: 1,
    borderColor: t.line,
    padding: 14,
    marginBottom: 10,
    ...t.shadow.card,
  },
  classRow: { alignItems: 'center', gap: 12 },
  classIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: t.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  classTitle: {
    fontFamily: t.fonts.bold,
    fontSize: 14,
    color: t.ink,
    writingDirection: 'rtl',
  },
  classSub: {
    fontFamily: t.fonts.medium,
    fontSize: 12,
    color: t.brand,
    writingDirection: 'rtl',
  },
  classMeta: { alignItems: 'center', minWidth: 40 },
  classMetaNum: {
    fontFamily: t.fonts.bold,
    fontSize: 16,
    color: t.ink,
    fontVariant: ['tabular-nums'],
  },
  classMetaLabel: {
    fontFamily: t.fonts.regular,
    fontSize: 10,
    color: t.inkMute,
  },
  emptyClass: {
    backgroundColor: t.card,
    borderRadius: t.radius.lg,
    borderWidth: 1,
    borderColor: t.line,
    padding: 22,
    alignItems: 'center',
    gap: 6,
  },
  emptyTitle: {
    fontFamily: t.fonts.bold,
    fontSize: 14,
    color: t.ink,
    writingDirection: 'rtl',
  },
  emptySub: {
    fontFamily: t.fonts.regular,
    fontSize: 12,
    color: t.inkSoft,
    textAlign: 'center',
    writingDirection: 'rtl',
    lineHeight: 18,
  },
});
