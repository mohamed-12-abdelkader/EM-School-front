import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Badge, Button, EmptyState } from '@/components/ui';
import {
  FadeIn,
  LoadingBlock,
  StudentScreen,
  rowRtl,
} from '@/components/student/ui';
import { studentTheme as t } from '@/components/student/theme';
import { getExamResult } from '@/services/studentPortal';

type ResultQ = {
  id: string;
  text: string;
  choices: string[];
  choiceIds: string[];
  correctIndex: number;
  explanation?: string;
  isCorrect: boolean | null;
  pointsAwarded: number;
  points: number;
  yourChoiceId: string | null;
  yourWritten: string | null;
  type: string;
};

export default function ExamResultScreen() {
  const { id, auto } = useLocalSearchParams<{
    id: string;
    attemptId?: string;
    auto?: string;
  }>();
  const router = useRouter();
  const [score, setScore] = useState({ score: 0, max: 0, percent: 0 });
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState<ResultQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        setLoading(true);
        try {
          const data = await getExamResult(String(id));
          if (!alive) return;
          setScore({
            score: data.attempt.score,
            max: data.attempt.maxScore,
            percent: data.attempt.percent,
          });
          setTitle(data.exam?.title || '');
          setQuestions(data.questions);
          setMissing(false);
        } catch {
          if (alive) setMissing(true);
        } finally {
          if (alive) setLoading(false);
        }
      })();
      return () => {
        alive = false;
      };
    }, [id]),
  );

  const wrongOnly = useMemo(
    () => questions.filter((q) => q.isCorrect === false),
    [questions],
  );
  const correctCount = questions.filter((q) => q.isCorrect === true).length;
  const pendingCount = questions.filter((q) => q.isCorrect == null).length;

  if (loading) {
    return (
      <StudentScreen title="النتيجة" onBack hero>
        <LoadingBlock />
      </StudentScreen>
    );
  }

  if (missing) {
    return (
      <StudentScreen title="النتيجة" onBack hero>
        <EmptyState
          icon="FileBarChart"
          title="لا توجد نتيجة بعد"
          description="أكمل الامتحان وسلّمه أولاً لترى درجتك والتصحيح."
        />
        <Button
          label="دخول الامتحان"
          onPress={() => router.replace(`/(student)/exam/${id}` as never)}
        />
      </StudentScreen>
    );
  }

  return (
    <StudentScreen title="نتيجة الامتحان" onBack hero>
      {auto === '1' ? (
        <Badge label="انتهى الوقت — تم التسليم تلقائياً" tone="warning" />
      ) : null}

      <FadeIn>
        <View style={styles.scoreCard}>
          {title ? <Text style={styles.examTitle}>{title}</Text> : null}
          <Text style={styles.scoreBig}>
            {score.score}/{score.max}
          </Text>
          <Text style={styles.percent}>{score.percent}%</Text>
          <View style={styles.summaryRow}>
            <Badge label={`${correctCount} صح`} tone="success" />
            <Badge label={`${wrongOnly.length} خطأ`} tone="danger" />
            {pendingCount > 0 ? (
              <Badge label={`${pendingCount} بانتظار`} tone="neutral" />
            ) : null}
          </View>
          <Text style={styles.hint}>درجتك محفوظة من تصحيح المدرس/النظام</Text>
        </View>
      </FadeIn>

      {wrongOnly.length > 0 ? (
        <FadeIn delay={60}>
          <Text style={styles.section}>تصحيح الأسئلة الخاطئة</Text>
          {wrongOnly.map((q, i) => {
            const yourIdx =
              q.yourChoiceId != null
                ? q.choiceIds.findIndex((cid) => cid === q.yourChoiceId)
                : -1;
            const yourMcq =
              yourIdx >= 0 ? q.choices[yourIdx] : q.yourChoiceId ? '—' : 'لم تُجب';

            return (
              <View key={q.id} style={[styles.qCard, styles.qWrong]}>
                <View style={styles.qHead}>
                  <Text style={styles.qTitle}>
                    {i + 1}. {q.text}
                  </Text>
                  <Badge label="خطأ" tone="danger" />
                </View>
                <Text style={styles.line}>
                  درجتك: {q.pointsAwarded}/{q.points}
                </Text>
                {q.type === 'written' ? (
                  <Text style={styles.line}>إجابتك: {q.yourWritten || '—'}</Text>
                ) : (
                  <>
                    <Text style={styles.lineWrong}>إجابتك: {yourMcq}</Text>
                    <Text style={styles.lineCorrect}>
                      الصحيحة: {q.choices[q.correctIndex] ?? '—'}
                    </Text>
                  </>
                )}
                {q.explanation ? (
                  <Text style={styles.explain}>{q.explanation}</Text>
                ) : null}
              </View>
            );
          })}
        </FadeIn>
      ) : (
        <FadeIn delay={60}>
          <View style={styles.allGood}>
            <Text style={styles.allGoodText}>
              {pendingCount > 0
                ? 'لا أخطاء في الاختيار من متعدد — الأسئلة المقالية بانتظار المدرس'
                : 'أحسنت — لا توجد إجابات خاطئة'}
            </Text>
          </View>
        </FadeIn>
      )}

      <Text style={styles.section}>كل الأسئلة</Text>
      {questions.map((q, i) => {
        const yourIdx =
          q.yourChoiceId != null
            ? q.choiceIds.findIndex((cid) => cid === q.yourChoiceId)
            : -1;
        const yourMcq =
          yourIdx >= 0 ? q.choices[yourIdx] : q.yourChoiceId ? '—' : 'لم تُجب';

        return (
          <View key={q.id} style={styles.qCard}>
            <View style={styles.qHead}>
              <Text style={styles.qTitle}>
                {i + 1}. {q.text}
              </Text>
              <Badge
                label={
                  q.isCorrect === true
                    ? 'صح'
                    : q.isCorrect === false
                      ? 'خطأ'
                      : 'بانتظار'
                }
                tone={
                  q.isCorrect === true
                    ? 'success'
                    : q.isCorrect === false
                      ? 'danger'
                      : 'neutral'
                }
              />
            </View>
            <Text style={styles.line}>
              درجتك: {q.pointsAwarded}/{q.points}
            </Text>
            {q.type === 'written' ? (
              <Text style={styles.line}>إجابتك: {q.yourWritten || '—'}</Text>
            ) : (
              <>
                <Text style={styles.line}>إجابتك: {yourMcq}</Text>
                {q.isCorrect === false ? (
                  <Text style={styles.lineCorrect}>
                    الصحيحة: {q.choices[q.correctIndex] ?? '—'}
                  </Text>
                ) : null}
              </>
            )}
            {q.explanation ? (
              <Text style={styles.explain}>{q.explanation}</Text>
            ) : null}
          </View>
        );
      })}

      <Button
        label="عودة للامتحانات"
        variant="outline"
        onPress={() => router.replace('/(student)/exams' as never)}
      />
    </StudentScreen>
  );
}

