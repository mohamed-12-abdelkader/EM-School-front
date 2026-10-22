import { useCallback, useState } from 'react';
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
import { Avatar, Badge, Icon } from '@/components/ui';
import {
  DAY_NAMES,
  FadeIn,
  FeedItem,
  IconBadge,
  LoadingBlock,
  ProgressBar,
  SectionTitle,
  SoftCard,
  assignmentStatusLabel,
  formatShortDate,
  rowRtl,
} from '@/components/student/ui';
import { studentTheme as t } from '@/components/student/theme';
import { useAuth } from '@/auth/AuthContext';
import {
  getStudentDashboard,
  getTeacher,
  getSubject,
} from '@/services/studentPortal';
import type { StudentDashboardData } from '@/types/studentPortal';

const SHORTCUTS = [
  { label: 'اسأل AI', icon: 'Bot', href: '/(student)/(tabs)/ai', color: t.brand },
  { label: 'امتحان', icon: 'ClipboardList', href: '/(student)/exams', color: '#0EA5E9' },
  { label: 'محاضرة', icon: 'Presentation', href: '/(student)/lectures', color: t.accent },
  { label: 'واجبات', icon: 'FileText', href: '/(student)/assignments', color: t.warning },
  { label: 'مذاكرة', icon: 'CalendarDays', href: '/(student)/planner', color: t.success },
];

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
  const grade = studentMeta?.profile.grade_name || 'الصف الأول الثانوي';

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[...t.heroGradient]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroBg}
      />
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
              tintColor="#fff"
            />
          }
          showsVerticalScrollIndicator={false}
        >
          <FadeIn>
            <View style={styles.hello}>
              <View style={styles.helloText}>
                <Text style={styles.eyebrow}>
                  {studentMeta?.school.name || 'EM School'} ·{' '}
                  {studentMeta?.profile.academic_year || '2025/2026'}
                </Text>
                <Text style={styles.title}>مرحباً، {name.split(' ')[0]} 👋</Text>
                <View style={styles.gradePill}>
                  <Icon name="GraduationCap" size={14} color="#fff" />
                  <Text style={styles.gradeText}>{grade}</Text>
                </View>
              </View>
              <View style={styles.avatarRing}>
                <Avatar name={name} size={56} color={t.brand} />
              </View>
            </View>
          </FadeIn>

          {loading || !data ? (
            <LoadingBlock />
          ) : (
            <>
              <FadeIn delay={80}>
                <View style={styles.stats}>
                  <Stat
                    icon="Trophy"
                    label="نقاطك"
                    value={String(data.points)}
                    color={t.accent}
                  />
                  <Stat
                    icon="BookOpen"
                    label="مواد"
                    value={String(data.subjectsCount)}
                    color={t.brand}
                  />
                  <Stat
                    icon="FileText"
                    label="واجبات"
                    value={String(data.pendingAssignments)}
                    color={t.warning}
                  />
                  <Stat
                    icon="Presentation"
                    label="محاضرات"
                    value={String(data.upcomingLectures)}
                    color="#0EA5E9"
                  />
                </View>
              </FadeIn>

              <FadeIn delay={140}>
                <SoftCard>
                  <View style={styles.progressHead}>
                    <View style={styles.progressTitleRow}>
                      <IconBadge name="TrendingUp" size={32} />
                      <Text style={styles.progressLabel}>إنجازك الدراسي</Text>
                    </View>
                    <Text style={styles.progressValue}>{data.completionRate}%</Text>
                  </View>
                  <ProgressBar value={data.completionRate} height={10} />
                  <Text style={styles.weekHint}>نشاط الأسبوع</Text>
                  <View style={styles.weekBars}>
                    {data.weekProgress.map((v, i) => (
                      <View key={i} style={styles.weekCol}>
                        <View style={styles.weekTrack}>
                          <View
                            style={[
                              styles.weekFill,
                              { height: Math.max(8, (v / 100) * 56) },
                            ]}
                          />
                        </View>
                        <Text style={styles.weekDay}>
                          {DAY_NAMES[i].slice(0, 2)}
                        </Text>
                      </View>
                    ))}
                  </View>
                </SoftCard>
              </FadeIn>

              <SectionTitle title="اختصارات" icon="Sparkles" />
              <View style={styles.shortcuts}>
                {SHORTCUTS.map((s) => (
                  <Pressable
                    key={s.label}
                    style={styles.shortcut}
                    onPress={() => router.push(s.href as never)}
                  >
                    <View
                      style={[
                        styles.shortcutIcon,
                        { backgroundColor: `${s.color}18` },
                      ]}
                    >
                      <Icon name={s.icon} size={22} color={s.color} strokeWidth={2} />
                    </View>
                    <Text style={styles.shortcutLabel}>{s.label}</Text>
                  </Pressable>
                ))}
              </View>

              <SectionTitle
                title="جدول اليوم"
                icon="CalendarClock"
                actionLabel="الكل"
                onAction={() => router.push('/(student)/timetable' as never)}
              />
              {data.todaySlots.length === 0 ? (
                <SoftCard>
                  <Text style={styles.empty}>لا توجد حصص اليوم — استغل الوقت للمذاكرة</Text>
                </SoftCard>
              ) : (
                data.todaySlots.map((slot) => {
                  const sub = getSubject(slot.subjectId);
                  const teacher = getTeacher(slot.teacherId);
                  return (
                    <SoftCard
                      key={slot.id}
                      onPress={() => {
                        if (slot.lectureId) {
                          router.push(
                            `/(student)/lecture/${slot.lectureId}` as never,
                          );
                        }
                      }}
                      padded={false}
                    >
                      <View style={styles.slot}>
                        <View
                          style={[
                            styles.slotAccent,
                            { backgroundColor: sub?.color || t.brand },
                          ]}
                        />
                        <View style={styles.slotBody}>
                          <View style={styles.slotTimeRow}>
                            <Icon name="Clock" size={14} color={t.brand} />
                            <Text style={styles.slotTime}>
                              {slot.start} – {slot.end}
                            </Text>
                          </View>
                          <Text style={styles.slotTitle}>{sub?.name}</Text>
                          <Text style={styles.slotMeta}>
                            {teacher?.name}
                            {slot.room ? ` · ${slot.room}` : ''}
                          </Text>
                        </View>
                        <IconBadge
                          name="Presentation"
                          color={sub?.color || t.brand}
                          size={40}
                        />
                      </View>
                    </SoftCard>
                  );
                })
              )}

              <SectionTitle
                title="محاضرات قادمة"
                icon="Presentation"
                actionLabel="الكل"
                onAction={() => router.push('/(student)/lectures' as never)}
              />
              {data.upcomingLecturesList.map((lec) => {
                const sub = getSubject(lec.subjectId);
                const teacher = getTeacher(lec.teacherId);
                return (
                  <FeedItem
                    key={lec.id}
                    icon="Presentation"
                    iconColor={sub?.color}
                    title={lec.title}
                    meta={`${sub?.name} · ${teacher?.name} · ${formatShortDate(lec.date)}`}
                    onPress={() =>
                      router.push(`/(student)/lecture/${lec.id}` as never)
                    }
                    badge={<Badge label={`${lec.durationMin} د`} tone="info" />}
                  />
                );
              })}

              <SectionTitle
                title="واجبات قريبة"
                icon="FileText"
                actionLabel="الكل"
                onAction={() => router.push('/(student)/assignments' as never)}
              />
              {data.dueAssignments.map((a) => {
                const sub = getSubject(a.subjectId);
                return (
                  <FeedItem
                    key={a.id}
                    icon="ClipboardList"
                    iconColor={
                      a.status === 'overdue' ? t.danger : t.warning
                    }
                    title={a.title}
                    meta={`${sub?.name} · تسليم ${formatShortDate(a.dueAt)}`}
                    onPress={() =>
                      router.push(`/(student)/assignment/${a.id}` as never)
                    }
                    badge={
                      <Badge
                        label={assignmentStatusLabel[a.status] || a.status}
                        tone={
                          a.status === 'overdue'
                            ? 'danger'
                            : a.status === 'new'
                              ? 'warning'
                              : 'primary'
                        }
                      />
                    }
                  />
                );
              })}

              <SectionTitle
                title="آخر النتائج"
                icon="FileBarChart"
                actionLabel="التقارير"
                onAction={() => router.push('/(student)/results' as never)}
              />
              {data.recentResults.map((r) => (
                <FeedItem
                  key={r.id}
                  icon="Trophy"
                  iconColor={r.percent >= 70 ? t.success : t.warning}
                  title={`${r.score}/${r.maxScore} · ${r.percent}%`}
                  meta={`${formatShortDate(r.finishedAt)} · بيانات تجريبية`}
                  badge={
                    <Badge
                      label={r.percent >= 70 ? 'جيد' : 'راجع'}
                      tone={r.percent >= 70 ? 'success' : 'warning'}
                    />
                  }
                />
              ))}

              <SectionTitle
                title="تحديات"
                icon="Trophy"
                actionLabel="المزيد"
                onAction={() => router.push('/(student)/competitions' as never)}
              />
              {data.competitions.map((c) => (
                <FeedItem
                  key={c.id}
                  icon="Trophy"
                  iconColor={t.accent}
                  title={c.title}
                  meta={`${c.rewardPoints} نقطة · ${c.participants} مشارك`}
                  onPress={() =>
                    router.push(`/(student)/competition/${c.id}` as never)
                  }
                />
              ))}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function Stat({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: string;
  color: string;
  icon: string;
}) {
  return (
    <View style={styles.stat}>
      <IconBadge name={icon} color={color} size={34} />
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: t.canvas },
  heroBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 210,
  },
  safe: { flex: 1, backgroundColor: 'transparent' },
  content: {
    paddingHorizontal: t.space.lg,
    paddingBottom: t.space['4xl'],
    gap: t.space.md,
  },
  hello: {
    flexDirection: rowRtl,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: t.space.sm,
    paddingBottom: t.space.md,
    gap: t.space.md,
  },
  helloText: { flex: 1, gap: 6 },
  eyebrow: {
    fontFamily: t.fonts.medium,
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'right',
  },
  title: {
    fontFamily: t.fonts.bold,
    fontSize: 26,
    color: '#fff',
    textAlign: 'right',
  },
  gradePill: {
    alignSelf: 'flex-end',
    flexDirection: rowRtl,
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.16)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: t.radius.full,
  },
  gradeText: {
    fontFamily: t.fonts.semiBold,
    fontSize: 12,
    color: '#fff',
  },
  avatarRing: {
    padding: 3,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.45)',
  },
  stats: {
    flexDirection: rowRtl,
    flexWrap: 'wrap',
    gap: 10,
  },
  stat: {
    flexGrow: 1,
    minWidth: '22%',
    backgroundColor: t.card,
    borderRadius: t.radius.lg,
    borderWidth: 1,
    borderColor: t.line,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 4,
    ...t.shadow.card,
  },
  statValue: {
    fontFamily: t.fonts.bold,
    fontSize: 18,
  },
  statLabel: {
    fontFamily: t.fonts.medium,
    fontSize: 11,
    color: t.inkMute,
  },
  progressHead: {
    flexDirection: rowRtl,
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  progressTitleRow: {
    flexDirection: rowRtl,
    alignItems: 'center',
    gap: 8,
  },
  progressLabel: {
    fontFamily: t.fonts.semiBold,
    fontSize: 14,
    color: t.ink,
  },
  progressValue: {
    fontFamily: t.fonts.bold,
    fontSize: 20,
    color: t.brand,
  },
  weekHint: {
    fontFamily: t.fonts.regular,
    fontSize: 12,
    color: t.inkMute,
    textAlign: 'right',
    marginTop: 14,
    marginBottom: 8,
  },
  weekBars: {
    flexDirection: rowRtl,
    height: 72,
    gap: 6,
    alignItems: 'flex-end',
  },
  weekCol: { flex: 1, alignItems: 'center', gap: 6 },
  weekTrack: {
    height: 56,
    width: '72%',
    backgroundColor: '#E2E8F0',
    borderRadius: 8,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  weekFill: {
    width: '100%',
    backgroundColor: t.brand,
    borderRadius: 8,
  },
  weekDay: {
    fontFamily: t.fonts.medium,
    fontSize: 10,
    color: t.inkMute,
  },
  shortcuts: {
    flexDirection: rowRtl,
    justifyContent: 'space-between',
    gap: 6,
  },
  shortcut: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  shortcutIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortcutLabel: {
    fontFamily: t.fonts.semiBold,
    fontSize: 11,
    color: t.inkSoft,
    textAlign: 'center',
  },
  slot: {
    flexDirection: rowRtl,
    alignItems: 'center',
    overflow: 'hidden',
  },
  slotAccent: {
    width: 5,
    alignSelf: 'stretch',
  },
  slotBody: {
    flex: 1,
    padding: t.space.md,
    gap: 4,
  },
  slotTimeRow: {
    flexDirection: rowRtl,
    alignItems: 'center',
    gap: 6,
  },
  slotTime: {
    fontFamily: t.fonts.semiBold,
    fontSize: 12,
    color: t.brand,
  },
  slotTitle: {
    fontFamily: t.fonts.bold,
    fontSize: 15,
    color: t.ink,
    textAlign: 'right',
  },
  slotMeta: {
    fontFamily: t.fonts.regular,
    fontSize: 12,
    color: t.inkSoft,
    textAlign: 'right',
  },
  empty: {
    fontFamily: t.fonts.regular,
    fontSize: 13,
    color: t.inkMute,
    textAlign: 'center',
    lineHeight: 20,
  },
});
