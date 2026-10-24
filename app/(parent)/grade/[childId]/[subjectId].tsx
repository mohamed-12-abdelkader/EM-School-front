import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { EmptyState, Icon } from '@/components/ui';
import { SegmentControl } from '@/components/admin';
import { parentTheme as t } from '@/components/parent/theme';
import {
  EmptyHint,
  FadeIn,
  LoadingBlock,
  formatShortDate,
  percentTone,
  rowRtl,
} from '@/components/parent/ui';
import { StudentPageShell } from '@/components/student/ui';
import {
  getParentChildExams,
  getParentChildTasks,
} from '@/services/parentPortal';
import type { ParentExamResult, ParentTaskGrade } from '@/types/parentPortal';
import { displayTitle } from '@/utils/displayTitle';

type Tab = 'exams' | 'tasks';

function avgPercent(items: Array<{ percent: number }>) {
  if (!items.length) return null;
  return Math.round(items.reduce((s, x) => s + x.percent, 0) / items.length);
}

export default function ParentGradeMaterialScreen() {
  const { childId, subjectId, teacher } = useLocalSearchParams<{
    childId: string;
    subjectId: string;
    teacher?: string;
  }>();
  const teacherFilter = teacher ? decodeURIComponent(String(teacher)) : '';

  const [exams, setExams] = useState<ParentExamResult[]>([]);
  const [tasks, setTasks] = useState<ParentTaskGrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('exams');

  const load = useCallback(
    async (soft = false) => {
      if (!childId || !subjectId) return;
      if (soft) setRefreshing(true);
      else setLoading(true);
      setError('');
      try {
        const [examData, taskData] = await Promise.all([
          getParentChildExams(String(childId)),
          getParentChildTasks(String(childId)),
        ]);
        const sid = String(subjectId);
        const matchTeacher = (name: string | null | undefined) => {
          if (!teacherFilter || teacherFilter === 'معلّم') return true;
          return (name || '').trim() === teacherFilter;
        };
        setExams(
          examData.exams.filter(
            (e) => e.subjectId === sid && matchTeacher(e.teacherName),
          ),
        );
        setTasks(
          taskData.tasks.filter(
            (task) => task.subjectId === sid && matchTeacher(task.teacherName),
          ),
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'تعذر تحميل الدرجات');
        if (!soft) {
          setExams([]);
          setTasks([]);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [childId, subjectId, teacherFilter],
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const subjectName =
    exams[0]?.subjectName || tasks[0]?.subjectName || 'المادة';
  const teacherName =
    teacherFilter ||
    exams[0]?.teacherName ||
    tasks[0]?.teacherName ||
    'معلّم';
  const materialName = [subjectName, teacherName].filter(Boolean).join(' ');

  const avgExam = avgPercent(exams);
  const avgTask = avgPercent(tasks);

  const empty = !loading && exams.length === 0 && tasks.length === 0;

  const headerStats = useMemo(
    () => (
      <View style={[styles.summary, { flexDirection: rowRtl as 'row' }]}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>
            {avgExam != null ? `${avgExam}%` : '—'}
          </Text>
          <Text style={styles.summaryLabel}>متوسط الامتحانات</Text>
          <Text style={styles.summaryHint}>{exams.length} امتحان</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: t.guardian }]}>
            {avgTask != null ? `${avgTask}%` : '—'}
          </Text>
          <Text style={styles.summaryLabel}>متوسط الواجبات</Text>
          <Text style={styles.summaryHint}>{tasks.length} واجب</Text>
        </View>
      </View>
    ),
    [avgExam, avgTask, exams.length, tasks.length],
  );

  if (loading) {
    return (
      <StudentPageShell title="درجات المادة" icon="GraduationCap">
        <LoadingBlock label="جارٍ تحميل درجات المادة..." />
      </StudentPageShell>
    );
  }

  if (empty) {
    return (
      <StudentPageShell title={materialName} icon="GraduationCap">
        <EmptyState
          icon="GraduationCap"
          title="لا درجات لهذه المادة"
          description={error || 'لم تُسجَّل امتحانات أو واجبات بعد'}
          actionLabel="إعادة المحاولة"
          onAction={() => load()}
        />
      </StudentPageShell>
    );
  }

  return (
    <StudentPageShell
      title={materialName}
      subtitle={`امتحانات وواجبات · ${subjectName}`}
      icon="GraduationCap"
      refreshing={refreshing}
      onRefresh={() => load(true)}
    >
      <FadeIn>
        <View style={[styles.hero, { flexDirection: rowRtl as 'row' }]}>
          <View style={styles.heroIcon}>
            <Icon name="GraduationCap" size={22} color={t.guardian} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>{materialName}</Text>
            <Text style={styles.heroMeta}>
              المادة: {subjectName} · المعلّم: {teacherName}
            </Text>
          </View>
        </View>
      </FadeIn>

      {headerStats}

      <SegmentControl
        value={tab}
        options={[
          { key: 'exams', label: `امتحانات (${exams.length})` },
          { key: 'tasks', label: `واجبات (${tasks.length})` },
        ]}
        onChange={setTab}
      />

      {tab === 'exams' ? (
        exams.length === 0 ? (
          <EmptyHint title="لا امتحانات" body="لا نتائج امتحانات مسجّلة لهذه المادة." />
        ) : (
          <View style={styles.list}>
            {exams.map((e, i) => {
              const tone = percentTone(e.percent);
              return (
                <FadeIn key={e.id} delay={Math.min(i, 10) * 35} style={styles.card}>
                  <View style={[styles.cardTop, { flexDirection: rowRtl as 'row' }]}>
                    <View style={[styles.badge, { backgroundColor: tone.soft }]}>
                      <Text style={[styles.badgeText, { color: tone.color }]}>
                        {e.percent}%
                      </Text>
                      <Text style={[styles.badgeSub, { color: tone.color }]}>
                        {e.score}/{e.maxScore}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle} numberOfLines={2}>
                        {displayTitle(e.title, 'امتحان')}
                      </Text>
                      {e.finishedAt ? (
                        <Text style={styles.cardDate}>
                          {formatShortDate(e.finishedAt)}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                </FadeIn>
              );
            })}
          </View>
        )
      ) : tasks.length === 0 ? (
        <EmptyHint title="لا واجبات" body="لا درجات واجبات مسجّلة لهذه المادة." />
      ) : (
        <View style={styles.list}>
          {tasks.map((task, i) => {
            const tone = percentTone(task.percent);
            return (
              <FadeIn key={task.id} delay={Math.min(i, 10) * 35} style={styles.card}>
                <View style={[styles.cardTop, { flexDirection: rowRtl as 'row' }]}>
                  <View style={[styles.badge, { backgroundColor: tone.soft }]}>
                    <Text style={[styles.badgeText, { color: tone.color }]}>
                      {task.percent}%
                    </Text>
                    <Text style={[styles.badgeSub, { color: tone.color }]}>
                      {task.score}/{task.maxScore}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle} numberOfLines={2}>
                      {displayTitle(task.title, 'واجب')}
                    </Text>
                    {task.gradedAt ? (
                      <Text style={styles.cardDate}>
                        {formatShortDate(task.gradedAt)}
                      </Text>
                    ) : null}
                  </View>
                </View>
                {task.review ? (
                  <View style={styles.reviewBox}>
                    <Text style={styles.reviewLabel}>رأي المعلّم</Text>
                    <Text style={styles.reviewText}>{task.review}</Text>
                  </View>
                ) : null}
              </FadeIn>
            );
          })}
        </View>
      )}
    </StudentPageShell>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    gap: 12,
    backgroundColor: t.guardianSoft,
    borderRadius: t.radius.xl,
    padding: 14,
    borderWidth: 1,
    borderColor: '#99F6E4',
    marginBottom: 10,
  },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: t.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontFamily: t.fonts.bold,
    fontSize: 18,
    color: t.ink,
    textAlign: 'right',
  },
  heroMeta: {
    fontFamily: t.fonts.regular,
    fontSize: 12,
    color: t.inkSoft,
    textAlign: 'right',
    marginTop: 4,
  },
  summary: {
    gap: 10,
    marginBottom: 12,
  },
  summaryItem: {
    flex: 1,
    backgroundColor: t.card,
    borderRadius: t.radius.lg,
    borderWidth: 1,
    borderColor: t.line,
    padding: 12,
    gap: 4,
    ...t.shadow.card,
  },
  summaryValue: {
    fontFamily: t.fonts.bold,
    fontSize: 22,
    color: t.brand,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  summaryLabel: {
    fontFamily: t.fonts.medium,
    fontSize: 13,
    color: t.inkSoft,
    textAlign: 'right',
  },
  summaryHint: {
    fontFamily: t.fonts.regular,
    fontSize: 11,
    color: t.inkMute,
    textAlign: 'right',
  },
  list: { gap: 10, marginTop: 12 },
  card: {
    backgroundColor: t.card,
    borderRadius: t.radius.lg,
    borderWidth: 1,
    borderColor: t.line,
    padding: 14,
    gap: 10,
    ...t.shadow.card,
  },
  cardTop: { alignItems: 'flex-start', gap: 12 },
  badge: {
    minWidth: 64,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  badgeText: {
    fontFamily: t.fonts.bold,
    fontSize: 16,
    fontVariant: ['tabular-nums'],
  },
  badgeSub: {
    fontFamily: t.fonts.medium,
    fontSize: 11,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  cardTitle: {
    fontFamily: t.fonts.semiBold,
    fontSize: 15,
    color: t.ink,
    textAlign: 'right',
  },
  cardDate: {
    fontFamily: t.fonts.regular,
    fontSize: 11,
    color: t.inkMute,
    textAlign: 'right',
    marginTop: 4,
  },
  reviewBox: {
    backgroundColor: t.guardianSoft,
    borderRadius: 12,
    padding: 10,
    gap: 4,
  },
  reviewLabel: {
    fontFamily: t.fonts.semiBold,
    fontSize: 12,
    color: t.guardianDeep,
    textAlign: 'right',
  },
  reviewText: {
    fontFamily: t.fonts.regular,
    fontSize: 13,
    color: t.inkSoft,
    textAlign: 'right',
    lineHeight: 20,
  },
});
