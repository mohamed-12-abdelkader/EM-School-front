import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Avatar, EmptyState, Icon } from '@/components/ui';
import {
  FadeIn,
  IconBadge,
  LoadingBlock,
  ProgressBar,
  StudentPageShell,
  assignmentStatusLabel,
  formatShortDate,
  lectureStatusLabel,
  rowRtl,
} from '@/components/student/ui';
import { studentTheme as t } from '@/components/student/theme';
import {
  ensureThreadForTeacher,
  getSubjectDetail,
} from '@/services/studentPortal';
import type {
  Assignment,
  AssignmentStatus,
  Exam,
  Lecture,
  StudentSubject,
  StudentTeacher,
} from '@/types/studentPortal';

function assignmentColor(status: AssignmentStatus) {
  if (status === 'overdue') return t.danger;
  if (status === 'graded') return t.success;
  if (status === 'submitted') return t.sky;
  if (status === 'new' || status === 'in_progress') return t.warning;
  return t.inkMute;
}

function assignmentSoft(status: AssignmentStatus) {
  if (status === 'overdue') return t.dangerSoft;
  if (status === 'graded') return t.successSoft;
  if (status === 'submitted') return t.skySoft;
  return t.warningSoft;
}

export default function SubjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [subject, setSubject] = useState<StudentSubject | null>(null);
  const [teacher, setTeacher] = useState<StudentTeacher | null>(null);
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [announcements, setAnnouncements] = useState<string[]>([]);

  const load = useCallback(
    async (soft = false) => {
      if (soft) setRefreshing(true);
      else setLoading(true);
      setError('');
      try {
        const data = await getSubjectDetail(String(id));
        if (data) {
          setSubject(data.subject);
          setTeacher(data.teacher);
          setLectures(data.lectures);
          setAssignments(data.assignments);
          setExams(data.exams);
          setAnnouncements(data.announcements);
        } else {
          setSubject(null);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'تعذر تحميل المادة');
        setSubject(null);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [id],
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const pendingTasks = useMemo(
    () =>
      assignments.filter(
        (a) =>
          a.status === 'new' ||
          a.status === 'overdue' ||
          a.status === 'in_progress',
      ).length,
    [assignments],
  );
  const openExams = useMemo(
    () => exams.filter((e) => !e.attempted).length,
    [exams],
  );

  const [chatBusy, setChatBusy] = useState(false);
  const [chatError, setChatError] = useState('');

  const chatTeacher = async () => {
    if (!teacher || chatBusy) return;
    setChatBusy(true);
    setChatError('');
    try {
      const thread = await ensureThreadForTeacher(teacher.id);
      router.push(`/(student)/chat/${thread.id}` as never);
    } catch (err) {
      setChatError(
        err instanceof Error ? err.message : 'تعذر فتح المحادثة مع المدرس',
      );
    } finally {
      setChatBusy(false);
    }
  };

  const accent = subject?.color || t.brand;

  if (loading) {
    return (
      <StudentPageShell title="المادة" icon="BookOpen">
        <LoadingBlock />
      </StudentPageShell>
    );
  }

  if (error || !subject) {
    return (
      <StudentPageShell title="المادة" icon="BookOpen">
        <EmptyState
          icon="BookOpen"
          title={error ? 'تعذر التحميل' : 'المادة غير موجودة'}
          description={error || undefined}
          actionLabel="إعادة المحاولة"
          onAction={() => load()}
        />
      </StudentPageShell>
    );
  }

  return (
    <StudentPageShell
      title={subject.name}
      subtitle={teacher?.name || subject.teacherName || 'مادة دراسية'}
      icon="BookOpen"
      refreshing={refreshing}
      onRefresh={() => load(true)}
    >
      <FadeIn>
        <View style={styles.hero}>
          <View style={[styles.heroAccent, { backgroundColor: accent }]} />
          <View style={styles.heroBody}>
            <View style={[styles.heroTop, { flexDirection: rowRtl as 'row' }]}>
              <Avatar
                name={teacher?.name || subject.name}
                color={teacher?.avatarColor || accent}
                size={56}
              />
              <View style={styles.heroText}>
                <Text style={styles.teacherName}>
                  {teacher?.name || subject.teacherName || 'مدرس المادة'}
                </Text>
                <Text style={styles.heroDesc} numberOfLines={2}>
                  {subject.description || 'تابع دروسك وواجباتك وامتحاناتك هنا'}
                </Text>
              </View>
            </View>

            <View style={styles.progressBlock}>
              <View
                style={[styles.progressHead, { flexDirection: rowRtl as 'row' }]}
              >
                <Text style={styles.progressLabel}>تقدمك في المادة</Text>
                <Text style={[styles.progressPct, { color: accent }]}>
                  {subject.progress}%
                </Text>
              </View>
              <ProgressBar value={subject.progress} color={accent} height={10} />
            </View>

            {teacher ? (
              <Pressable
                onPress={chatTeacher}
                disabled={chatBusy}
                style={({ pressed }) => [
                  styles.chatBtn,
                  { flexDirection: rowRtl as 'row' },
                  pressed && { opacity: 0.9 },
                  chatBusy && { opacity: 0.7 },
                ]}
              >
                <Icon name="MessageSquare" size={16} color={t.brandDeep} />
                <Text style={styles.chatBtnText}>
                  {chatBusy ? 'جارٍ الفتح…' : 'تواصل مع المدرس'}
                </Text>
              </Pressable>
            ) : null}
            {chatError ? <Text style={styles.chatError}>{chatError}</Text> : null}
          </View>
        </View>
      </FadeIn>

      <FadeIn delay={40}>
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{lectures.length}</Text>
            <Text style={styles.statLabel}>محاضرات</Text>
          </View>
          <View style={[styles.stat, pendingTasks > 0 && styles.statWarn]}>
            <Text
              style={[
                styles.statValue,
                pendingTasks > 0 && { color: t.warning },
              ]}
            >
              {assignments.length}
            </Text>
            <Text style={styles.statLabel}>
              واجبات{pendingTasks > 0 ? ` · ${pendingTasks} معلّق` : ''}
            </Text>
          </View>
          <View style={[styles.stat, openExams > 0 && styles.statPrimary]}>
            <Text
              style={[
                styles.statValue,
                openExams > 0 && { color: t.brandDeep },
              ]}
            >
              {exams.length}
            </Text>
            <Text style={styles.statLabel}>
              امتحانات{openExams > 0 ? ` · ${openExams} مفتوح` : ''}
            </Text>
          </View>
        </View>
      </FadeIn>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>إعلانات المدرس</Text>
        {announcements.length === 0 ? (
          <View style={styles.emptySoft}>
            <Icon name="Bell" size={16} color={t.inkMute} />
            <Text style={styles.emptySoftText}>لا توجد إعلانات حالياً</Text>
          </View>
        ) : (
          <View style={styles.announceList}>
            {announcements.map((a, i) => (
              <View key={i} style={styles.announceCard}>
                <View style={styles.announceDot} />
                <Text style={styles.announceText}>{a}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <View style={[styles.sectionHead, { flexDirection: rowRtl as 'row' }]}>
          <Text style={styles.sectionTitle}>المحاضرات</Text>
          <Pressable
            onPress={() => router.push('/(student)/lectures' as never)}
            hitSlop={6}
          >
            <Text style={styles.sectionLink}>الكل</Text>
          </Pressable>
        </View>
        {lectures.length === 0 ? (
          <View style={styles.emptySoft}>
            <Text style={styles.emptySoftText}>لا محاضرات بعد</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {lectures.map((l, i) => {
              const color =
                l.completed || l.status === 'completed'
                  ? t.success
                  : l.status === 'live'
                    ? t.danger
                    : accent;
              return (
                <FadeIn key={l.id} delay={i * 30}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.card,
                      pressed && { opacity: 0.94 },
                    ]}
                    onPress={() =>
                      router.push(`/(student)/lecture/${l.id}` as never)
                    }
                  >
                    <IconBadge name="Presentation" color={color} size={44} />
                    <View style={styles.cardText}>
                      <Text style={styles.cardTitle} numberOfLines={2}>
                        {l.title}
                      </Text>
                      <Text style={styles.cardMeta} numberOfLines={1}>
                        {[
                          formatShortDate(l.date),
                          `${l.durationMin} د`,
                          l.watchProgress > 0
                            ? `مشاهدة ${l.watchProgress}%`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.pill,
                        {
                          backgroundColor:
                            l.completed || l.status === 'completed'
                              ? t.successSoft
                              : t.brandSoft,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.pillText,
                          {
                            color:
                              l.completed || l.status === 'completed'
                                ? t.success
                                : t.brandDeep,
                          },
                        ]}
                      >
                        {l.watchProgress > 0 && l.watchProgress < 100
                          ? `${l.watchProgress}%`
                          : lectureStatusLabel[l.status]}
                      </Text>
                    </View>
                    <Icon name="ChevronLeft" size={16} color={t.inkMute} />
                  </Pressable>
                </FadeIn>
              );
            })}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <View style={[styles.sectionHead, { flexDirection: rowRtl as 'row' }]}>
          <Text style={styles.sectionTitle}>الواجبات</Text>
          <Pressable
            onPress={() => router.push('/(student)/assignments' as never)}
            hitSlop={6}
          >
            <Text style={styles.sectionLink}>الكل</Text>
          </Pressable>
        </View>
        {assignments.length === 0 ? (
          <View style={styles.emptySoft}>
            <Text style={styles.emptySoftText}>لا واجبات لهذه المادة</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {assignments.map((a, i) => {
              const color = assignmentColor(a.status);
              return (
                <FadeIn key={a.id} delay={i * 30}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.card,
                      pressed && { opacity: 0.94 },
                    ]}
                    onPress={() =>
                      router.push(`/(student)/assignment/${a.id}` as never)
                    }
                  >
                    <IconBadge name="FileText" color={color} size={44} />
                    <View style={styles.cardText}>
                      <Text style={styles.cardTitle} numberOfLines={2}>
                        {a.title}
                      </Text>
                      <Text style={styles.cardMeta} numberOfLines={1}>
                        تسليم {formatShortDate(a.dueAt) || '—'}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.pill,
                        { backgroundColor: assignmentSoft(a.status) },
                      ]}
                    >
                      <Text style={[styles.pillText, { color }]}>
                        {a.status === 'graded' && a.score != null
                          ? `${a.score}/${a.maxScore}`
                          : assignmentStatusLabel[a.status]}
                      </Text>
                    </View>
                    <Icon name="ChevronLeft" size={16} color={t.inkMute} />
                  </Pressable>
                </FadeIn>
              );
            })}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <View style={[styles.sectionHead, { flexDirection: rowRtl as 'row' }]}>
          <Text style={styles.sectionTitle}>الامتحانات</Text>
          <Pressable
            onPress={() => router.push('/(student)/exams' as never)}
            hitSlop={6}
          >
            <Text style={styles.sectionLink}>الكل</Text>
          </Pressable>
        </View>
        {exams.length === 0 ? (
          <View style={styles.emptySoft}>
            <Text style={styles.emptySoftText}>لا امتحانات منشورة بعد</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {exams.map((e, i) => {
              const color = e.attempted ? t.success : t.brand;
              return (
                <FadeIn key={e.id} delay={i * 30}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.card,
                      pressed && { opacity: 0.94 },
                    ]}
                    onPress={() =>
                      router.push(`/(student)/exam/${e.id}` as never)
                    }
                  >
                    <IconBadge
                      name={e.attempted ? 'Trophy' : 'ClipboardList'}
                      color={color}
                      size={44}
                    />
                    <View style={styles.cardText}>
                      <Text style={styles.cardTitle} numberOfLines={2}>
                        {e.title}
                      </Text>
                      <Text style={styles.cardMeta} numberOfLines={1}>
                        {[
                          `${e.questionIds.length || '—'} أسئلة`,
                          `${e.durationMin} د`,
                        ].join(' · ')}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.pill,
                        {
                          backgroundColor: e.attempted
                            ? t.successSoft
                            : t.brandSoft,
                        },
                      ]}
                    >
                      <Text style={[styles.pillText, { color }]}>
                        {e.attempted
                          ? e.score != null
                            ? `${e.score}/${e.maxScore}`
                            : 'مكتمل'
                          : 'ابدأ'}
                      </Text>
                    </View>
                    <Icon name="ChevronLeft" size={16} color={t.inkMute} />
                  </Pressable>
                </FadeIn>
              );
            })}
          </View>
        )}
      </View>
    </StudentPageShell>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: t.card,
    borderRadius: t.radius.xl,
    borderWidth: 1,
    borderColor: t.line,
    overflow: 'hidden',
    ...t.shadow.card,
  },
  heroAccent: { height: 5 },
  heroBody: {
    padding: t.space.lg,
    gap: 14,
  },
  heroTop: {
    alignItems: 'center',
    gap: 12,
  },
  heroText: { flex: 1, gap: 4, minWidth: 0 },
  teacherName: {
    fontFamily: t.fonts.bold,
    fontSize: 16,
    color: t.ink,
    textAlign: 'right',
  },
  heroDesc: {
    fontFamily: t.fonts.regular,
    fontSize: 13,
    color: t.inkSoft,
    textAlign: 'right',
    lineHeight: 20,
  },
  progressBlock: { gap: 8 },
  progressHead: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontFamily: t.fonts.medium,
    fontSize: 12,
    color: t.inkMute,
  },
  progressPct: {
    fontFamily: t.fonts.bold,
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
  chatBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: t.brandSoft,
    borderRadius: t.radius.lg,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingVertical: 12,
  },
  chatBtnText: {
    fontFamily: t.fonts.semiBold,
    fontSize: 13,
    color: t.brandDeep,
  },
  chatError: {
    fontFamily: t.fonts.medium,
    fontSize: 12,
    color: t.danger,
    textAlign: 'center',
  },
  stats: {
    flexDirection: rowRtl,
    gap: 8,
  },
  stat: {
    flex: 1,
    backgroundColor: t.card,
    borderRadius: t.radius.lg,
    borderWidth: 1,
    borderColor: t.line,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 2,
    ...t.shadow.card,
  },
  statWarn: {
    backgroundColor: t.warningSoft,
    borderColor: '#FDE68A',
  },
  statPrimary: {
    backgroundColor: t.brandSoft,
    borderColor: '#BFDBFE',
  },
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
    textAlign: 'center',
  },
  section: { gap: 10 },
  sectionHead: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontFamily: t.fonts.bold,
    fontSize: 15,
    color: t.ink,
    textAlign: 'right',
  },
  sectionLink: {
    fontFamily: t.fonts.semiBold,
    fontSize: 13,
    color: t.brand,
  },
  emptySoft: {
    flexDirection: rowRtl,
    alignItems: 'center',
    gap: 8,
    backgroundColor: t.cardMuted,
    borderRadius: t.radius.lg,
    padding: t.space.md,
  },
  emptySoftText: {
    fontFamily: t.fonts.regular,
    fontSize: 13,
    color: t.inkMute,
    textAlign: 'right',
  },
  announceList: { gap: 8 },
  announceCard: {
    flexDirection: rowRtl,
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: t.card,
    borderRadius: t.radius.lg,
    borderWidth: 1,
    borderColor: t.line,
    padding: t.space.md,
  },
  announceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: t.brand,
    marginTop: 6,
  },
  announceText: {
    flex: 1,
    fontFamily: t.fonts.regular,
    fontSize: 13,
    color: t.ink,
    textAlign: 'right',
    lineHeight: 20,
  },
  list: { gap: 10 },
  card: {
    flexDirection: rowRtl,
    alignItems: 'center',
    gap: 10,
    backgroundColor: t.card,
    borderRadius: t.radius.xl,
    borderWidth: 1,
    borderColor: t.line,
    padding: t.space.md,
    ...t.shadow.card,
  },
  cardText: { flex: 1, gap: 4, minWidth: 0 },
  cardTitle: {
    fontFamily: t.fonts.bold,
    fontSize: 14,
    color: t.ink,
    textAlign: 'right',
  },
  cardMeta: {
    fontFamily: t.fonts.regular,
    fontSize: 12,
    color: t.inkMute,
    textAlign: 'right',
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: t.radius.full,
  },
  pillText: {
    fontFamily: t.fonts.semiBold,
    fontSize: 11,
  },
});
