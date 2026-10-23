import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Badge, Button, EmptyState, Icon } from '@/components/ui';
import {
  FadeIn,
  LoadingBlock,
  StudentScreen,
  formatShortDate,
  rowRtl,
} from '@/components/student/ui';
import { studentTheme as t } from '@/components/student/theme';
import { getExam } from '@/services/studentPortal';
import type { Exam, ExamQuestion } from '@/types/studentPortal';

export default function ExamIntroScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <StudentScreen title="امتحان" onBack hero>
        <LoadingBlock />
      </StudentScreen>
    );
  }

  if (!exam) {
    return (
      <StudentScreen title="امتحان" onBack hero>
        <EmptyState
          icon="ClipboardList"
          title="الامتحان غير متاح"
          description="هذا الامتحان من المدرس لفصلك فقط، أو لم يُنشَر بعد."
        />
      </StudentScreen>
    );
  }

  const mcqCount = questions.filter((q) => q.type !== 'written').length;
  const writtenCount = questions.length - mcqCount;

  return (
    <StudentScreen title="قبل البدء" onBack hero>
      <FadeIn>
        <View style={styles.heroCard}>
          <View style={styles.badgeRow}>
            <Badge
              label={exam.attempted ? 'تم التسليم' : 'من المدرس · متاح'}
              tone={exam.attempted ? 'success' : 'primary'}
            />
            {exam.isOfficial !== false ? (
              <Badge label="رسمي" tone="info" />
            ) : null}
          </View>
          <Text style={styles.title}>{exam.title}</Text>
          <Text style={styles.meta}>
            {[exam.subjectName, exam.teacherName, exam.date ? formatShortDate(exam.date) : null]
              .filter(Boolean)
              .join(' · ')}
          </Text>
          {exam.description ? (
            <Text style={styles.desc}>{exam.description}</Text>
          ) : null}
        </View>
      </FadeIn>

      <FadeIn delay={60}>
        <View style={styles.stats}>
          <Stat icon="ClipboardList" label="الأسئلة" value={String(questions.length)} />
          <Stat icon="Clock" label="المدة" value={`${exam.durationMin} د`} />
          <Stat
            icon="Trophy"
            label="الدرجة"
            value={
              exam.attempted && exam.score != null
                ? `${exam.score}/${exam.maxScore}`
                : exam.totalPoints != null
                  ? String(exam.totalPoints)
                  : '—'
            }
          />
        </View>
      </FadeIn>

      <FadeIn delay={100}>
        <View style={styles.rules}>
          <Text style={styles.rulesTitle}>قواعد الامتحان</Text>
          <Rule text="الامتحان منشور من مدرسك لفصلك الدراسي" />
          <Rule text="بعد البدء لا يمكن الخروج حتى التسليم" />
          <Rule
            text={
              writtenCount > 0
                ? `${mcqCount} اختيار من متعدد تُصحَّح فوراً · ${writtenCount} مقالي بانتظار المدرس`
                : 'درجة الاختيار من متعدد تُحسب فور التسليم'
            }
          />
          <Rule text="بعد التسليم تظهر درجتك وتصحيح الأسئلة الخاطئة" />
        </View>
      </FadeIn>

      {exam.attempted ? (
        <Button
          label="عرض النتيجة والتصحيح"
          onPress={() =>
            router.replace(`/(student)/exam/${exam.id}/result` as never)
          }
        />
      ) : (
        <Button
          label="بدء الامتحان الآن"
          onPress={() =>
            router.push(`/(student)/exam/${exam.id}/take` as never)
          }
        />
      )}
      <Button
        label="العودة للقائمة"
        variant="outline"
        onPress={() => router.replace('/(student)/exams' as never)}
      />
    </StudentScreen>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.stat}>
      <Icon name={icon} size={18} color={t.brand} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Rule({ text }: { text: string }) {
  return (
    <View style={styles.ruleRow}>
      <Icon name="Check" size={16} color={t.success} />
      <Text style={styles.ruleText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    backgroundColor: t.card,
    borderRadius: t.radius.xl,
    borderWidth: 1,
    borderColor: t.line,
    padding: t.space.xl,
    gap: 8,
    ...t.shadow.card,
  },
  badgeRow: {
    flexDirection: rowRtl,
    gap: 8,
    flexWrap: 'wrap',
  },
  title: {
    fontFamily: t.fonts.bold,
    fontSize: 22,
    color: t.ink,
    textAlign: 'right',
  },
  meta: {
    fontFamily: t.fonts.regular,
    fontSize: 13,
    color: t.inkMute,
    textAlign: 'right',
  },
  desc: {
    fontFamily: t.fonts.regular,
    fontSize: 14,
    color: t.inkSoft,
    textAlign: 'right',
    lineHeight: 22,
    marginTop: 4,
  },
  stats: {
    flexDirection: rowRtl,
    gap: 10,
  },
  stat: {
    flex: 1,
    backgroundColor: t.card,
    borderRadius: t.radius.lg,
    borderWidth: 1,
    borderColor: t.line,
    padding: t.space.md,
    alignItems: 'center',
    gap: 4,
    ...t.shadow.card,
  },
  statValue: {
    fontFamily: t.fonts.bold,
    fontSize: 18,
    color: t.ink,
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontFamily: t.fonts.medium,
    fontSize: 11,
    color: t.inkMute,
  },
  rules: {
    backgroundColor: t.cardMuted,
    borderRadius: t.radius.lg,
    borderWidth: 1,
    borderColor: t.line,
    padding: t.space.lg,
    gap: 10,
  },
  rulesTitle: {
    fontFamily: t.fonts.bold,
    fontSize: 15,
    color: t.ink,
    textAlign: 'right',
    marginBottom: 2,
  },
  ruleRow: {
    flexDirection: rowRtl,
    alignItems: 'flex-start',
    gap: 8,
  },
  ruleText: {
    flex: 1,
    fontFamily: t.fonts.regular,
    fontSize: 13,
    color: t.inkSoft,
    textAlign: 'right',
    lineHeight: 20,
  },
});
