import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BackHandler,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppModal, EmptyState, Icon, useToast } from '@/components/ui';
import { LoadingBlock, rowRtl } from '@/components/student/ui';
import { studentTheme as t } from '@/components/student/theme';
import { ApiError } from '@/api/client';
import { getExam, startExam, submitExam } from '@/services/studentPortal';
import type { Exam, ExamQuestion } from '@/types/studentPortal';

const CHOICE_LETTERS = ['أ', 'ب', 'ج', 'د', 'هـ', 'و'];

const rtlProps =
  Platform.OS === 'web' ? ({ dir: 'rtl' } as Record<string, string>) : {};

function formatClock(total: number) {
  const s = Math.max(0, Math.floor(total));
  const hh = Math.floor(s / 3600);
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return hh > 0 ? `${hh}:${mm}:${ss}` : `${mm}:${ss}`;
}

export default function ExamTakeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const { showToast } = useToast();
  const { width } = useWindowDimensions();
  const wide = width >= 720;
  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [written, setWritten] = useState<Record<string, string>>({});
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [deadlineMs, setDeadlineMs] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [lockOpen, setLockOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const finished = useRef(false);
  const answersRef = useRef(answers);
  const writtenRef = useRef(written);
  answersRef.current = answers;
  writtenRef.current = written;

  const syncFromServer = useCallback(async () => {
    const data = await getExam(String(id));
    if (!data) return null;
    if (data.exam.attempted) {
      router.replace(`/(student)/exam/${id}/result` as never);
      return null;
    }
    let remaining = data.exam.remainingSeconds ?? 0;
    let endsAt = data.exam.endsAt;
    if (!data.exam.inProgress) {
      const started = await startExam(String(id));
      remaining = started.attempt.remainingSeconds;
      endsAt = started.attempt.endsAt;
    }
    const left = Math.max(0, Math.floor(Number(remaining) || 0));
    setExam({
      ...data.exam,
      inProgress: true,
      remainingSeconds: left,
      endsAt: endsAt ?? data.exam.endsAt,
    });
    setQuestions(data.questions);
    setSecondsLeft(left);
    setDeadlineMs(Date.now() + left * 1000);
    return data;
  }, [id, router]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const data = await syncFromServer();
        if (!alive || !data) return;
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
  }, [syncFromServer]);

  useEffect(() => {
    if (loading || !exam || finished.current) return;
    const tick = setInterval(() => {
      void (async () => {
        try {
          const data = await getExam(String(id));
          if (!data || finished.current) return;
          if (data.exam.attempted) {
            finished.current = true;
            router.replace(`/(student)/exam/${id}/result` as never);
            return;
          }
          if (data.exam.remainingSeconds != null) {
            const left = Math.max(0, Math.floor(data.exam.remainingSeconds));
            setSecondsLeft(left);
            setDeadlineMs(Date.now() + left * 1000);
          }
        } catch {
          /* keep local countdown */
        }
      })();
    }, 30000);
    return () => clearInterval(tick);
  }, [loading, exam, id, router]);

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
        const res = await submitExam(
          exam.id,
          answersRef.current,
          questions,
          writtenRef.current,
          { timedOut: auto },
        );
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
    [exam, questions, router, showToast],
  );

  useEffect(() => {
    if (loading || !exam || questions.length === 0) return;
    const timer = setInterval(() => {
      if (deadlineMs != null) {
        setSecondsLeft(Math.max(0, Math.floor((deadlineMs - Date.now()) / 1000)));
      } else {
        setSecondsLeft((s) => Math.max(0, s - 1));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [loading, exam, questions.length, deadlineMs]);

  useEffect(() => {
    if (
      !loading &&
      exam &&
      questions.length > 0 &&
      secondsLeft === 0 &&
      !finished.current
    ) {
      showToast('انتهى الوقت — جارٍ التسليم التلقائي', 'warning');
      finish(true);
    }
  }, [secondsLeft, loading, exam, questions.length, finish, showToast]);

  const current = questions[index];
  const answeredCount = useMemo(
    () =>
      questions.filter((q) =>
        q.type === 'written' ? !!written[q.id]?.trim() : answers[q.id] != null,
      ).length,
    [answers, written, questions],
  );

  const progressPct = Math.round(
    (answeredCount / Math.max(1, questions.length)) * 100,
  );
  const timePct = exam?.durationMin
    ? Math.min(
        100,
        Math.round((secondsLeft / Math.max(1, exam.durationMin * 60)) * 100),
      )
    : 0;
  const urgent = secondsLeft > 0 && secondsLeft <= 60;
  const critical = secondsLeft > 0 && secondsLeft <= 15;

  if (loading) {
    return (
      <View style={styles.root}>
        <SafeAreaView style={styles.safe} edges={['top']} {...rtlProps}>
          <LoadingBlock />
        </SafeAreaView>
      </View>
    );
  }

  if (!exam || !current) {
    return (
      <View style={styles.root}>
        <SafeAreaView style={styles.safe} edges={['top']} {...rtlProps}>
          <EmptyState icon="ClipboardList" title="تعذر تحميل الأسئلة" />
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.blob} pointerEvents="none" />
      <SafeAreaView style={styles.safe} edges={['top']} {...rtlProps}>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            wide && styles.contentWide,
            { maxWidth: wide ? 880 : undefined, alignSelf: 'center', width: '100%' },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <MotiView
            from={{ opacity: 0, translateY: 12, scale: 0.98 }}
            animate={{ opacity: 1, translateY: 0, scale: 1 }}
            transition={{ type: 'timing', duration: 380 }}
          >
            <LinearGradient
              colors={
                critical
                  ? ['#9F1239', '#E11D48', '#FB7185']
                  : urgent
                    ? ['#92400E', '#D97706', '#F59E0B']
                    : ['#1E1B4B', '#3730A3', '#4F46E5']
              }
              start={{ x: 0.05, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.hero}
            >
              <MotiView
                from={{ opacity: 0.3, scale: 0.9 }}
                animate={{ opacity: 0.5, scale: 1 }}
                transition={{ type: 'timing', duration: 2000, loop: true }}
                style={styles.heroOrb}
              />

              <View style={styles.heroTop}>
                <Pressable
                  onPress={() => setLockOpen(true)}
                  style={styles.lockBtn}
                  hitSlop={8}
                >
                  <Icon name="ShieldAlert" size={16} color="#E0E7FF" />
                  <Text style={styles.lockBtnText}>مقفل</Text>
                </Pressable>

                <View style={styles.heroTitles}>
                  <Text style={styles.heroTitle} numberOfLines={1}>
                    {exam.title}
                  </Text>
                  <Text style={styles.heroSub}>
                    {answeredCount}/{questions.length} مجاب · سؤال {index + 1}
                  </Text>
                </View>

                <MotiView
                  animate={{ scale: urgent || critical ? [1, 1.05, 1] : 1 }}
                  transition={{
                    type: 'timing',
                    duration: critical ? 650 : 1100,
                    loop: urgent || critical,
                  }}
                  style={[
                    styles.timerChip,
                    urgent && !critical && styles.timerChipUrgent,
                    critical && styles.timerChipCritical,
                  ]}
                >
                  <Icon
                    name="Clock"
                    size={15}
                    color={critical ? '#fff' : urgent ? '#92400E' : '#EEF2FF'}
                  />
                  <Text
                    style={[
                      styles.timerChipText,
                      urgent && !critical && styles.timerChipTextUrgent,
                    ]}
                  >
                    {formatClock(secondsLeft)}
                  </Text>
                </MotiView>
              </View>

              <View style={styles.timeTrack}>
                <View
                  style={[
                    styles.timeFill,
                    {
                      width: `${timePct}%`,
                      backgroundColor: critical
                        ? '#FECDD3'
                        : urgent
                          ? '#FDE68A'
                          : '#A5B4FC',
                    },
                  ]}
                />
              </View>
              <Text style={styles.timeHint}>الوقت متزامن مع السيرفر</Text>
            </LinearGradient>
          </MotiView>

          <View style={styles.progressCard}>
            <View style={styles.progressHead}>
              <Text style={styles.progressLabel}>التقدّم</Text>
              <Text style={styles.progressPct}>{progressPct}%</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
            </View>
            <View style={styles.dots}>
              {questions.map((q, i) => {
                const answered =
                  q.type === 'written'
                    ? !!written[q.id]?.trim()
                    : answers[q.id] != null;
                return (
                  <MotiView
                    key={q.id}
                    from={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: i === index ? 1.08 : 1 }}
                    transition={{ type: 'timing', duration: 220, delay: i * 30 }}
                  >
                    <Pressable
                      onPress={() => setIndex(i)}
                      style={[
                        styles.dot,
                        i === index && styles.dotActive,
                        answered && styles.dotAnswered,
                      ]}
                    >
                      <Text
                        style={[
                          styles.dotText,
                          (i === index || answered) && styles.dotTextOn,
                        ]}
                      >
                        {i + 1}
                      </Text>
                    </Pressable>
                  </MotiView>
                );
              })}
            </View>
          </View>

          <MotiView
            key={current.id}
            from={{ opacity: 0, translateY: 14, scale: 0.98 }}
            animate={{ opacity: 1, translateY: 0, scale: 1 }}
            transition={{ type: 'timing', duration: 300 }}
            style={styles.qCard}
          >
            <View style={styles.qMeta}>
              <View style={styles.qBadge}>
                <Text style={styles.qBadgeText}>
                  سؤال {index + 1} من {questions.length}
                </Text>
              </View>
              {current.points != null ? (
                <View style={styles.pointsBadge}>
                  <Icon name="Trophy" size={12} color={t.accent} />
                  <Text style={styles.pointsText}>{current.points} درجة</Text>
                </View>
              ) : null}
            </View>

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
              <View style={styles.choices}>
                {current.choices.map((choice, ci) => {
                  const selected = answers[current.id] === ci;
                  return (
                    <MotiView
                      key={ci}
                      from={{ opacity: 0, translateX: 10 }}
                      animate={{
                        opacity: 1,
                        translateX: 0,
                        scale: selected ? 1.02 : 1,
                      }}
                      transition={{
                        type: 'timing',
                        duration: 240,
                        delay: 50 + ci * 50,
                      }}
                    >
                      <Pressable
                        onPress={() =>
                          setAnswers((prev) => ({ ...prev, [current.id]: ci }))
                        }
                        style={[styles.choice, selected && styles.choiceOn]}
                      >
                        <View
                          style={[
                            styles.choiceBullet,
                            selected && styles.choiceBulletOn,
                          ]}
                        >
                          {selected ? (
                            <Icon name="Check" size={14} color="#fff" />
                          ) : (
                            <Text style={styles.choiceLetter}>
                              {CHOICE_LETTERS[ci] || String(ci + 1)}
                            </Text>
                          )}
                        </View>
                        <Text
                          style={[
                            styles.choiceText,
                            selected && styles.choiceTextOn,
                          ]}
                        >
                          {choice}
                        </Text>
                      </Pressable>
                    </MotiView>
                  );
                })}
              </View>
            )}
          </MotiView>

          <View style={styles.nav}>
            <Pressable
              disabled={index >= questions.length - 1}
              onPress={() =>
                setIndex((i) => Math.min(questions.length - 1, i + 1))
              }
              style={({ pressed }) => [
                styles.navBtn,
                index >= questions.length - 1 && styles.navBtnDisabled,
                pressed && index < questions.length - 1 && { opacity: 0.88 },
              ]}
            >
              <Text style={styles.navBtnText}>التالي</Text>
              <Icon name="ChevronLeft" size={16} color={t.inkSoft} />
            </Pressable>
            <Pressable
              disabled={index <= 0}
              onPress={() => setIndex((i) => Math.max(0, i - 1))}
              style={({ pressed }) => [
                styles.navBtn,
                index <= 0 && styles.navBtnDisabled,
                pressed && index > 0 && { opacity: 0.88 },
              ]}
            >
              <Icon name="ChevronRight" size={16} color={t.inkSoft} />
              <Text style={styles.navBtnText}>السابق</Text>
            </Pressable>
          </View>

          <MotiView
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 320, delay: 200 }}
          >
            <Pressable
              disabled={submitting}
              onPress={() => setConfirmOpen(true)}
              style={({ pressed }) => [
                styles.submitBtn,
                (pressed || submitting) && {
                  opacity: 0.92,
                  transform: [{ scale: 0.985 }],
                },
              ]}
            >
              <LinearGradient
                colors={['#4F46E5', '#6366F1']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.submitGrad}
              >
                <Icon name="Send" size={18} color="#fff" />
                <Text style={styles.submitText}>
                  {submitting ? 'جارٍ التسليم...' : 'تسليم والحصول على الدرجة'}
                </Text>
              </LinearGradient>
            </Pressable>
          </MotiView>
        </ScrollView>
      </SafeAreaView>

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
        description="الامتحان مقفل حتى تُسلّم إجاباتك. الوقت يُحسب من السيرفر حتى لو أغلقت الصفحة."
        confirmLabel="تسليم والخروج"
        cancelLabel="متابعة الامتحان"
        onConfirm={() => {
          setLockOpen(false);
          finish(false);
        }}
        onClose={() => setLockOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: t.canvas },
  blob: {
    position: 'absolute',
    top: -90,
    end: -50,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: t.brandSoft,
    opacity: 0.65,
  },
  safe: { flex: 1 },
  content: {
    paddingHorizontal: t.space.lg,
    paddingBottom: t.space['4xl'],
    gap: t.space.lg,
    paddingTop: t.space.sm,
  },
  contentWide: { paddingHorizontal: t.space['2xl'] },
  hero: {
    borderRadius: 28,
    padding: t.space.lg,
    gap: 12,
    overflow: 'hidden',
    ...t.shadow.float,
  },
  heroOrb: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(165,180,252,0.35)',
    top: -40,
    start: -30,
  },
  heroTop: {
    flexDirection: rowRtl,
    alignItems: 'center',
    gap: 10,
    zIndex: 1,
  },
  lockBtn: {
    flexDirection: rowRtl,
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
  },
  lockBtnText: {
    fontFamily: t.fonts.semiBold,
    fontSize: 11,
    color: '#E0E7FF',
  },
  heroTitles: { flex: 1, gap: 2 },
  heroTitle: {
    fontFamily: t.fonts.bold,
    fontSize: 18,
    color: '#fff',
    textAlign: 'right',
  },
  heroSub: {
    fontFamily: t.fonts.regular,
    fontSize: 12,
    color: 'rgba(224,231,255,0.85)',
    textAlign: 'right',
  },
  timerChip: {
    flexDirection: rowRtl,
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.16)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
  },
  timerChipUrgent: { backgroundColor: '#FEF3C7' },
  timerChipCritical: { backgroundColor: 'rgba(255,255,255,0.22)' },
  timerChipText: {
    fontFamily: t.fonts.bold,
    fontSize: 16,
    color: '#fff',
    fontVariant: ['tabular-nums'],
  },
  timerChipTextUrgent: { color: '#92400E' },
  timeTrack: {
    height: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
    overflow: 'hidden',
    zIndex: 1,
  },
  timeFill: {
    height: '100%',
    borderRadius: 999,
  },
  timeHint: {
    fontFamily: t.fonts.medium,
    fontSize: 11,
    color: 'rgba(224,231,255,0.7)',
    textAlign: 'right',
    zIndex: 1,
  },
  progressCard: {
    backgroundColor: t.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: t.line,
    padding: t.space.md,
    gap: 10,
    ...t.shadow.card,
  },
  progressHead: {
    flexDirection: rowRtl,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontFamily: t.fonts.semiBold,
    fontSize: 13,
    color: t.inkSoft,
  },
  progressPct: {
    fontFamily: t.fonts.bold,
    fontSize: 13,
    color: t.brand,
    fontVariant: ['tabular-nums'],
  },
  progressTrack: {
    height: 8,
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
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: t.line,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.cardMuted,
  },
  dotActive: {
    borderColor: t.brand,
    backgroundColor: t.brand,
  },
  dotAnswered: {
    borderColor: t.success,
    backgroundColor: t.successSoft,
  },
  dotText: {
    fontFamily: t.fonts.semiBold,
    fontSize: 13,
    color: t.inkSoft,
  },
  dotTextOn: { color: t.ink },
  qCard: {
    backgroundColor: t.card,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: t.line,
    padding: t.space.xl,
    gap: 14,
    ...t.shadow.card,
  },
  qMeta: {
    flexDirection: rowRtl,
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  qBadge: {
    backgroundColor: t.brandSoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  qBadgeText: {
    fontFamily: t.fonts.semiBold,
    fontSize: 12,
    color: t.brand,
  },
  pointsBadge: {
    flexDirection: rowRtl,
    alignItems: 'center',
    gap: 4,
    backgroundColor: t.accentSoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  pointsText: {
    fontFamily: t.fonts.semiBold,
    fontSize: 12,
    color: t.accent,
  },
  qText: {
    fontFamily: t.fonts.bold,
    fontSize: 20,
    color: t.ink,
    textAlign: 'right',
    lineHeight: 32,
    letterSpacing: -0.2,
  },
  written: {
    minHeight: 140,
    borderWidth: 1,
    borderColor: t.line,
    borderRadius: 18,
    padding: t.space.md,
    fontFamily: t.fonts.regular,
    fontSize: 15,
    color: t.ink,
    backgroundColor: t.cardMuted,
    textAlignVertical: 'top',
  },
  choices: { gap: 10 },
  choice: {
    flexDirection: rowRtl,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderColor: t.line,
    backgroundColor: t.cardMuted,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  choiceOn: {
    borderColor: t.brand,
    backgroundColor: t.brandSoft,
    ...t.shadow.card,
  },
  choiceBullet: {
    width: 32,
    height: 32,
    borderRadius: 12,
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
    fontSize: 13,
    color: t.inkSoft,
  },
  choiceText: {
    flex: 1,
    fontFamily: t.fonts.medium,
    fontSize: 16,
    color: t.ink,
    textAlign: 'right',
  },
  choiceTextOn: {
    fontFamily: t.fonts.bold,
    color: t.brandDeep,
  },
  nav: {
    flexDirection: rowRtl,
    justifyContent: 'space-between',
    gap: t.space.md,
  },
  navBtn: {
    flex: 1,
    flexDirection: rowRtl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: t.line,
    backgroundColor: t.card,
    paddingVertical: 13,
  },
  navBtnDisabled: { opacity: 0.4 },
  navBtnText: {
    fontFamily: t.fonts.semiBold,
    fontSize: 14,
    color: t.inkSoft,
  },
  submitBtn: {
    borderRadius: 18,
    overflow: 'hidden',
    ...t.shadow.float,
  },
  submitGrad: {
    flexDirection: rowRtl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  submitText: {
    fontFamily: t.fonts.bold,
    fontSize: 16,
    color: '#fff',
  },
});
