import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AppModal, Button, EmptyState } from '@/components/ui';
import {
  LoadingBlock,
  StudentScreen,
  rowRtl,
} from '@/components/student/ui';
import {
  getExam,
  gradeExam,
  saveExamAttempt,
} from '@/services/studentPortal';
import type { Exam, ExamQuestion } from '@/types/studentPortal';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

export default function ExamTakeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const finished = useRef(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const data = await getExam(String(id));
      if (!alive) return;
      if (data) {
        setExam(data.exam);
        setQuestions(data.questions);
        setSecondsLeft(data.exam.durationMin * 60);
      }
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  const finish = useCallback(
    async (auto = false) => {
      if (finished.current || !exam) return;
      finished.current = true;
      setSubmitting(true);
      const graded = gradeExam(questions, answers);
      const attempt = {
        id: `att-${Date.now()}`,
        examId: exam.id,
        score: graded.score,
        maxScore: graded.maxScore,
        percent: graded.percent,
        finishedAt: new Date().toISOString(),
        answers,
      };
      await saveExamAttempt(attempt);
      setSubmitting(false);
      router.replace({
        pathname: '/(student)/exam/[id]/result',
        params: {
          id: exam.id,
          attemptId: attempt.id,
          auto: auto ? '1' : '0',
        },
      } as never);
    },
    [answers, exam, questions, router],
  );

  useEffect(() => {
    if (loading || !exam || questions.length === 0) return;
    const t = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [loading, exam, questions.length]);

  useEffect(() => {
    if (
      !loading &&
      exam &&
      questions.length > 0 &&
      secondsLeft === 0 &&
      !finished.current
    ) {
      finish(true);
    }
  }, [secondsLeft, loading, exam, questions.length, finish]);

  const current = questions[index];
  const answeredCount = useMemo(
    () => questions.filter((q) => answers[q.id] != null).length,
    [answers, questions],
  );

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');

  if (loading) {
    return (
      <StudentScreen title="الامتحان" onBack>
        <LoadingBlock />
      </StudentScreen>
    );
  }

  if (!exam || !current) {
    return (
      <StudentScreen title="الامتحان" onBack>
        <EmptyState icon="ClipboardList" title="تعذر تحميل الأسئلة" />
      </StudentScreen>
    );
  }

  return (
    <StudentScreen
      title={exam.title}
      subtitle={`الوقت ${mm}:${ss} · ${answeredCount}/${questions.length}`}
      onBack
    >
      <View style={styles.dots}>
        {questions.map((q, i) => (
          <Pressable
            key={q.id}
            onPress={() => setIndex(i)}
            style={[
              styles.dot,
              i === index && styles.dotActive,
              answers[q.id] != null && styles.dotAnswered,
            ]}
          >
            <Text style={styles.dotText}>{i + 1}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.qText}>{current.text}</Text>

      {current.choices.map((choice, ci) => {
        const selected = answers[current.id] === ci;
        return (
          <Pressable
            key={ci}
            style={[styles.choice, selected && styles.choiceOn]}
            onPress={() =>
              setAnswers((prev) => ({ ...prev, [current.id]: ci }))
            }
          >
            <Text style={[styles.choiceText, selected && styles.choiceTextOn]}>
              {choice}
            </Text>
          </Pressable>
        );
      })}

      <View style={styles.nav}>
        <Button
          label="التالي"
          variant="outline"
          size="sm"
          disabled={index >= questions.length - 1}
          onPress={() => setIndex((i) => Math.min(questions.length - 1, i + 1))}
        />
        <Button
          label="السابق"
          variant="outline"
          size="sm"
          disabled={index <= 0}
          onPress={() => setIndex((i) => Math.max(0, i - 1))}
        />
      </View>

      <Button
        label={submitting ? 'جارٍ...' : 'تسليم الإجابات'}
        disabled={submitting}
        onPress={() => setConfirmOpen(true)}
      />

      <AppModal
        visible={confirmOpen}
        title="تأكيد التسليم؟"
        description={`أجبت عن ${answeredCount} من ${questions.length} أسئلة. التصحيح محلي تجريبي.`}
        confirmLabel="تسليم"
        onConfirm={() => {
          setConfirmOpen(false);
          finish(false);
        }}
        onClose={() => setConfirmOpen(false)}
      />
    </StudentScreen>
  );
}

const styles = StyleSheet.create({
  dots: {
    flexDirection: rowRtl,
    flexWrap: 'wrap',
    gap: 8,
  },
  dot: {
    width: 32,
    height: 32,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  dotActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  dotAnswered: { backgroundColor: colors.successSoft, borderColor: colors.success },
  dotText: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    color: colors.text,
  },
  qText: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
    color: colors.text,
    textAlign: 'right',
    lineHeight: 26,
    marginVertical: spacing.md,
  },
  choice: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  choiceOn: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  choiceText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.text,
    textAlign: 'right',
  },
  choiceTextOn: {
    fontFamily: fonts.semiBold,
    color: colors.primaryDark,
  },
  nav: {
    flexDirection: rowRtl,
    justifyContent: 'space-between',
    gap: spacing.md,
  },
});
