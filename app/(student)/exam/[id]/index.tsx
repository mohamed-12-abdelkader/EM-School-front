import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { EmptyState, Icon, useToast } from '@/components/ui';
import {
  FadeIn,
  LoadingBlock,
  StudentPageShell,
  formatShortDate,
  rowRtl,
} from '@/components/student/ui';
import { studentTheme as t } from '@/components/student/theme';
import { ApiError } from '@/api/client';
import { getExam, startExam } from '@/services/studentPortal';
import type { Exam, ExamQuestion } from '@/types/studentPortal';

function formatRemain(total: number) {
  const s = Math.max(0, Math.floor(total));
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

export default function ExamIntroScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();
  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        setLoading(true);
        try {
          const data = await getExam(String(id));
          if (!alive) return;
          setExam(data?.exam ?? null);
          setQuestions(data?.questions ?? []);
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
    }, [id]),
  );

  const onStart = async () => {
    if (!exam || starting) return;
    setStarting(true);
    try {
      await startExam(exam.id);
      router.replace(`/(student)/exam/${exam.id}/take` as never);
    } catch (err) {
      const msg =
        err instanceof ApiError && err.message === 'Exam already submitted'
          ? 'تم تسليم هذا الامتحان مسبقاً'
          : err instanceof Error
            ? err.message
            : 'تعذر بدء الامتحان';
      showToast(msg, 'danger');
      if (err instanceof ApiError && err.message === 'Exam already submitted') {
        router.replace(`/(student)/exam/${exam.id}/result` as never);
      }
    } finally {
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <StudentPageShell title="الامتحان" subtitle="جارٍ التحضير" icon="ClipboardList">
        <LoadingBlock />
      </StudentPageShell>
    );
  }

  if (!exam) {
    return (
      <StudentPageShell title="الامتحان" icon="ClipboardList">
        <EmptyState
          icon="ClipboardList"
          title="الامتحان غير متاح"
          description="هذا الامتحان من المدرس لفصلك فقط، أو لم يُنشَر بعد."
        />
      </StudentPageShell>
    );
  }

  const mcqCount = questions.filter((q) => q.type !== 'written').length;
  const writtenCount = questions.length - mcqCount;
  const remain =
    exam.inProgress && exam.remainingSeconds != null
      ? exam.remainingSeconds
      : null;

  const statusLabel = exam.attempted
    ? 'تم التسليم'
    : exam.inProgress
      ? 'جلسة مفتوحة'
      : 'جاهز للبدء';
  const statusTone = exam.attempted
    ? { bg: 'rgba(16,185,129,0.22)', fg: '#A7F3D0' }
    : exam.inProgress
      ? { bg: 'rgba(245,158,11,0.25)', fg: '#FDE68A' }
      : { bg: 'rgba(255,255,255,0.18)', fg: '#EEF2FF' };

  const gradeValue =
    exam.attempted && exam.score != null
      ? `${exam.score}/${exam.maxScore}`
      : exam.totalPoints != null
        ? String(exam.totalPoints)
        : '—';

  const metrics = [
    {
      key: 'q',
      icon: 'ClipboardList',
      label: 'أسئلة',
      value: String(questions.length),
      soft: t.brandSoft,
      color: t.brand,
    },
    {
      key: 'd',
      icon: 'Clock',
      label: 'دقيقة',
      value: String(exam.durationMin),
      soft: t.skySoft,
      color: t.sky,
    },
    {
      key: 'g',
      icon: 'Trophy',
      label: 'درجة',
      value: gradeValue,
      soft: t.accentSoft,
      color: t.accent,
    },
  ];

  const steps = [
    'عند البدء يُسجَّل الوقت على السيرفر',
    'العداد يبقى دقيقاً بعد التحديث',
    'انتهاء الوقت = تسليم تلقائي',
    writtenCount > 0
      ? `${mcqCount} اختيار فوري · ${writtenCount} مقالي للمدرس`
      : 'تصحيح الاختيار من متعدد فوراً',
  ];

  const primaryLabel = exam.attempted
    ? 'عرض النتيجة والتصحيح'
    : starting
      ? 'جارٍ البدء...'
      : exam.inProgress
        ? 'متابعة الامتحان'
        : 'بدء الامتحان الآن';

  const onPrimary = () => {
    if (exam.attempted) {
      router.replace(`/(student)/exam/${exam.id}/result` as never);
      return;
    }
    void onStart();
  };

  return (
    <StudentPageShell
      title="قبل البدء"
      subtitle={exam.subjectName || 'امتحان رسمي'}
      icon="ClipboardList"
    >
      <MotiView
        from={{ opacity: 0, translateY: 16, scale: 0.98 }}
        animate={{ opacity: 1, translateY: 0, scale: 1 }}
        transition={{ type: 'timing', duration: 420 }}
      >
        <LinearGradient
          colors={['#1E1B4B', '#3730A3', '#4F46E5']}
          start={{ x: 0.05, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <MotiView
            from={{ opacity: 0.35, scale: 0.85 }}
            animate={{ opacity: 0.55, scale: 1 }}
            transition={{
              type: 'timing',
              duration: 2200,
              loop: true,
            }}
            style={styles.heroOrb}
          />
          <View style={styles.heroOrbSm} />

          <View style={styles.badgeRow}>
            <View style={[styles.pill, { backgroundColor: statusTone.bg }]}>
              <View style={[styles.liveDot, exam.inProgress && styles.liveDotOn]} />
              <Text style={[styles.pillText, { color: statusTone.fg }]}>
                {statusLabel}
              </Text>
            </View>
            {exam.isOfficial !== false ? (
              <View style={styles.pillMuted}>
                <Icon name="Check" size={13} color="#C7D2FE" />
                <Text style={styles.pillMutedText}>رسمي</Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.heroTitle}>{exam.title}</Text>
          <Text style={styles.heroMeta}>
            {[
              exam.teacherName,
              exam.date ? formatShortDate(exam.date) : null,
              exam.subjectName,
            ]
              .filter(Boolean)
              .join(' · ')}
          </Text>
          {exam.description ? (
            <Text style={styles.heroDesc} numberOfLines={3}>
              {exam.description}
            </Text>
          ) : null}
        </LinearGradient>
      </MotiView>

      <View style={styles.metrics}>
        {metrics.map((m, i) => (
          <MotiView
            key={m.key}
            from={{ opacity: 0, translateY: 12, scale: 0.94 }}
            animate={{ opacity: 1, translateY: 0, scale: 1 }}
            transition={{ type: 'timing', duration: 320, delay: 80 + i * 70 }}
            style={styles.metricWrap}
          >
            <View style={[styles.metric, { backgroundColor: m.soft }]}>
              <View style={styles.metricIcon}>
                <Icon name={m.icon} size={16} color={m.color} />
              </View>
              <Text style={styles.metricValue}>{m.value}</Text>
              <Text style={styles.metricLabel}>{m.label}</Text>
            </View>
          </MotiView>
        ))}
      </View>

      {remain != null ? (
        <MotiView
          from={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'timing', duration: 300, delay: 220 }}
        >
          <View style={styles.timerBanner}>
            <MotiView
              from={{ scale: 1 }}
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ type: 'timing', duration: 1400, loop: true }}
              style={styles.timerIconWrap}
            >
              <Icon name="Clock" size={20} color={t.warning} />
            </MotiView>
            <View style={styles.timerCopy}>
              <Text style={styles.timerLabel}>متبقٍّ من جلستك</Text>
              <Text style={styles.timerValue}>{formatRemain(remain)}</Text>
            </View>
            <Text style={styles.timerHint}>متزامن مع السيرفر</Text>
          </View>
        </MotiView>
      ) : null}

      <FadeIn delay={240}>
        <View style={styles.steps}>
          <Text style={styles.stepsTitle}>كيف يعمل الامتحان</Text>
          {steps.map((text, i) => (
            <MotiView
              key={text}
              from={{ opacity: 0, translateX: 12 }}
              animate={{ opacity: 1, translateX: 0 }}
              transition={{ type: 'timing', duration: 280, delay: 280 + i * 55 }}
              style={styles.stepRow}
            >
              <View style={styles.stepNum}>
                <Text style={styles.stepNumText}>{i + 1}</Text>
              </View>
              <Text style={styles.stepText}>{text}</Text>
            </MotiView>
          ))}
        </View>
      </FadeIn>

      <MotiView
        from={{ opacity: 0, translateY: 14 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 360, delay: 420 }}
        style={styles.actions}
      >
        {!exam.attempted ? (
          <MotiView
            from={{ scale: 1 }}
            animate={{ scale: starting ? 1 : [1, 1.015, 1] }}
            transition={{
              type: 'timing',
              duration: 1800,
              loop: !starting,
            }}
          >
            <Pressable
              onPress={onPrimary}
              disabled={starting}
              style={({ pressed }) => [
                styles.primaryBtn,
                (pressed || starting) && { opacity: 0.92, transform: [{ scale: 0.985 }] },
              ]}
            >
              <LinearGradient
                colors={['#4F46E5', '#6366F1']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.primaryGrad}
              >
                <Icon name="Play" size={18} color="#fff" />
                <Text style={styles.primaryText}>{primaryLabel}</Text>
              </LinearGradient>
            </Pressable>
          </MotiView>
        ) : (
          <Pressable
            onPress={onPrimary}
            style={({ pressed }) => [
              styles.primaryBtn,
              pressed && { opacity: 0.92, transform: [{ scale: 0.985 }] },
            ]}
          >
            <LinearGradient
              colors={['#059669', '#10B981']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.primaryGrad}
            >
              <Icon name="Trophy" size={18} color="#fff" />
              <Text style={styles.primaryText}>{primaryLabel}</Text>
            </LinearGradient>
          </Pressable>
        )}

        <Pressable
          onPress={() => router.replace('/(student)/exams' as never)}
          style={({ pressed }) => [
            styles.secondaryBtn,
            pressed && { opacity: 0.85 },
          ]}
        >
          <Text style={styles.secondaryText}>العودة للقائمة</Text>
        </Pressable>
      </MotiView>
    </StudentPageShell>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: 28,
    padding: t.space.xl,
    gap: 10,
    overflow: 'hidden',
    minHeight: 168,
    ...t.shadow.float,
  },
  heroOrb: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(129,140,248,0.35)',
    top: -48,
    start: -36,
  },
  heroOrbSm: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.08)',
    bottom: -28,
    end: -12,
  },
  badgeRow: {
    flexDirection: rowRtl,
    gap: 8,
    flexWrap: 'wrap',
    zIndex: 1,
  },
  pill: {
    flexDirection: rowRtl,
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  pillText: {
    fontFamily: t.fonts.semiBold,
    fontSize: 12,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#A5B4FC',
  },
  liveDotOn: {
    backgroundColor: '#FBBF24',
  },
  pillMuted: {
    flexDirection: rowRtl,
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  pillMutedText: {
    fontFamily: t.fonts.medium,
    fontSize: 12,
    color: '#C7D2FE',
  },
  heroTitle: {
    fontFamily: t.fonts.bold,
    fontSize: 28,
    color: '#fff',
    textAlign: 'right',
    lineHeight: 38,
    letterSpacing: -0.4,
    zIndex: 1,
  },
  heroMeta: {
    fontFamily: t.fonts.regular,
    fontSize: 13,
    color: 'rgba(224,231,255,0.85)',
    textAlign: 'right',
    zIndex: 1,
  },
  heroDesc: {
    fontFamily: t.fonts.regular,
    fontSize: 14,
    color: 'rgba(224,231,255,0.75)',
    textAlign: 'right',
    lineHeight: 22,
    zIndex: 1,
    marginTop: 2,
  },
  metrics: {
    flexDirection: rowRtl,
    gap: 10,
  },
  metricWrap: { flex: 1 },
  metric: {
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 10,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.04)',
  },
  metricIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    ...t.shadow.card,
  },
  metricValue: {
    fontFamily: t.fonts.bold,
    fontSize: 20,
    color: t.ink,
    fontVariant: ['tabular-nums'],
  },
  metricLabel: {
    fontFamily: t.fonts.medium,
    fontSize: 11,
    color: t.inkMute,
  },
  timerBanner: {
    flexDirection: rowRtl,
    alignItems: 'center',
    gap: 12,
    backgroundColor: t.warningSoft,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: t.space.md,
  },
  timerIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerCopy: { flex: 1, gap: 2 },
  timerLabel: {
    fontFamily: t.fonts.medium,
    fontSize: 12,
    color: t.inkSoft,
    textAlign: 'right',
  },
  timerValue: {
    fontFamily: t.fonts.bold,
    fontSize: 24,
    color: t.warning,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  timerHint: {
    fontFamily: t.fonts.medium,
    fontSize: 10,
    color: t.inkMute,
  },
  steps: {
    backgroundColor: t.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: t.line,
    padding: t.space.lg,
    gap: 12,
    ...t.shadow.card,
  },
  stepsTitle: {
    fontFamily: t.fonts.bold,
    fontSize: 15,
    color: t.ink,
    textAlign: 'right',
    marginBottom: 2,
  },
  stepRow: {
    flexDirection: rowRtl,
    alignItems: 'center',
    gap: 12,
  },
  stepNum: {
    width: 26,
    height: 26,
    borderRadius: 9,
    backgroundColor: t.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: {
    fontFamily: t.fonts.bold,
    fontSize: 12,
    color: t.brand,
    fontVariant: ['tabular-nums'],
  },
  stepText: {
    flex: 1,
    fontFamily: t.fonts.regular,
    fontSize: 13,
    color: t.inkSoft,
    textAlign: 'right',
    lineHeight: 20,
  },
  actions: { gap: 10 },
  primaryBtn: {
    borderRadius: 18,
    overflow: 'hidden',
    ...t.shadow.float,
  },
  primaryGrad: {
    flexDirection: rowRtl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  primaryText: {
    fontFamily: t.fonts.bold,
    fontSize: 16,
    color: '#fff',
  },
  secondaryBtn: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: t.line,
    backgroundColor: t.card,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryText: {
    fontFamily: t.fonts.semiBold,
    fontSize: 14,
    color: t.inkSoft,
  },
});
