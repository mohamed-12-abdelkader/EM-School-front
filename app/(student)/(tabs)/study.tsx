import { useCallback, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { Avatar, Badge, EmptyState, Icon } from '@/components/ui';
import {
  FadeIn,
  IconBadge,
  LoadingBlock,
  ProgressBar,
  rowRtl,
} from '@/components/student/ui';
import { studentTheme as t } from '@/components/student/theme';
import { ApiError } from '@/api/client';
import { getStudentSubjects, getTeacher } from '@/services/studentPortal';
import type { StudentSubject } from '@/types/studentPortal';

const SHORTCUTS = [
  { label: 'واجبات', icon: 'FileText', href: '/(student)/assignments', color: t.warning, bg: t.accentSoft },
  { label: 'امتحانات', icon: 'ClipboardList', href: '/(student)/exams', color: t.sky, bg: t.skySoft },
  { label: 'دروس', icon: 'Play', href: '/(student)/lectures', color: t.brand, bg: t.brandSoft },
  { label: 'نتائج', icon: 'Trophy', href: '/(student)/results', color: t.success, bg: t.successSoft },
  { label: 'الجدول', icon: 'CalendarClock', href: '/(student)/timetable', color: t.brand, bg: t.brandSoft },
  { label: 'إشعارات', icon: 'Bell', href: '/(student)/notifications', color: t.danger, bg: '#FFF1F2' },
] as const;

export default function StudyTab() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const wide = width >= 720;
  const [subjects, setSubjects] = useState<StudentSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (soft?: boolean) => {
    if (!soft) setLoading(true);
    setError(null);
    try {
      setSubjects(await getStudentSubjects());
    } catch (err) {
      setSubjects([]);
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'تعذر تحميل المواد',
      );
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

  return (
    <View style={styles.root}>
      <View style={styles.blob} pointerEvents="none" />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            wide && styles.contentWide,
            { maxWidth: wide ? 880 : undefined, alignSelf: 'center', width: '100%' },
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
            <View style={[styles.header, { flexDirection: rowRtl as 'row' }]}>
              <View style={styles.headerText}>
                <Text style={styles.title}>دراستي</Text>
                <Text style={styles.subtitle}>موادر وأدواتك في مكان واحد</Text>
              </View>
              <View style={styles.headerBadge}>
                <Icon name="BookOpen" size={20} color={t.brand} />
              </View>
            </View>
          </FadeIn>

          <FadeIn delay={40}>
            <Text style={styles.blockLabel}>وصول سريع</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[
                styles.chipRow,
                { flexDirection: rowRtl as 'row' },
              ]}
            >
              {SHORTCUTS.map((s, i) => (
                <MotiView
                  key={s.href}
                  from={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'timing', duration: 220, delay: i * 35 }}
                >
                  <Pressable
                    onPress={() => router.push(s.href as never)}
                    style={({ pressed }) => [
                      styles.chip,
                      pressed && styles.chipPressed,
                    ]}
                  >
                    <View style={[styles.chipIcon, { backgroundColor: s.bg }]}>
                      <Icon name={s.icon} size={18} color={s.color} strokeWidth={2.2} />
                    </View>
                    <Text style={styles.chipLabel}>{s.label}</Text>
                  </Pressable>
                </MotiView>
              ))}
            </ScrollView>
          </FadeIn>

          <FadeIn delay={80}>
            <View style={[styles.sectionHead, { flexDirection: rowRtl as 'row' }]}>
              <Text style={styles.sectionTitle}>موادي هذا الترم</Text>
              {!loading && !error ? (
                <Badge label={`${subjects.length}`} tone="neutral" />
              ) : null}
            </View>
          </FadeIn>

          {loading ? (
            <LoadingBlock />
          ) : error ? (
            <EmptyState
              icon="AlertCircle"
              title="تعذر تحميل المواد"
              description={error}
              actionLabel="إعادة المحاولة"
              onAction={() => load()}
            />
          ) : subjects.length === 0 ? (
            <EmptyState
              icon="BookOpen"
              title="لا مواد بعد"
              description="لما ينشر المدرس درساً أو واجباً، هتظهر المواد هنا"
            />
          ) : (
            <View style={styles.list}>
              {subjects.map((s, i) => {
                const teacher = getTeacher(s.teacherId);
                const teacherName = teacher?.name || s.teacherName || '';
                const activity =
                  (s.lecturesCount || 0) +
                  (s.assignmentsCount || 0) +
                  (s.examsCount || 0);

                return (
                  <MotiView
                    key={s.id}
                    from={{ opacity: 0, translateY: 8 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{ type: 'timing', duration: 260, delay: i * 45 }}
                  >
                    <Pressable
                      onPress={() =>
                        router.push(`/(student)/subject/${s.id}` as never)
                      }
                      style={({ pressed }) => [
                        styles.subjectCard,
                        pressed && styles.subjectPressed,
                      ]}
                    >
                      <View
                        style={[
                          styles.subjectRow,
                          { flexDirection: rowRtl as 'row' },
                        ]}
                      >
                        <View
                          style={[
                            styles.subjectIcon,
                            { backgroundColor: `${s.color}18` },
                          ]}
                        >
                          <IconBadge
                            name={s.icon || 'BookOpen'}
                            color={s.color}
                            bg="transparent"
                            size={44}
                          />
                        </View>

                        <View style={styles.subjectMain}>
                          <Text style={styles.subjectName} numberOfLines={1}>
                            {s.name}
                          </Text>
                          {teacherName ? (
                            <View
                              style={[
                                styles.teacherRow,
                                { flexDirection: rowRtl as 'row' },
                              ]}
                            >
                              <Avatar
                                name={teacherName}
                                size={18}
                                color={teacher?.avatarColor || s.color}
                              />
                              <Text style={styles.teacherName} numberOfLines={1}>
                                أ/{teacherName}
                              </Text>
                            </View>
                          ) : (
                            <Text style={styles.teacherName}>بدون مدرس معيّن</Text>
                          )}

                          <View
                            style={[
                              styles.statsRow,
                              { flexDirection: rowRtl as 'row' },
                            ]}
                          >
                            <StatPill label={`${s.lecturesCount || 0} دروس`} />
                            <StatPill label={`${s.assignmentsCount || 0} واجبات`} />
                            <StatPill label={`${s.examsCount || 0} امتحانات`} />
                          </View>

                          {activity > 0 ? (
                            <View style={styles.progressWrap}>
                              <ProgressBar
                                value={s.progress || 0}
                                color={s.color}
                                height={6}
                              />
                            </View>
                          ) : null}
                        </View>

                        <View style={styles.subjectEnd}>
                          <View style={styles.openHint}>
                            <Icon name="ChevronLeft" size={18} color={t.brand} />
                          </View>
                        </View>
                      </View>
                    </Pressable>
                  </MotiView>
                );
              })}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function StatPill({ label }: { label: string }) {
  return (
    <View style={styles.statPill}>
      <Text style={styles.statPillText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: t.canvas },
  blob: {
    position: 'absolute',
    top: -90,
    end: -50,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: t.brandSoft,
    opacity: 0.65,
  },
  safe: { flex: 1 },
  content: {
    paddingHorizontal: t.space.lg,
    paddingBottom: t.space['4xl'],
    gap: t.space.lg,
  },
  contentWide: { paddingHorizontal: t.space['2xl'] },
  header: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: t.space.xs,
  },
  headerText: { flex: 1, gap: 4 },
  title: {
    fontFamily: t.fonts.bold,
    fontSize: 26,
    color: t.ink,
    textAlign: 'right',
    letterSpacing: -0.4,
    writingDirection: 'rtl',
  },
  subtitle: {
    fontFamily: t.fonts.regular,
    fontSize: 14,
    color: t.inkSoft,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  headerBadge: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: t.card,
    borderWidth: 1,
    borderColor: t.line,
    alignItems: 'center',
    justifyContent: 'center',
    ...t.shadow.card,
  },
  blockLabel: {
    fontFamily: t.fonts.semiBold,
    fontSize: 13,
    color: t.inkMute,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: 8,
  },
  chipRow: { gap: 10, paddingBottom: 2 },
  chip: {
    flexDirection: rowRtl as 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: t.card,
    borderRadius: t.radius.full,
    borderWidth: 1,
    borderColor: t.line,
    paddingVertical: 10,
    paddingHorizontal: 12,
    ...t.shadow.card,
  },
  chipPressed: { transform: [{ scale: 0.97 }] },
  chipIcon: {
    width: 32,
    height: 32,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipLabel: {
    fontFamily: t.fonts.semiBold,
    fontSize: 13,
    color: t.ink,
    writingDirection: 'rtl',
  },
  sectionHead: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontFamily: t.fonts.bold,
    fontSize: 17,
    color: t.ink,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  list: { gap: 12 },
  subjectCard: {
    backgroundColor: t.card,
    borderRadius: t.radius.lg,
    borderWidth: 1,
    borderColor: t.line,
    padding: 14,
    ...t.shadow.card,
  },
  subjectPressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.96,
  },
  subjectRow: {
    alignItems: 'center',
    gap: 12,
  },
  subjectIcon: {
    borderRadius: 16,
    padding: 2,
  },
  subjectMain: {
    flex: 1,
    gap: 8,
    minWidth: 0,
  },
  subjectName: {
    fontFamily: t.fonts.bold,
    fontSize: 16,
    color: t.ink,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  teacherRow: {
    alignItems: 'center',
    gap: 6,
  },
  teacherName: {
    fontFamily: t.fonts.medium,
    fontSize: 12,
    color: t.inkSoft,
    textAlign: 'right',
    writingDirection: 'rtl',
    flexShrink: 1,
  },
  statsRow: {
    flexWrap: 'wrap',
    gap: 6,
  },
  statPill: {
    backgroundColor: t.cardMuted,
    borderRadius: t.radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statPillText: {
    fontFamily: t.fonts.medium,
    fontSize: 11,
    color: t.inkSoft,
    fontVariant: ['tabular-nums'],
    writingDirection: 'rtl',
  },
  progressWrap: { marginTop: 2 },
  subjectEnd: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  openHint: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: t.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
