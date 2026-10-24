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
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar, Icon } from '@/components/ui';
import { useAuth } from '@/auth/AuthContext';
import { ChildSwitcher } from '@/components/parent/ChildSwitcher';
import { useParentChild } from '@/components/parent/ParentChildContext';
import { parentTheme as t } from '@/components/parent/theme';
import {
  EmptyHint,
  FadeIn,
  LoadingBlock,
  RateRing,
  SectionHeader,
  StatCard,
  StatusPill,
  formatShortDate,
  percentTone,
  rowRtl,
} from '@/components/parent/ui';
import {
  getParentChildOverview,
  relationLabel,
} from '@/services/parentPortal';
import type { ParentChildOverview } from '@/types/parentPortal';
import { displayTitle } from '@/utils/displayTitle';

export default function ParentHomeTab() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const wide = width >= 720;
  const {
    children,
    selectedChild,
    selectedChildId,
    setSelectedChildId,
    loading: bootLoading,
    refresh: refreshDashboard,
  } = useParentChild();

  const onLogout = async () => {
    await logout();
    router.replace('/login' as never);
  };

  const [overview, setOverview] = useState<ParentChildOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (soft = false) => {
      if (!selectedChildId) {
        setOverview(null);
        setLoading(false);
        return;
      }
      if (soft) setRefreshing(true);
      else setLoading(true);
      try {
        setOverview(await getParentChildOverview(selectedChildId));
      } catch {
        if (!soft) setOverview(null);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [selectedChildId],
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshDashboard(true);
    await load(true);
  };

  const firstName = (user?.name || 'ولي الأمر').split(' ')[0];
  const childName = selectedChild?.name?.split(' ')[0] || 'ابنك/ابنتك';
  const stats = overview?.stats;

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            wide && { maxWidth: 880, alignSelf: 'center', width: '100%' },
            { paddingBottom: 110 },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={t.guardian}
            />
          }
        >
          <LinearGradient
            colors={['#0F766E', '#0D9488', '#14B8A6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <View style={[styles.heroTop, { flexDirection: rowRtl as 'row' }]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.hello}>مرحباً، {firstName}</Text>
                <Text style={styles.heroSub}>
                  متابعة دراسية لـ {childName}
                  {selectedChild?.gradeName ? ` · ${selectedChild.gradeName}` : ''}
                </Text>
              </View>
              <View style={[styles.heroActions, { flexDirection: rowRtl as 'row' }]}>
                <Avatar name={user?.name || 'P'} size={48} />
                <Pressable
                  accessibilityLabel="تسجيل الخروج"
                  onPress={onLogout}
                  style={({ pressed }) => [
                    styles.logoutBtn,
                    pressed && { opacity: 0.88 },
                  ]}
                >
                  <Icon name="LogOut" size={18} color="#fff" strokeWidth={2.2} />
                  <Text style={styles.logoutText}>خروج</Text>
                </Pressable>
              </View>
            </View>

            {selectedChild ? (
              <View style={[styles.heroChild, { flexDirection: rowRtl as 'row' }]}>
                <Avatar name={selectedChild.name} size={40} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.heroChildName}>{selectedChild.name}</Text>
                  <Text style={styles.heroChildMeta}>
                    {[
                      relationLabel[selectedChild.relation] || selectedChild.relation,
                      selectedChild.classroomName,
                      selectedChild.academicYear,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </Text>
                </View>
              </View>
            ) : null}
          </LinearGradient>

          <View style={styles.body}>
            <ChildSwitcher
              children={children}
              selectedId={selectedChildId}
              onSelect={setSelectedChildId}
            />

            {bootLoading || loading ? (
              <LoadingBlock label="جارٍ تحميل لوحة ولي الأمر..." />
            ) : !selectedChild ? (
              <EmptyHint
                title="لا يوجد أبناء مرتبطون"
                body="عند إنشاء طالب من لوحة الإدارة يُنشأ كود ولي الأمر ويُربط بالطالب تلقائياً."
              />
            ) : (
              <>
                <View style={[styles.statsRow, wide && styles.statsRowWide]}>
                  <View style={styles.ringCard}>
                    <RateRing
                      percent={stats?.attendanceRate ?? 0}
                      label="نسبة الحضور"
                    />
                    <Text style={styles.ringHint}>
                      {stats?.recordedDays
                        ? `${stats.presentDays} حضور · ${stats.absentDays} غياب`
                        : 'لا سجلات حضور بعد'}
                    </Text>
                  </View>
                  <View style={styles.statGrid}>
                    <StatCard
                      label="متوسط الامتحانات"
                      value={`${stats?.avgExamPercent ?? 0}%`}
                      icon="GraduationCap"
                      tone="brand"
                      delay={40}
                    />
                    <StatCard
                      label="واجبات مُقيَّمة"
                      value={String(stats?.gradedTasks ?? 0)}
                      icon="ClipboardCheck"
                      tone="guardian"
                      delay={80}
                    />
                    <StatCard
                      label="آراء المعلّمين"
                      value={String(stats?.teacherOpinions ?? 0)}
                      icon="MessageSquareQuote"
                      tone="success"
                      delay={120}
                    />
                  </View>
                </View>

                <SectionHeader
                  title="آخر الحضور"
                  action={
                    <Pressable onPress={() => router.push('/(parent)/(tabs)/attendance' as never)}>
                      <Text style={styles.link}>الكل</Text>
                    </Pressable>
                  }
                />
                {overview?.recentAttendance?.length ? (
                  <View style={styles.list}>
                    {overview.recentAttendance.slice(0, 4).map((r, i) => (
                      <FadeIn key={r.id} delay={i * 40} style={styles.row}>
                        <View style={[styles.rowInner, { flexDirection: rowRtl as 'row' }]}>
                          <StatusPill status={r.status} />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.rowTitle}>{formatShortDate(r.date)}</Text>
                            {r.notes ? (
                              <Text style={styles.rowMeta} numberOfLines={1}>
                                {r.notes}
                              </Text>
                            ) : null}
                          </View>
                        </View>
                      </FadeIn>
                    ))}
                  </View>
                ) : (
                  <EmptyHint title="لا حضور مسجّل" body="ستظهر هنا سجلات حضور ابنك عند تسجيلها من المدرسة." />
                )}

                <SectionHeader
                  title="آخر الدرجات"
                  action={
                    <Pressable onPress={() => router.push('/(parent)/(tabs)/grades' as never)}>
                      <Text style={styles.link}>الكل</Text>
                    </Pressable>
                  }
                />
                {overview?.recentExams?.length || overview?.recentTasks?.length ? (
                  <View style={styles.list}>
                    {(overview.recentExams || []).slice(0, 3).map((e, i) => {
                      const tone = percentTone(e.percent);
                      return (
                        <FadeIn key={`e-${e.id}`} delay={i * 40} style={styles.row}>
                          <View style={[styles.rowInner, { flexDirection: rowRtl as 'row' }]}>
                            <View style={[styles.scoreBadge, { backgroundColor: tone.soft }]}>
                              <Text style={[styles.scoreText, { color: tone.color }]}>
                                {e.percent}%
                              </Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.rowTitle} numberOfLines={1}>
                                {displayTitle(e.title, 'امتحان')}
                              </Text>
                              <Text style={styles.rowMeta}>
                                امتحان · {e.subjectName} · {e.score}/{e.maxScore}
                              </Text>
                            </View>
                          </View>
                        </FadeIn>
                      );
                    })}
                    {(overview.recentTasks || []).slice(0, 2).map((task, i) => {
                      const tone = percentTone(task.percent);
                      return (
                        <FadeIn key={`t-${task.id}`} delay={120 + i * 40} style={styles.row}>
                          <View style={[styles.rowInner, { flexDirection: rowRtl as 'row' }]}>
                            <View style={[styles.scoreBadge, { backgroundColor: tone.soft }]}>
                              <Text style={[styles.scoreText, { color: tone.color }]}>
                                {task.percent}%
                              </Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.rowTitle} numberOfLines={1}>
                                {displayTitle(task.title, 'واجب')}
                              </Text>
                              <Text style={styles.rowMeta}>
                                واجب · {task.subjectName} · {task.score}/{task.maxScore}
                              </Text>
                            </View>
                          </View>
                        </FadeIn>
                      );
                    })}
                  </View>
                ) : (
                  <EmptyHint
                    title="لا درجات بعد"
                    body="درجات الامتحانات والواجبات تظهر هنا بعد تصحيح المعلّم."
                  />
                )}

                <SectionHeader
                  title="آراء المعلّمين"
                  action={
                    <Pressable onPress={() => router.push('/(parent)/opinions' as never)}>
                      <Text style={styles.link}>الكل</Text>
                    </Pressable>
                  }
                />
                {overview?.recentOpinions?.length ? (
                  <View style={styles.list}>
                    {overview.recentOpinions.slice(0, 3).map((o, i) => (
                      <FadeIn key={o.id} delay={i * 50} style={styles.opinion}>
                        <View style={[styles.opinionHead, { flexDirection: rowRtl as 'row' }]}>
                          <View style={styles.opinionIcon}>
                            <Icon name="MessageSquareQuote" size={16} color={t.guardian} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.rowTitle}>{o.teacherName}</Text>
                            <Text style={styles.rowMeta}>
                              {o.subjectName}
                              {o.gradedAt ? ` · ${formatShortDate(o.gradedAt)}` : ''}
                            </Text>
                          </View>
                        </View>
                        {o.title ? (
                          <Text style={styles.opinionTitle}>{o.title}</Text>
                        ) : null}
                        <Text style={styles.opinionBody}>{o.review}</Text>
                        {o.taskTitle ? (
                          <Text style={styles.opinionTask}>
                            على: {displayTitle(o.taskTitle, 'واجب')}
                          </Text>
                        ) : o.subjectName ? (
                          <Text style={styles.opinionTask}>المادة: {o.subjectName}</Text>
                        ) : null}
                      </FadeIn>
                    ))}
                  </View>
                ) : (
                  <EmptyHint
                    title="لا آراء مكتوبة بعد"
                    body="عندما يكتب المعلّم رأياً أو تقريراً عن ابنك من لوحة المعلّم سيظهر هنا."
                  />
                )}
              </>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: t.canvas },
  safe: { flex: 1 },
  content: { paddingBottom: 24 },
  hero: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 24,
    padding: 18,
    gap: 14,
    overflow: 'hidden',
  },
  heroTop: { alignItems: 'center', gap: 12 },
  heroActions: { alignItems: 'center', gap: 10 },
  logoutBtn: {
    flexDirection: rowRtl as 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
  },
  logoutText: {
    fontFamily: t.fonts.semiBold,
    fontSize: 13,
    color: '#fff',
  },
  hello: {
    fontFamily: t.fonts.bold,
    fontSize: 22,
    color: '#fff',
    textAlign: 'right',
  },
  heroSub: {
    fontFamily: t.fonts.regular,
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'right',
    marginTop: 4,
    lineHeight: 20,
  },
  heroChild: {
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 16,
    padding: 10,
  },
  heroChildName: {
    fontFamily: t.fonts.semiBold,
    fontSize: 15,
    color: '#fff',
    textAlign: 'right',
  },
  heroChildMeta: {
    fontFamily: t.fonts.regular,
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'right',
    marginTop: 2,
  },
  body: { paddingHorizontal: 16, paddingTop: 16, gap: 12 },
  statsRow: { gap: 12 },
  statsRowWide: { flexDirection: rowRtl as 'row', alignItems: 'stretch' },
  ringCard: {
    backgroundColor: t.card,
    borderRadius: t.radius.xl,
    borderWidth: 1,
    borderColor: t.line,
    padding: 18,
    alignItems: 'center',
    gap: 10,
    ...t.shadow.card,
  },
  ringHint: {
    fontFamily: t.fonts.regular,
    fontSize: 12,
    color: t.inkMute,
    textAlign: 'center',
  },
  statGrid: {
    flex: 1,
    flexDirection: rowRtl as 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  link: {
    fontFamily: t.fonts.semiBold,
    fontSize: 13,
    color: t.guardian,
  },
  list: { gap: 8 },
  row: {
    backgroundColor: t.card,
    borderRadius: t.radius.lg,
    borderWidth: 1,
    borderColor: t.line,
    padding: 12,
    ...t.shadow.card,
  },
  rowInner: { alignItems: 'center', gap: 12 },
  rowTitle: {
    fontFamily: t.fonts.semiBold,
    fontSize: 14,
    color: t.ink,
    textAlign: 'right',
  },
  rowMeta: {
    fontFamily: t.fonts.regular,
    fontSize: 12,
    color: t.inkMute,
    textAlign: 'right',
    marginTop: 2,
  },
  scoreBadge: {
    minWidth: 52,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: 'center',
  },
  scoreText: {
    fontFamily: t.fonts.bold,
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
  opinion: {
    backgroundColor: t.card,
    borderRadius: t.radius.lg,
    borderWidth: 1,
    borderColor: t.line,
    padding: 14,
    gap: 8,
    ...t.shadow.card,
  },
  opinionHead: { alignItems: 'center', gap: 10 },
  opinionIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: t.guardianSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  opinionTitle: {
    fontFamily: t.fonts.semiBold,
    fontSize: 14,
    color: t.ink,
    textAlign: 'right',
  },
  opinionBody: {
    fontFamily: t.fonts.regular,
    fontSize: 14,
    color: t.inkSoft,
    textAlign: 'right',
    lineHeight: 22,
  },
  opinionTask: {
    fontFamily: t.fonts.medium,
    fontSize: 12,
    color: t.inkMute,
    textAlign: 'right',
  },
});