const styles = StyleSheet.create({
  scoreCard: {
    backgroundColor: t.card,
    borderRadius: t.radius.xl,
    borderWidth: 1,
    borderColor: t.line,
    padding: t.space.xl,
    alignItems: 'center',
    gap: 6,
    ...t.shadow.card,
  },
  examTitle: {
    fontFamily: t.fonts.semiBold,
    fontSize: 14,
    color: t.inkSoft,
    textAlign: 'center',
  },
  scoreBig: {
    fontFamily: t.fonts.bold,
    fontSize: 40,
    color: t.ink,
    fontVariant: ['tabular-nums'],
  },
  percent: {
    fontFamily: t.fonts.semiBold,
    fontSize: 20,
    color: t.brand,
    fontVariant: ['tabular-nums'],
  },
  summaryRow: {
    flexDirection: rowRtl,
    gap: 8,
    marginTop: 6,
  },
  hint: {
    fontFamily: t.fonts.regular,
    fontSize: 12,
    color: t.inkMute,
    textAlign: 'center',
  },
  section: {
    fontFamily: t.fonts.bold,
    fontSize: 16,
    color: t.ink,
    textAlign: 'right',
    marginTop: t.space.sm,
  },
  allGood: {
    backgroundColor: t.successSoft,
    borderRadius: t.radius.lg,
    padding: t.space.md,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  allGoodText: {
    fontFamily: t.fonts.semiBold,
    fontSize: 13,
    color: t.success,
    textAlign: 'right',
  },
  qCard: {
    backgroundColor: t.card,
    borderRadius: t.radius.lg,
    borderWidth: 1,
    borderColor: t.line,
    padding: t.space.md,
    gap: 6,
    ...t.shadow.card,
  },
  qWrong: {
    borderColor: '#FECDD3',
    backgroundColor: '#FFF1F2',
  },
  qHead: {
    flexDirection: rowRtl,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: t.space.sm,
  },
  qTitle: {
    flex: 1,
    fontFamily: t.fonts.semiBold,
    fontSize: 14,
    color: t.ink,
    textAlign: 'right',
  },
  line: {
    fontFamily: t.fonts.regular,
    fontSize: 13,
    color: t.inkMute,
    textAlign: 'right',
  },
  lineWrong: {
    fontFamily: t.fonts.regular,
    fontSize: 13,
    color: t.danger,
    textAlign: 'right',
  },
  lineCorrect: {
    fontFamily: t.fonts.semiBold,
    fontSize: 13,
    color: t.success,
    textAlign: 'right',
  },
  explain: {
    fontFamily: t.fonts.regular,
    fontSize: 12,
    color: t.inkSoft,
    textAlign: 'right',
    marginTop: 4,
  },
});
