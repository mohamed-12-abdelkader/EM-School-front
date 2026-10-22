import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Badge, Button, EmptyState } from '@/components/ui';
import { LoadingBlock, StudentScreen, rowRtl } from '@/components/student/ui';
import {
  getExam,
  getExamAttempts,
} from '@/services/studentPortal';
import type { ExamAttempt, ExamQuestion } from '@/types/studentPortal';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

export default function ExamResultScreen() {
  const { id, attemptId, auto } = useLocalSearchParams<{
    id: string;
    attemptId?: string;
    auto?: string;
  }>();
  const router = useRouter();
  const [attempt, setAttempt] = useState<ExamAttempt | null>(null);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        setLoading(true);
        const [examData, attempts] = await Promise.all([
          getExam(String(id)),
          getExamAttempts(),
        ]);
        if (!alive) return;
        const found =
          attempts.find((a) => a.id === attemptId) ||
          attempts.find((a) => a.examId === id) ||
          null;
        setAttempt(found);
        setQuestions(examData?.questions ?? []);
        setLoading(false);
      })();
      return () => {
        alive = false;
      };
    }, [id, attemptId]),
  );

  if (loading) {
    return (
      <StudentScreen title="النتيجة" onBack>
        <LoadingBlock />
      </StudentScreen>
    );
  }

  if (!attempt) {
    return (
      <StudentScreen title="النتيجة" onBack>
        <EmptyState icon="FileBarChart" title="لا توجد نتيجة" />
      </StudentScreen>
    );
  }

  return (
    <StudentScreen title="نتيجة الامتحان" onBack>
      {auto === '1' ? (
        <Badge label="انتهى الوقت — تم التسليم تلقائياً" tone="warning" />
      ) : null}
      <View style={styles.scoreCard}>
        <Text style={styles.scoreBig}>
          {attempt.score}/{attempt.maxScore}
        </Text>
        <Text style={styles.percent}>{attempt.percent}%</Text>
        <Text style={styles.hint}>نتيجة تجريبية محسوبة محلياً</Text>
      </View>

      <Text style={styles.section}>مراجعة الإجابات</Text>
      {questions.map((q, i) => {
        const chosen = attempt.answers[q.id];
        const correct = chosen === q.correctIndex;
        return (
          <View key={q.id} style={styles.qCard}>
            <View style={styles.qHead}>
              <Text style={styles.qTitle}>
                {i + 1}. {q.text}
              </Text>
              <Badge label={correct ? 'صح' : 'خطأ'} tone={correct ? 'success' : 'danger'} />
            </View>
            <Text style={styles.line}>
              إجابتك: {chosen == null ? '—' : q.choices[chosen]}
            </Text>
            {!correct ? (
              <Text style={styles.line}>
                الصحيحة: {q.choices[q.correctIndex]}
              </Text>
            ) : null}
            {q.explanation ? (
              <Text style={styles.explain}>{q.explanation}</Text>
            ) : null}
          </View>
        );
      })}

      <Button
        label="سجل الامتحانات"
        variant="outline"
        onPress={() => router.replace('/(student)/results' as never)}
      />
      <Button
        label="العودة للامتحانات"
        onPress={() => router.replace('/(student)/exams' as never)}
      />
    </StudentScreen>
  );
}

const styles = StyleSheet.create({
  scoreCard: {
    alignItems: 'center',
    gap: 4,
    padding: spacing.xl,
    backgroundColor: colors.primarySoft,
    borderRadius: radii.xl,
  },
  scoreBig: {
    fontFamily: fonts.bold,
    fontSize: 36,
    color: colors.primary,
  },
  percent: {
    fontFamily: fonts.semiBold,
    fontSize: 18,
    color: colors.primaryDark,
  },
  hint: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
  },
  section: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
    color: colors.text,
    textAlign: 'right',
  },
  qCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: 6,
  },
  qHead: {
    flexDirection: rowRtl,
    justifyContent: 'space-between',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  qTitle: {
    flex: 1,
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: colors.text,
    textAlign: 'right',
  },
  line: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'right',
  },
  explain: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'right',
    lineHeight: 18,
  },
});
