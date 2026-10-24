import { useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
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
  formatShortDate,
  rowRtl,
  assignmentStatusLabel,
} from '@/components/student/ui';
import { studentTheme as t } from '@/components/student/theme';
import { useAuth } from '@/auth/AuthContext';
import {
  getStudentDashboard,
  getSubject,
} from '@/services/studentPortal';
import type { StudentDashboardData } from '@/types/studentPortal';
import { displayTitle } from '@/utils/displayTitle';

type AttentionItem = {
  key: string;
  kind: 'task' | 'exam' | 'lesson';
  title: string;
  meta: string;
  href: string;
  tone: 'warning' | 'danger' | 'info' | 'primary';
  badge: string;
};

export default function StudentHomeTab() {
  const { user, studentMeta, logout } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const wide = width >= 720;
  const [data, setData] = useState<StudentDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (soft?: boolean) => {
    if (!soft) setLoading(true);
    try {
      setData(await getStudentDashboard());
    } catch {
      // Keep previous data if soft refresh fails; otherwise show empty state below.
      if (!soft) setData(null);
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

  const attention = useMemo((): AttentionItem[] => {
    if (!data) return [];
    const items: AttentionItem[] = [];

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
        badge: 'درس',
      });
    }

    return items.slice(0, 5);
  }, [data]);

  const pendingTotal = (data?.pendingAssignments || 0) + (data?.pendingExams || 0);
  const nextHref =
    (data?.pendingAssignments || 0) > 0
      ? '/(student)/assignments'
      : (data?.pendingExams || 0) > 0
        ? '/(student)/exams'
        : '/(student)/(tabs)/study';
  const nextLabel =
    (data?.pendingAssignments || 0) > 0
      ? 'افتح الواجبات'
      : (data?.pendingExams || 0) > 0
        ? 'افتح الامتحانات'
        : 'تصفّح موادي';
  const nextTitle =
    pendingTotal > 0
      ? `عندك ${data?.pendingAssignments || 0} واجب و ${data?.pendingExams || 0} امتحان`
      : 'كل شيء تمام اليوم';
  const nextSub =
    pendingTotal > 0
      ? 'ابدأ بالمهمة الأقرب حتى لا تتراكم عليك'
      : `${data?.subjectsCount || 0} مواد · راجع درساً أو خطط للمذاكرة`;

  const shortcuts = [
    {
      key: 'study',
      label: 'موادي',
      icon: 'BookOpen',
      href: '/(student)/(tabs)/study',
      color: t.brand,
      bg: t.brandSoft,
      count: data?.subjectsCount,
    },
    {
      key: 'tasks',
      label: 'واجبات',
      icon: 'FileText',
      href: '/(student)/assignments',
      color: t.warning,
      bg: t.accentSoft,
      count: data?.pendingAssignments,
    },
    {
      key: 'exams',
      label: 'امتحانات',
      icon: 'ClipboardList',
      href: '/(student)/exams',
      color: t.sky,
      bg: t.skySoft,
      count: data?.pendingExams,
    },
    {
      key: 'results',
      label: 'نتائجي',
      icon: 'Trophy',
      href: '/(student)/results',
      color: t.success,
      bg: t.successSoft,
      count: data?.recentResults?.length,
    },
  ] as const;

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
            <View style={[styles.topBar, { flexDirection: rowRtl as 'row' }]}>
              <View style={[styles.identity, { flexDirection: rowRtl as 'row' }]}>
                <Pressable
                  onPress={() => router.push('/(student)/(tabs)/account' as never)}
                  style={styles.avatarRing}
                >
                  <Avatar name={name} size={48} color={t.brand} />
                </Pressable>
                <View style={styles.helloText}>
                  <Text style={styles.hello}>مرحباً، {firstName}</Text>
                  <Text style={styles.metaLine} numberOfLines={1}>
                    {grade} · {school}
                  </Text>
                </View>
              </View>
              <View style={[styles.topActions, { flexDirection: rowRtl as 'row' }]}>
                <Pressable
                  onPress={() => router.push('/(student)/notifications' as never)}
                  style={({ pressed }) => [
                    styles.iconBtn,
                    pressed && { opacity: 0.88 },
                  ]}
                  accessibilityLabel="الإشعارات"
                >
                  <Icon name="Bell" size={20} color={t.inkSoft} strokeWidth={2} />
                  {(data?.unreadNotifications || 0) > 0 ? (
                    <View style={styles.bellBadge}>
                      <Text style={styles.bellBadgeText}>
                        {(data?.unreadNotifications || 0) > 9
                          ? '9+'
                          : String(data?.unreadNotifications)}
                      </Text>
                    </View>
                  ) : null}
                </Pressable>
                <Pressable
                  accessibilityLabel="تسجيل الخروج"
                  onPress={async () => {
                    await logout();
                    router.replace('/login' as never);
                  }}
                  style={({ pressed }) => [
                    styles.logoutBtn,
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <Icon name="LogOut" size={18} color={t.danger} strokeWidth={2} />
                </Pressable>
              </View>
            </View>
          </FadeIn>

          {loading || !data ? (
            <LoadingBlock />
          ) : (
            <>
              <MotiView
                from={{ opacity: 0, translateY: 10 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ type: 'timing', duration: 320 }}
              >
                <LinearGradient
                  colors={[...t.heroAccent]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.nextCard}
                >
                  <View style={styles.nextGlow} />
                  <Text style={styles.nextKicker}>{year}</Text>
                  <Text style={styles.nextTitle}>{nextTitle}</Text>
                  <Text style={styles.nextSub}>{nextSub}</Text>
                  <Pressable
                    onPress={() => router.push(nextHref as never)}
                    style={({ pressed }) => [
                      styles.nextCta,
                      pressed && { transform: [{ scale: 0.98 }] },
                    ]}
                  >
                    <Text style={styles.nextCtaText}>{nextLabel}</Text>
                    <Icon name="ChevronLeft" size={18} color={t.brandDeep} />
                  </Pressable>
                </LinearGradient>
              </MotiView>

              <FadeIn delay={60}>
                <Text style={styles.blockLabel}>اختصارات</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={[
                    styles.chipRow,
                    { flexDirection: rowRtl as 'row' },
                  ]}
                >
                  {shortcuts.map((s, i) => (
                    <MotiView
                      key={s.key}
                      from={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ type: 'timing', duration: 240, delay: i * 45 }}
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
                        {s.count != null && s.count > 0 ? (
                          <View style={[styles.chipBadge, { backgroundColor: s.color }]}>
                            <Text style={styles.chipBadgeText}>{s.count}</Text>
                          </View>
                        ) : null}
                      </Pressable>
                    </MotiView>
                  ))}
                </ScrollView>
              </FadeIn>

              {(data.recentNotifications?.length || 0) > 0 ? (
                <FadeIn delay={90}>
                  <View style={[styles.sectionHead, { flexDirection: rowRtl as 'row' }]}>
                    <Text style={styles.sectionTitle}>إشعارات جديدة</Text>
                    <Pressable
                      onPress={() =>
                        router.push('/(student)/notifications' as never)
                      }
                    >
                      <Text style={styles.linkAll}>الكل</Text>
                    </Pressable>
                  </View>
                  <View style={styles.feed}>
                    {data.recentNotifications.slice(0, 4).map((n, i) => (
                      <MotiView
                        key={n.id}
                        from={{ opacity: 0, translateY: 8 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        transition={{
                          type: 'timing',
                          duration: 240,
                          delay: i * 35,
                        }}
                      >
                        <Pressable
                          onPress={() => {
                            if (n.href?.startsWith('/')) {
                              router.push(`/(student)${n.href}` as never);
                            } else {
                              router.push('/(student)/notifications' as never);
                            }
                          }}
                          style={({ pressed }) => [
                            styles.feedRow,
                            !n.read && styles.notifUnread,
                            { flexDirection: rowRtl as 'row' },
                            pressed && { opacity: 0.92 },
                          ]}
                        >
                          <IconBadge
                            name={
                              n.kind === 'exam'
                                ? 'ClipboardList'
                                : n.kind === 'task' || n.kind === 'assignment'
                                  ? 'FileText'
                                  : n.kind === 'lesson' || n.kind === 'lecture'
                                    ? 'Presentation'
                                    : n.kind === 'message'
                                      ? 'MessageSquare'
                                      : n.kind === 'grade' || n.kind === 'result'
                                        ? 'Trophy'
                                        : 'Bell'
                            }
                            color={n.read ? t.inkMute : t.brand}
                            size={42}
                          />
                          <View style={styles.feedBody}>
                            <Text style={styles.feedTitle} numberOfLines={1}>
                              {n.title}
                            </Text>
                            <Text style={styles.feedMeta} numberOfLines={1}>
                              {n.body}
                            </Text>
                          </View>
                          {!n.read ? <View style={styles.unreadDot} /> : null}
                        </Pressable>
                      </MotiView>
                    ))}
                  </View>
                </FadeIn>
              ) : null}

              <FadeIn delay={100}>
                <View style={[styles.sectionHead, { flexDirection: rowRtl as 'row' }]}>
                  <Text style={styles.sectionTitle}>يحتاج انتباهك</Text>
                  {attention.length > 0 ? (
                    <Badge label={`${attention.length}`} tone="warning" />
                  ) : null}
                </View>

                {attention.length === 0 ? (
                  <View style={styles.emptyBox}>
                    <IconBadge name="Sparkles" color={t.success} size={44} />
                    <Text style={styles.emptyTitle}>لا يوجد شيء عاجل</Text>
                    <Text style={styles.emptyBody}>
                      لما يظهر واجب أو امتحان جديد، هتلاقيه هنا مباشرة
                    </Text>
                  </View>
                ) : (
                  <View style={styles.feed}>
                    {attention.map((item, i) => (
                      <MotiView
                        key={item.key}
                        from={{ opacity: 0, translateY: 8 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        transition={{ type: 'timing', duration: 260, delay: i * 40 }}
                      >
                        <Pressable
                          onPress={() => router.push(item.href as never)}
                          style={({ pressed }) => [
                            styles.feedRow,
                            { flexDirection: rowRtl as 'row' },
                            pressed && { opacity: 0.92 },
                          ]}
                        >
                          <IconBadge
                            name={
                              item.kind === 'task'
                                ? 'ClipboardList'
                                : item.kind === 'exam'
                                  ? 'FileBarChart'
                                  : 'Play'
                            }
                            color={
                              item.tone === 'danger'
                                ? t.danger
                                : item.tone === 'warning'
                                  ? t.warning
                                  : item.tone === 'primary'
                                    ? t.brand
                                    : t.sky
                            }
                            size={44}
                          />
                          <View style={styles.feedBody}>
                            <Text style={styles.feedTitle} numberOfLines={1}>
                              {item.title}
                            </Text>
                            <Text style={styles.feedMeta} numberOfLines={1}>
                              {item.meta}
                            </Text>
                          </View>
                          <View style={styles.feedEnd}>
                            <Badge label={item.badge} tone={item.tone} />
                            <Icon name="ChevronLeft" size={16} color={t.inkMute} />
                          </View>
                        </Pressable>
                      </MotiView>
                    ))}
                  </View>
                )}
              </FadeIn>

              {data.upcomingLecturesList.length > 0 ? (
                <FadeIn delay={140}>
                  <View style={[styles.sectionHead, { flexDirection: rowRtl as 'row' }]}>
                    <Text style={styles.sectionTitle}>أحدث الدروس</Text>
                    <Pressable
                      onPress={() => router.push('/(student)/lectures' as never)}
                      style={[styles.linkRow, { flexDirection: rowRtl as 'row' }]}
                    >
                      <Text style={styles.link}>الكل</Text>
                      <Icon name="ChevronLeft" size={16} color={t.brand} />
                    </Pressable>
                  </View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={[
                      styles.lessonStrip,
                      { flexDirection: rowRtl as 'row' },
                    ]}
                  >
                    {data.upcomingLecturesList.slice(0, 6).map((lec) => {
                      const sub = getSubject(lec.subjectId);
                      return (
                        <Pressable
                          key={lec.id}
                          style={styles.lessonCard}
                          onPress={() =>
                            router.push(`/(student)/lecture/${lec.id}` as never)
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

              <FadeIn delay={180}>
                <Pressable
                  onPress={() => router.push('/(student)/(tabs)/ai' as never)}
                  style={({ pressed }) => [
                    styles.aiRow,
                    { flexDirection: rowRtl as 'row' },
                    pressed && { opacity: 0.92 },
                  ]}
                >
                  <View style={styles.aiIcon}>
                    <Icon name="Bot" size={20} color={t.ai} />
                  </View>
                  <View style={styles.aiText}>
                    <Text style={styles.aiTitle}>مساعد المذاكرة</Text>
                    <Text style={styles.aiSub}>اسأل عن درس أو تمرين بسرعة</Text>
                  </View>
                  <Icon name="ChevronLeft" size={18} color={t.ai} />
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
  blob: {
    position: 'absolute',
    top: -80,
    end: -40,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: t.brandSoft,
    opacity: 0.7,
  },
  safe: { flex: 1 },
  content: {
    paddingHorizontal: t.space.lg,
    paddingBottom: t.space['4xl'],
    gap: t.space.lg,
  },
  contentWide: { paddingHorizontal: t.space['2xl'] },
  topBar: {
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: t.space.xs,
  },
  identity: { alignItems: 'center', gap: 12, flex: 1 },
  avatarRing: {
    borderRadius: 18,
    borderWidth: 2,
    borderColor: t.brandSoft,
    padding: 2,
  },
  helloText: { flex: 1, gap: 2 },
  hello: {
    fontFamily: t.fonts.bold,
    fontSize: 24,
    color: t.ink,
    textAlign: 'right',
    letterSpacing: -0.4,
    writingDirection: 'rtl',
  },
  metaLine: {
    fontFamily: t.fonts.medium,
    fontSize: 13,
    color: t.inkSoft,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  topActions: {
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: t.card,
    borderWidth: 1,
    borderColor: t.line,
    alignItems: 'center',
    justifyContent: 'center',
    ...t.shadow.card,
  },
  bellBadge: {
    position: 'absolute',
    top: -4,
    start: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: t.danger,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: t.canvas,
  },
  bellBadgeText: {
    fontFamily: t.fonts.bold,
    fontSize: 9,
    color: '#fff',
    fontVariant: ['tabular-nums'],
  },
  logoutBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: t.dangerSoft,
    borderWidth: 1,
    borderColor: '#FECDD3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextCard: {
    borderRadius: t.radius.xl,
    padding: t.space.xl,
    gap: 8,
    overflow: 'hidden',
    ...t.shadow.float,
  },
  nextGlow: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.14)',
    top: -40,
    start: -30,
  },
  nextKicker: {
    fontFamily: t.fonts.semiBold,
    fontSize: 12,
    color: 'rgba(255,255,255,0.78)',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  nextTitle: {
    fontFamily: t.fonts.bold,
    fontSize: 22,
    color: '#fff',
    textAlign: 'right',
    writingDirection: 'rtl',
    lineHeight: 32,
  },
  nextSub: {
    fontFamily: t.fonts.regular,
    fontSize: 14,
    color: 'rgba(255,255,255,0.88)',
    textAlign: 'right',
    writingDirection: 'rtl',
    lineHeight: 22,
    marginBottom: 6,
  },
  nextCta: {
    alignSelf: 'flex-start',
    flexDirection: rowRtl as 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: t.radius.full,
  },
  nextCtaText: {
    fontFamily: t.fonts.semiBold,
    fontSize: 14,
    color: t.brandDeep,
  },
  blockLabel: {
    fontFamily: t.fonts.semiBold,
    fontSize: 13,
    color: t.inkMute,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginBottom: 8,
  },
  chipRow: {
    gap: 10,
    paddingBottom: 2,
  },
  chip: {
    flexDirection: rowRtl as 'row',
    alignItems: 'center',
    gap: 10,
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
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipLabel: {
    fontFamily: t.fonts.semiBold,
    fontSize: 13,
    color: t.ink,
    writingDirection: 'rtl',
  },
  chipBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  chipBadgeText: {
    fontFamily: t.fonts.bold,
    fontSize: 11,
    color: '#fff',
    fontVariant: ['tabular-nums'],
  },
  sectionHead: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    fontFamily: t.fonts.bold,
    fontSize: 17,
    color: t.ink,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  linkRow: { alignItems: 'center', gap: 2 },
  link: {
    fontFamily: t.fonts.semiBold,
    fontSize: 13,
    color: t.brand,
  },
  emptyBox: {
    backgroundColor: t.card,
    borderRadius: t.radius.lg,
    borderWidth: 1,
    borderColor: t.line,
    paddingVertical: t.space.xl,
    paddingHorizontal: t.space.lg,
    alignItems: 'center',
    gap: 8,
    ...t.shadow.card,
  },
  emptyTitle: {
    fontFamily: t.fonts.semiBold,
    fontSize: 15,
    color: t.ink,
    writingDirection: 'rtl',
  },
  emptyBody: {
    fontFamily: t.fonts.regular,
    fontSize: 13,
    color: t.inkMute,
    textAlign: 'center',
    lineHeight: 20,
    writingDirection: 'rtl',
  },
  linkAll: {
    fontFamily: t.fonts.semiBold,
    fontSize: 13,
    color: t.brand,
  },
  feed: { gap: 10 },
  feedRow: {
    alignItems: 'center',
    gap: 12,
    backgroundColor: t.card,
    borderRadius: t.radius.lg,
    borderWidth: 1,
    borderColor: t.line,
    padding: 14,
    ...t.shadow.card,
  },
  notifUnread: {
    borderColor: '#C7D2FE',
    backgroundColor: '#F8FAFF',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: t.brand,
  },
  feedBody: { flex: 1, gap: 3 },
  feedTitle: {
    fontFamily: t.fonts.semiBold,
    fontSize: 14,
    color: t.ink,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  feedMeta: {
    fontFamily: t.fonts.regular,
    fontSize: 12,
    color: t.inkMute,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  feedEnd: {
    alignItems: 'center',
    gap: 6,
  },
  lessonStrip: { gap: 10, paddingVertical: 2 },
  lessonCard: {
    width: 150,
    backgroundColor: t.card,
    borderRadius: t.radius.lg,
    borderWidth: 1,
    borderColor: t.line,
    padding: 10,
    gap: 8,
    ...t.shadow.card,
  },
  lessonTop: {
    height: 70,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lessonTitle: {
    fontFamily: t.fonts.semiBold,
    fontSize: 13,
    color: t.ink,
    textAlign: 'right',
    writingDirection: 'rtl',
    minHeight: 36,
  },
  lessonMeta: {
    fontFamily: t.fonts.regular,
    fontSize: 11,
    color: t.inkMute,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  aiRow: {
    alignItems: 'center',
    gap: 12,
    backgroundColor: t.aiSoft,
    borderRadius: t.radius.lg,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    padding: 14,
  },
  aiIcon: {
    width: 42,
    height: 42,
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
    writingDirection: 'rtl',
  },
  aiSub: {
    fontFamily: t.fonts.regular,
    fontSize: 12,
    color: t.ai,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});
