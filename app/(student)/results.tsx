import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { EmptyState, Icon } from '@/components/ui';
import {
  FadeIn,
  IconBadge,
  LoadingBlock,
  StudentPageShell,
  formatShortDate,
  rowRtl,
} from '@/components/student/ui';
import { studentTheme as t } from '@/components/student/theme';
import { getStudentResults } from '@/services/studentPortal';

type ExamRow = {
  id: string;
  examId: string;
  examTitle?: string;
  subjectName?: string;
  score: number;
  maxScore: number;
  percent: number;
  finishedAt: string;
};

type TaskGrade = {
  id: string;
  taskId: string;
  taskTitle: string;
  subjectName: string;
  score: number;
  maxScore: number;
  review: string | null;
};

function percentTone(p: number) {
  if (p >= 85) return { color: t.success, soft: t.successSoft };
  if (p >= 60) return { color: t.sky, soft: t.skySoft };
  if (p >= 40) return { color: t.warning, soft: t.warningSoft };
  return { color: t.danger, soft: t.dangerSoft };
}

export default function ResultsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [attempts, setAttempts] = useState<ExamRow[]>([]);
  const [taskGrades, setTaskGrades] = useState<TaskGrade[]>([]);
  const [error, setError] = useState('');

  const load = useCallback(async (soft = false) => {
    if (soft) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const data = await getStudentResults();
      setAttempts((data.attempts as ExamRow[]) || []);
      setTaskGrades((data.taskGrades as TaskGrade[]) || []);
    } catch (err) {
      setAttempts([]);
      setTaskGrades([]);
      setError(err instanceof Error ? err.message : 'تعذر تحميل النتائج');
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

  const avg = useMemo(() => {
    if (attempts.length === 0) return null;
    const sum = attempts.reduce((s, a) => s + (a.percent || 0), 0);
    return Math.round(sum / attempts.length);
  }, [attempts]);

  return (
    <StudentPageShell
      title="النتائج"
      subtitle="درجاتك وتقارير التصحيح"
      icon="FileBarChart"
      refreshing={refreshing}
      onRefresh={() => load(true)}
    >
      {loading ? (
        <LoadingBlock />
      ) : error ? (
        <EmptyState
          icon="AlertCircle"
          title="تعذر التحميل"
          description={error}
          actionLabel="إعادة المحاولة"
          onAction={() => load()}
        />
      ) : (
        <>
          <FadeIn>
            <View style={styles.stats}>
              <View style={[styles.stat, styles.statPrimary]}>
                <Text style={styles.statValue}>
                  {avg != null ? `${avg}%` : '—'}
                </Text>
                <Text style={styles.statLabel}>متوسط الامتحانات</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{attempts.length}</Text>
                <Text style={styles.statLabel}>امتحانات</Text>
              </View>
              <View style={styles.stat}>
                <Text style={[styles.statValue, { color: t.success }]}>
                  {taskGrades.length}
                </Text>
                <Text style={styles.statLabel}>واجبات</Text>
              </View>
            </View>
          </FadeIn>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>نتائج الامتحانات</Text>
            {attempts.length === 0 ? (
              <EmptyState icon="FileBarChart" title="لا نتائج بعد" />
            ) : (
              <View style={styles.list}>
                {attempts.map((a, i) => {
                  const tone = percentTone(a.percent);
                  return (
                    <FadeIn key={a.id} delay={i * 35}>
                      <Pressable
                        style={({ pressed }) => [
                          styles.card,
                          pressed && { opacity: 0.94 },
                        ]}
                        onPress={() =>
                          router.push({
                            pathname: '/(student)/exam/[id]/result',
                            params: { id: a.examId, attemptId: a.id },
                          } as never)
                        }
                      >
                        <IconBadge
                          name="ClipboardList"
                          color={tone.color}
                          size={44}
                        />
                        <View style={styles.cardText}>
                          <Text style={styles.title} numberOfLines={2}>
                            {a.examTitle || 'امتحان'}
                          </Text>
                          <Text style={styles.meta} numberOfLines={1}>
                            {[
                              a.subjectName,
                              formatShortDate(a.finishedAt),
                              `${a.score}/${a.maxScore}`,
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </Text>
                        </View>
                        <View
                          style={[styles.scorePill, { backgroundColor: tone.soft }]}
                        >
                          <Text style={[styles.scoreText, { color: tone.color }]}>
                            {a.percent}%
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
            <Text style={styles.sectionTitle}>تقييم الواجبات</Text>
            {taskGrades.length === 0 ? (
              <Text style={styles.note}>لا تقييمات واجبات بعد</Text>
            ) : (
              <View style={styles.list}>
                {taskGrades.map((g, i) => {
                  const pct = g.maxScore
                    ? Math.round((g.score / g.maxScore) * 100)
                    : 0;
                  const tone = percentTone(pct);
                  return (
                    <FadeIn key={g.id} delay={i * 35}>
                      <Pressable
                        style={({ pressed }) => [
                          styles.card,
                          pressed && { opacity: 0.94 },
                        ]}
                        onPress={() =>
                          router.push(
                            `/(student)/assignment/${g.taskId}` as never,
                          )
                        }
                      >
                        <IconBadge name="FileText" color={tone.color} size={44} />
                        <View style={styles.cardText}>
                          <Text style={styles.title} numberOfLines={2}>
                            {g.taskTitle}
                          </Text>
                          <Text style={styles.meta} numberOfLines={2}>
                            {`${g.subjectName} · ${g.score}/${g.maxScore}${
                              g.review ? ` · ${g.review}` : ''
                            }`}
                          </Text>
                        </View>
                        <View
                          style={[styles.scorePill, { backgroundColor: tone.soft }]}
                        >
                          <Text style={[styles.scoreText, { color: tone.color }]}>
                            {pct}%
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
        </>
      )}
    </StudentPageShell>
  );
}

const styles = StyleSheet.create({
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
  statPrimary: {
    backgroundColor: t.brandSoft,
    borderColor: '#BFDBFE',
  },
  statValue: {
    fontFamily: t.fonts.bold,
    fontSize: 20,
    color: t.brandDeep,
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontFamily: t.fonts.medium,
    fontSize: 11,
    color: t.inkMute,
    textAlign: 'center',
  },
  section: { gap: 10 },
  sectionTitle: {
    fontFamily: t.fonts.bold,
    fontSize: 15,
    color: t.ink,
    textAlign: 'right',
  },
  list: { gap: 10 },
  card: {
    flexDirection: rowRtl,
    alignItems: 'center',
    gap: 12,
    backgroundColor: t.card,
    borderRadius: t.radius.xl,
    borderWidth: 1,
    borderColor: t.line,
    padding: t.space.md,
    ...t.shadow.card,
  },
  cardText: { flex: 1, gap: 4, minWidth: 0 },
  title: {
    fontFamily: t.fonts.bold,
    fontSize: 14,
    color: t.ink,
    textAlign: 'right',
  },
  meta: {
    fontFamily: t.fonts.regular,
    fontSize: 12,
    color: t.inkMute,
    textAlign: 'right',
  },
  scorePill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: t.radius.full,
  },
  scoreText: {
    fontFamily: t.fonts.bold,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  note: {
    fontFamily: t.fonts.regular,
    fontSize: 13,
    color: t.inkMute,
    textAlign: 'right',
  },
});
