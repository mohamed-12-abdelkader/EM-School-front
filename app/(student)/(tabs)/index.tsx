import { useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { Avatar, Badge, Icon } from '@/components/ui';
import {
  FadeIn,
  IconBadge,
  LoadingBlock,
  SoftCard,
  assignmentStatusLabel,
  formatShortDate,
  rowRtl,
} from '@/components/student/ui';
import { studentTheme as t } from '@/components/student/theme';
import { useAuth } from '@/auth/AuthContext';
import {
  getStudentDashboard,
  getSubject,
} from '@/services/studentPortal';
import type { StudentDashboardData } from '@/types/studentPortal';
import { displayTitle } from '@/utils/displayTitle';

const QUICK = [
  {
    label: 'موادي',
    hint: 'دروس وملفات',
    icon: 'BookOpen',
    href: '/(student)/(tabs)/study',
    color: t.brand,
    bg: t.brandSoft,
  },
  {
    label: 'واجبات',
    hint: 'حل وسلّم',
    icon: 'FileText',
    href: '/(student)/assignments',
    color: t.warning,
    bg: t.accentSoft,
  },
  {
    label: 'امتحانات',
    hint: 'ابدأ الآن',
    icon: 'ClipboardList',
    href: '/(student)/exams',
    color: t.sky,
    bg: t.skySoft,
  },
  {
    label: 'نتائج',
    hint: 'درجاتك',
    icon: 'FileBarChart',
    href: '/(student)/results',
    color: t.success,
    bg: t.successSoft,
  },
] as const;

export default function StudentHomeTab() {
  const { user, studentMeta } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<StudentDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (soft?: boolean) => {
    if (!soft) setLoading(true);
    try {
      setData(await getStudentDashboard());
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

  const name = user?.name || 'طالب';
  const firstName = name.split(' ')[0];
  const grade = studentMeta?.profile.grade_name || '—';
  const school = studentMeta?.school.name || 'EM School';
  const year = studentMeta?.profile.academic_year || '2025/2026';

  const attention = useMemo(() => {
    if (!data) return [] as Array<{
      key: string;
      kind: 'task' | 'exam' | 'lesson';
      title: string;
      meta: string;
      href: string;
      tone: 'warning' | 'danger' | 'info' | 'primary';
      badge: string;
    }>;

    const items: Array<{
      key: string;
      kind: 'task' | 'exam' | 'lesson';
      title: string;
      meta: string;
      href: string;
      tone: 'warning' | 'danger' | 'info' | 'primary';
      badge: string;
    }> = [];

    for (const a of data.dueAssignments) {
      if (a.status === 'graded' || a.status === 'submitted') continue;
      items.push({
        key: `t-${a.id}`,
        kind: 'task',
        title: displayTitle(a.title, 'واجب دراسي'),
        meta: a.dueAt
          ? `تسليم ${formatShortDate(a.dueAt)}`
          : getSubject(a.subjectId)?.name || 'واجب',
        href: `/(student)/assignment/${a.id}`,
        tone: a.status === 'overdue' ? 'danger' : 'warning',
        badge: assignmentStatusLabel[a.status] || 'واجب',
      });
    }

    for (const e of data.openExams) {
      items.push({
        key: `e-${e.id}`,
        kind: 'exam',
        title: displayTitle(e.title, 'امتحان'),
        meta: `${getSubject(e.subjectId)?.name || 'امتحان'} · ${e.durationMin || '—'} د`,
        href: `/(student)/exam/${e.id}`,
        tone: 'primary',
        badge: 'امتحان',
      });
    }

    for (const lec of data.upcomingLecturesList.slice(0, 2)) {
      items.push({
        key: `l-${lec.id}`,
        kind: 'lesson',
        title: displayTitle(lec.title, 'درس جديد'),
        meta: `${getSubject(lec.subjectId)?.name || 'درس'} · ${formatShortDate(lec.date)}`,
        href: `/(student)/lecture/${lec.id}`,
        tone: 'info',
        badge: 'درس جديد',
      });
    }

    return items.slice(0, 6);
  }, [data]);

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.content}
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
            <View style={styles.topBar}>
              <Pressable
                onPress={() => router.push('/(student)/notifications' as never)}
                style={styles.iconBtn}
                hitSlop={8}
              >
                <Icon name="Bell" size={20} color={t.inkSoft} strokeWidth={2} />
              </Pressable>
              <Pressable
                onPress={() =>
                  router.push('/(student)/(tabs)/account' as never)
                }
                style={styles.avatarHit}
              >
                <Avatar name={name} size={44} color={t.brand} />
              </Pressable>
            </View>
          </FadeIn>

          <FadeIn delay={40}>
            <View style={styles.hello}>
              <Text style={styles.eyebrow}>
                {school} · {year}
              </Text>
              <Text style={styles.title}>مرحباً، {firstName}</Text>
              <View style={styles.gradeRow}>
                <View style={styles.gradePill}>
                  <Icon name="GraduationCap" size={14} color={t.brand} />
                  <Text style={styles.gradeText}>{grade}</Text>
                </View>
              </View>
            </View>
          </FadeIn>

          {loading || !data ? (
            <LoadingBlock />
          ) : (
            <>
              <FadeIn delay={80}>
                <LinearGradient
                  colors={[...t.heroAccent]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={styles.heroCard}
                >
                  <View style={styles.heroTextCol}>
                    <Text style={styles.heroEyebrow}>ملخص سريع</Text>
                    <Text style={styles.heroTitle}>
                      {data.pendingAssignments + data.pendingExams > 0
                        ? `${data.pendingAssignments} واجب · ${data.pendingExams} امتحان`
                        : 'أنت محدّث — لا مهام معلّقة'}
                    </Text>
                    <Text style={styles.heroSub}>
                      {data.subjectsCount} مواد · {data.upcomingLectures} دروس
                      {data.completionRate > 0
                        ? ` · متوسط ${data.completionRate}%`
                        : ''}
                    </Text>
                  </View>
                  <Pressable
                    style={styles.heroCta}
                    onPress={() =>
                      router.push(
                        data.pendingAssignments > 0
                          ? ('/(student)/assignments' as never)
                          : data.pendingExams > 0
                            ? ('/(student)/exams' as never)
                            : ('/(student)/(tabs)/study' as never),
                      )
                    }
                  >
                    <Text style={styles.heroCtaText}>
                      {data.pendingAssignments > 0
                        ? 'افتح الواجبات'
                        : data.pendingExams > 0
                          ? 'افتح الامتحانات'
                          : 'موادي'}
                    </Text>
                    <Icon name="ChevronLeft" size={16} color={t.brand} />
                  </Pressable>
                </LinearGradient>
              </FadeIn>

              <FadeIn delay={120}>
                <View style={styles.quickGrid}>
                  {QUICK.map((q, i) => (
                    <MotiView
                      key={q.label}
                      from={{ opacity: 0, translateY: 8 }}
                      animate={{ opacity: 1, translateY: 0 }}
                      transition={{ type: 'timing', duration: 280, delay: i * 40 }}
                      style={styles.quickCell}
                    >
                      <Pressable
                        style={({ pressed }) => [
                          styles.quickCard,
                          pressed && styles.quickPressed,
                        ]}
                        onPress={() => router.push(q.href as never)}
                      >
                        <View
                          style={[styles.quickIcon, { backgroundColor: q.bg }]}
                        >
                          <Icon
                            name={q.icon}
                            size={22}
                            color={q.color}
                            strokeWidth={2.2}
                          />
                        </View>
                        <Text style={styles.quickLabel}>{q.label}</Text>
                        <Text style={styles.quickHint}>{q.hint}</Text>
                      </Pressable>
                    </MotiView>
                  ))}
                </View>
              </FadeIn>

              <FadeIn delay={160}>
                <View style={styles.sectionHead}>
                  <Text style={styles.sectionTitle}>يحتاج انتباهك</Text>
                  {attention.length > 0 ? (
                    <Badge label={`${attention.length}`} tone="warning" />
                  ) : null}
                </View>
                {attention.length === 0 ? (
                  <SoftCard style={styles.emptyCard}>
                    <IconBadge name="Sparkles" color={t.success} size={40} />
                    <Text style={styles.emptyTitle}>كله تمام</Text>
                    <Text style={styles.emptyBody}>
                      لا يوجد واجب أو درس جديد يحتاج إجراء الآن
                    </Text>
                  </SoftCard>
                ) : (
                  <View style={styles.attentionList}>
                    {attention.map((item, i) => (
                      <Pressable
                        key={item.key}
                        style={({ pressed }) => [
                          styles.attentionRow,
                          pressed && { opacity: 0.9 },
                        ]}
                        onPress={() => router.push(item.href as never)}
                      >
                        <IconBadge
                          name={
                            item.kind === 'task'
                              ? 'ClipboardList'
                              : item.kind === 'exam'
                                ? 'FileBarChart'
                                : 'Presentation'
                          }
                          color={
                            item.tone === 'danger'
                              ? t.danger
                              : item.tone === 'warning'
                                ? t.warning
                                : t.sky
                          }
                          size={42}
                        />
                        <View style={styles.attentionBody}>
                          <Text style={styles.attentionTitle} numberOfLines={1}>
                            {item.title}
                          </Text>
                          <Text style={styles.attentionMeta} numberOfLines={1}>
                            {item.meta}
                          </Text>
                        </View>
                        <Badge label={item.badge} tone={item.tone} />
                      </Pressable>
                    ))}
                  </View>
                )}
              </FadeIn>

              {data.dueAssignments.length > 0 ? (
                <FadeIn delay={200}>
                  <View style={styles.sectionHead}>
                    <Text style={styles.sectionTitle}>واجبات قريبة</Text>
                    <Pressable
                      onPress={() =>
                        router.push('/(student)/assignments' as never)
                      }
                      style={styles.linkRow}
                    >
                      <Text style={styles.link}>الكل</Text>
                      <Icon name="ChevronLeft" size={16} color={t.brand} />
                    </Pressable>
                  </View>
                  {data.dueAssignments.slice(0, 4).map((a) => {
                    const sub = getSubject(a.subjectId);
                    return (
                      <Pressable
                        key={a.id}
                        style={styles.listCard}
                        onPress={() =>
                          router.push(
                            `/(student)/assignment/${a.id}` as never,
                          )
                        }
                      >
                        <View
                          style={[
                            styles.listAccent,
                            {
                              backgroundColor:
                                a.status === 'overdue' ? t.danger : t.warning,
                            },
                          ]}
                        />
                        <View style={styles.listBody}>
                          <Text style={styles.listTitle} numberOfLines={1}>
                            {displayTitle(a.title, 'واجب دراسي')}
                          </Text>
                          <Text style={styles.listMeta}>
                            {sub?.name || 'مادة'}
                            {a.dueAt
                              ? ` · ${formatShortDate(a.dueAt)}`
                              : ''}
                          </Text>
                        </View>
                        <Badge
                          label={assignmentStatusLabel[a.status] || a.status}
                          tone={
                            a.status === 'overdue'
                              ? 'danger'
                              : a.status === 'graded'
                                ? 'success'
                                : 'warning'
                          }
                        />
                      </Pressable>
                    );
                  })}
                </FadeIn>
              ) : null}

              {data.upcomingLecturesList.length > 0 ? (
                <FadeIn delay={240}>
                  <View style={styles.sectionHead}>
                    <Text style={styles.sectionTitle}>أحدث الدروس</Text>
                    <Pressable
                      onPress={() =>
                        router.push('/(student)/lectures' as never)
                      }
                      style={styles.linkRow}
                    >
                      <Text style={styles.link}>الكل</Text>
                      <Icon name="ChevronLeft" size={16} color={t.brand} />
                    </Pressable>
                  </View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.lessonStrip}
                  >
                    {data.upcomingLecturesList.map((lec) => {
                      const sub = getSubject(lec.subjectId);
                      return (
                        <Pressable
                          key={lec.id}
                          style={styles.lessonCard}
                          onPress={() =>
                            router.push(
                              `/(student)/lecture/${lec.id}` as never,
                            )
                          }
                        >
                          <View
                            style={[
                              styles.lessonTop,
                              {
                                backgroundColor: sub?.color
                                  ? `${sub.color}22`
                                  : t.brandSoft,
                              },
                            ]}
                          >
                            <Icon
                              name="Play"
                              size={22}
                              color={sub?.color || t.brand}
                            />
                          </View>
                          <Text style={styles.lessonTitle} numberOfLines={2}>
                            {displayTitle(lec.title, 'درس')}
                          </Text>
                          <Text style={styles.lessonMeta} numberOfLines={1}>
                            {sub?.name || 'درس'}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </FadeIn>
              ) : null}

              {data.recentResults.length > 0 ? (
                <FadeIn delay={280}>
                  <View style={styles.sectionHead}>
                    <Text style={styles.sectionTitle}>آخر النتائج</Text>
                    <Pressable
                      onPress={() =>
                        router.push('/(student)/results' as never)
                      }
                      style={styles.linkRow}
                    >
                      <Text style={styles.link}>التقارير</Text>
                      <Icon name="ChevronLeft" size={16} color={t.brand} />
                    </Pressable>
                  </View>
                  {data.recentResults.slice(0, 3).map((r) => (
                    <Pressable
                      key={r.id}
                      style={styles.listCard}
                      onPress={() =>
                        router.push(
                          `/(student)/exam/${r.examId}/result` as never,
                        )
                      }
                    >
                      <IconBadge
                        name="Trophy"
                        color={r.percent >= 70 ? t.success : t.warning}
                        size={42}
                      />
                      <View style={styles.listBody}>
                        <Text style={styles.listTitle}>
                          {r.score}/{r.maxScore}
                        </Text>
                        <Text style={styles.listMeta}>
                          {formatShortDate(r.finishedAt)} · {r.percent}%
                        </Text>
                      </View>
                      <Badge
                        label={`${r.percent}%`}
                        tone={r.percent >= 70 ? 'success' : 'warning'}
                      />
                    </Pressable>
                  ))}
                </FadeIn>
              ) : null}

              <FadeIn delay={300}>
                <Pressable
                  style={styles.aiBanner}
                  onPress={() =>
                    router.push('/(student)/(tabs)/ai' as never)
                  }
                >
                  <View style={styles.aiIcon}>
                    <Icon name="Bot" size={22} color="#7C3AED" />
                  </View>
                  <View style={styles.aiText}>
                    <Text style={styles.aiTitle}>مساعد المذاكرة</Text>
                    <Text style={styles.aiSub}>اسأل عن درس أو تمرين</Text>
                  </View>
                  <Icon name="ChevronLeft" size={18} color="#7C3AED" />
                </Pressable>
              </FadeIn>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: t.canvas },
  safe: { flex: 1 },
  content: {
    paddingHorizontal: t.space.lg,
    paddingBottom: t.space['4xl'],
    gap: t.space.md,
  },
  topBar: {
    flexDirection: rowRtl,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: t.space.xs,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: t.card,
    borderWidth: 1,
    borderColor: t.line,
    alignItems: 'center',
    justifyContent: 'center',
    ...t.shadow.card,
  },
  avatarHit: {
    borderRadius: 16,
    borderWidth: 2,
    borderColor: t.brandSoft,
    padding: 2,
  },
  hello: { gap: 6, alignItems: 'flex-end' },
  eyebrow: {
    fontFamily: t.fonts.medium,
    fontSize: 12,
    color: t.inkMute,
    textAlign: 'right',
  },
  title: {
    fontFamily: t.fonts.bold,
    fontSize: 28,
    color: t.ink,
    textAlign: 'right',
    letterSpacing: -0.3,
  },
  gradeRow: {
    flexDirection: rowRtl,
    alignItems: 'center',
  },
  gradePill: {
    flexDirection: rowRtl,
    alignItems: 'center',
    gap: 6,
    backgroundColor: t.brandSoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: t.radius.full,
  },
  gradeText: {
    fontFamily: t.fonts.semiBold,
    fontSize: 12,
    color: t.brandDeep,
  },
  heroCard: {
    borderRadius: t.radius.xl,
    padding: t.space.xl,
    gap: t.space.md,
    ...t.shadow.float,
  },
  heroTextCol: { gap: 4, alignItems: 'flex-end' },
  heroEyebrow: {
    fontFamily: t.fonts.semiBold,
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'right',
  },
  heroTitle: {
    fontFamily: t.fonts.bold,
    fontSize: 20,
    color: '#fff',
    textAlign: 'right',
  },
  heroSub: {
    fontFamily: t.fonts.regular,
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'right',
    lineHeight: 20,
  },
  heroCta: {
    alignSelf: 'flex-start',
    flexDirection: rowRtl,
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: t.radius.full,
  },
  heroCtaText: {
    fontFamily: t.fonts.semiBold,
    fontSize: 13,
    color: t.brand,
  },
  quickGrid: {
    flexDirection: rowRtl,
    flexWrap: 'wrap',
    gap: 10,
  },
  quickCell: {
    width: '48%',
    flexGrow: 1,
  },
  quickCard: {
    backgroundColor: t.card,
    borderRadius: t.radius.lg,
    borderWidth: 1,
    borderColor: t.line,
    padding: t.space.md,
    gap: 6,
    alignItems: 'flex-end',
    ...t.shadow.card,
  },
  quickPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.95,
  },
  quickIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLabel: {
    fontFamily: t.fonts.bold,
    fontSize: 15,
    color: t.ink,
    textAlign: 'right',
  },
  quickHint: {
    fontFamily: t.fonts.regular,
    fontSize: 12,
    color: t.inkMute,
    textAlign: 'right',
  },
  sectionHead: {
    flexDirection: rowRtl,
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: t.space.sm,
  },
  sectionTitle: {
    fontFamily: t.fonts.bold,
    fontSize: 17,
    color: t.ink,
    textAlign: 'right',
  },
  linkRow: {
    flexDirection: rowRtl,
    alignItems: 'center',
    gap: 2,
  },
  link: {
    fontFamily: t.fonts.semiBold,
    fontSize: 13,
    color: t.brand,
  },
  emptyCard: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: t.space.xl,
  },
  emptyTitle: {
    fontFamily: t.fonts.semiBold,
    fontSize: 15,
    color: t.ink,
  },
  emptyBody: {
    fontFamily: t.fonts.regular,
    fontSize: 13,
    color: t.inkMute,
    textAlign: 'center',
    lineHeight: 20,
  },
  attentionList: { gap: 8 },
  attentionRow: {
    flexDirection: rowRtl,
    alignItems: 'center',
    gap: 12,
    backgroundColor: t.card,
    borderRadius: t.radius.lg,
    borderWidth: 1,
    borderColor: t.line,
    padding: t.space.md,
    ...t.shadow.card,
  },
  attentionBody: { flex: 1, gap: 2 },
  attentionTitle: {
    fontFamily: t.fonts.semiBold,
    fontSize: 14,
    color: t.ink,
    textAlign: 'right',
  },
  attentionMeta: {
    fontFamily: t.fonts.regular,
    fontSize: 12,
    color: t.inkMute,
    textAlign: 'right',
  },
  listCard: {
    flexDirection: rowRtl,
    alignItems: 'center',
    gap: 10,
    backgroundColor: t.card,
    borderRadius: t.radius.lg,
    borderWidth: 1,
    borderColor: t.line,
    paddingVertical: 12,
    paddingHorizontal: 12,
    overflow: 'hidden',
    ...t.shadow.card,
  },
  listAccent: {
    width: 4,
    alignSelf: 'stretch',
    borderRadius: 4,
    marginVertical: -4,
  },
  listBody: { flex: 1, gap: 2 },
  listTitle: {
    fontFamily: t.fonts.semiBold,
    fontSize: 14,
    color: t.ink,
    textAlign: 'right',
  },
  listMeta: {
    fontFamily: t.fonts.regular,
    fontSize: 12,
    color: t.inkMute,
    textAlign: 'right',
  },
  lessonStrip: {
    gap: 10,
    paddingVertical: 2,
    flexDirection: rowRtl,
  },
  lessonCard: {
    width: 148,
    backgroundColor: t.card,
    borderRadius: t.radius.lg,
    borderWidth: 1,
    borderColor: t.line,
    padding: 10,
    gap: 8,
    ...t.shadow.card,
  },
  lessonTop: {
    height: 72,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lessonTitle: {
    fontFamily: t.fonts.semiBold,
    fontSize: 13,
    color: t.ink,
    textAlign: 'right',
    minHeight: 36,
  },
  lessonMeta: {
    fontFamily: t.fonts.regular,
    fontSize: 11,
    color: t.inkMute,
    textAlign: 'right',
  },
  aiBanner: {
    flexDirection: rowRtl,
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F5F3FF',
    borderRadius: t.radius.lg,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    padding: t.space.md,
    marginTop: t.space.sm,
  },
  aiIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiText: { flex: 1, gap: 2 },
  aiTitle: {
    fontFamily: t.fonts.semiBold,
    fontSize: 14,
    color: '#5B21B6',
    textAlign: 'right',
  },
  aiSub: {
    fontFamily: t.fonts.regular,
    fontSize: 12,
    color: '#7C3AED',
    textAlign: 'right',
  },
});
