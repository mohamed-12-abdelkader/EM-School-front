import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BackHandler,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { AppModal, Button, EmptyState, useToast } from '@/components/ui';
import {
  LoadingBlock,
  StudentScreen,
  rowRtl,
} from '@/components/student/ui';
import { studentTheme as t } from '@/components/student/theme';
import { ApiError } from '@/api/client';
import { getExam, submitExam } from '@/services/studentPortal';
import type { Exam, ExamQuestion } from '@/types/studentPortal';

export default function ExamTakeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const { showToast } = useToast();
  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [written, setWritten] = useState<Record<string, string>>({});
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [lockOpen, setLockOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const finished = useRef(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const data = await getExam(String(id));
        if (!alive) return;
        if (!data) {
          setExam(null);
          setQuestions([]);
          return;
        }
        if (data.exam.attempted) {
          router.replace(`/(student)/exam/${id}/result` as never);
          return;
        }
        setExam(data.exam);
        setQuestions(data.questions);
        setSecondsLeft(Math.max(60, (data.exam.durationMin || 30) * 60));
      } catch {
        if (alive) {
          setExam(null);
          setQuestions([]);
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id, router]);

  /** Block leaving until submit */
  useEffect(() => {
    const unsub = navigation.addListener('beforeRemove', (e) => {
      if (finished.current) return;
      e.preventDefault();
      setLockOpen(true);
    });
    return unsub;
  }, [navigation]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (finished.current) return false;
      setLockOpen(true);
      return true;
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (finished.current) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  const finish = useCallback(
    async (auto = false) => {
      if (finished.current || !exam) return;
      finished.current = true;
      setSubmitting(true);
      try {
        const res = await submitExam(exam.id, answers, questions, written);
        setSubmitting(false);
        router.replace({
          pathname: '/(student)/exam/[id]/result',
          params: {
            id: exam.id,
            attemptId: res.attempt.id,
            auto: auto ? '1' : '0',
          },
        } as never);
      } catch (err) {
        finished.current = false;
        setSubmitting(false);
        const msg =
          err instanceof ApiError && err.message === 'Exam already submitted'
            ? 'تم تسليم هذا الامتحان مسبقاً'
            : err instanceof Error
              ? err.message
              : 'تعذر تسليم الامتحان';
        showToast(msg, 'danger');
        if (err instanceof ApiError && err.status === 400) {
          router.replace(`/(student)/exam/${exam.id}/result` as never);
        }
      }
    },
    [answers, written, exam, questions, router, showToast],
  );

  useEffect(() => {
    if (loading || !exam || questions.length === 0) return;
    const timer = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(timer);
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
    () =>
      questions.filter((q) =>
        q.type === 'written' ? !!written[q.id]?.trim() : answers[q.id] != null,
      ).length,
    [answers, written, questions],
  );

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');
  const urgent = secondsLeft > 0 && secondsLeft <= 60;

  if (loading) {
    return (
      <StudentScreen title="الامتحان" hero>
        <LoadingBlock />
      </StudentScreen>
    );
  }

  if (!exam || !current) {
    return (
      <StudentScreen title="الامتحان" onBack hero>
        <EmptyState icon="ClipboardList" title="تعذر تحميل الأسئلة" />
      </StudentScreen>
    );
  }

  return (
    <StudentScreen
      title={exam.title}
      subtitle={`${urgent ? '! ' : ''}الوقت ${mm}:${ss} · ${answeredCount}/${questions.length}`}
      hero
      right={
        <View style={styles.lockPill}>
          <Text style={styles.lockPillText}>مقفل</Text>
        </View>
      }
    >
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${Math.round((answeredCount / Math.max(1, questions.length)) * 100)}%`,
            },
          ]}
        />
      </View>

      <View style={styles.dots}>
        {questions.map((q, i) => (
          <Pressable
            key={q.id}
            onPress={() => setIndex(i)}
            style={[
              styles.dot,
              i === index && styles.dotActive,
              (q.type === 'written'
                ? !!written[q.id]?.trim()
                : answers[q.id] != null) && styles.dotAnswered,
            ]}
          >
            <Text style={styles.dotText}>{i + 1}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.qCard}>
        <Text style={styles.qIndex}>
          سؤال {index + 1} من {questions.length}
          {current.points != null ? ` · ${current.points} درجة` : ''}
        </Text>
        <Text style={styles.qText}>{current.text}</Text>

        {current.type === 'written' ? (
          <TextInput
            style={styles.written}
            multiline
            textAlign="right"
            placeholder="اكتب إجابتك هنا..."
            placeholderTextColor={t.inkMute}
            value={written[current.id] || ''}
            onChangeText={(v) =>
              setWritten((prev) => ({ ...prev, [current.id]: v }))
            }
          />
        ) : (
          current.choices.map((choice, ci) => {
            const selected = answers[current.id] === ci;
            return (
              <Pressable
                key={ci}
                style={[styles.choice, selected && styles.choiceOn]}
                onPress={() =>
                  setAnswers((prev) => ({ ...prev, [current.id]: ci }))
                }
              >
                <View style={[styles.choiceBullet, selected && styles.choiceBulletOn]}>
                  <Text style={[styles.choiceLetter, selected && styles.choiceLetterOn]}>
                    {String.fromCharCode(65 + ci)}
                  </Text>
                </View>
                <Text style={[styles.choiceText, selected && styles.choiceTextOn]}>
                  {choice}
                </Text>
              </Pressable>
            );
          })
        )}
      </View>

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
        label={submitting ? 'جارٍ التسليم...' : 'تسليم والحصول على الدرجة'}
        disabled={submitting}
        onPress={() => setConfirmOpen(true)}
      />

      <AppModal
        visible={confirmOpen}
        title="تأكيد التسليم؟"
        description={`أجبت عن ${answeredCount} من ${questions.length} أسئلة. بعد التسليم تُحسب درجتك ويُعرض تصحيح الأخطاء.`}
        confirmLabel="تسليم الآن"
        onConfirm={() => {
          setConfirmOpen(false);
          finish(false);
        }}
        onClose={() => setConfirmOpen(false)}
      />

      <AppModal
        visible={lockOpen}
        title="لا يمكن الخروج الآن"
        description="الامتحان مقفل حتى تُسلّم إجاباتك. سلّم أولاً لترى درجتك وتصحيح الأسئلة الخاطئة."
        confirmLabel="تسليم والخروج"
        cancelLabel="متابعة الامتحان"
        onConfirm={() => {
          setLockOpen(false);
          finish(false);
        }}
        onClose={() => setLockOpen(false)}
      />
    </StudentScreen>
  );
}

const styles = StyleSheet.create({
  lockPill: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  lockPillText: {
    fontFamily: t.fonts.semiBold,
    fontSize: 11,
    color: '#fff',
  },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: t.line,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: t.brand,
    borderRadius: 999,
  },
  dots: {
    flexDirection: rowRtl,
    flexWrap: 'wrap',
    gap: 8,
  },
  dot: {
    width: 34,
    height: 34,
    borderRadius: t.radius.full,
    borderWidth: 1,
    borderColor: t.line,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.card,
  },
  dotActive: { borderColor: t.brand, backgroundColor: t.brandSoft },
  dotAnswered: { backgroundColor: t.successSoft, borderColor: t.success },
  dotText: {
    fontFamily: t.fonts.semiBold,
    fontSize: 12,
    color: t.ink,
  },
  qCard: {
    backgroundColor: t.card,
    borderRadius: t.radius.xl,
    borderWidth: 1,
    borderColor: t.line,
    padding: t.space.lg,
    gap: 10,
    ...t.shadow.card,
  },
  qIndex: {
    fontFamily: t.fonts.semiBold,
    fontSize: 12,
    color: t.brand,
    textAlign: 'right',
  },
  qText: {
    fontFamily: t.fonts.semiBold,
    fontSize: 16,
    color: t.ink,
    textAlign: 'right',
    lineHeight: 26,
  },
  written: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: t.line,
    borderRadius: t.radius.lg,
    padding: t.space.md,
    fontFamily: t.fonts.regular,
    fontSize: 14,
    color: t.ink,
    backgroundColor: t.cardMuted,
    textAlignVertical: 'top',
  },
  choice: {
    flexDirection: rowRtl,
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: t.line,
    backgroundColor: t.cardMuted,
    borderRadius: t.radius.lg,
    padding: t.space.md,
  },
  choiceOn: {
    borderColor: t.brand,
    backgroundColor: t.brandSoft,
  },
  choiceBullet: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: t.line,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.card,
  },
  choiceBulletOn: {
    borderColor: t.brand,
    backgroundColor: t.brand,
  },
  choiceLetter: {
    fontFamily: t.fonts.bold,
    fontSize: 12,
    color: t.inkSoft,
  },
  choiceLetterOn: { color: '#fff' },
  choiceText: {
    flex: 1,
    fontFamily: t.fonts.regular,
    fontSize: 14,
    color: t.ink,
    textAlign: 'right',
  },
  choiceTextOn: {
    fontFamily: t.fonts.semiBold,
    color: t.brandDeep,
  },
  nav: {
    flexDirection: rowRtl,
    justifyContent: 'space-between',
    gap: t.space.md,
  },
});
