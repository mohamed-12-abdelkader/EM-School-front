import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Badge, Button, EmptyState } from '@/components/ui';
import { LoadingBlock, StudentScreen } from '@/components/student/ui';
import { getExam, getSubject } from '@/services/studentPortal';
import type { Exam, ExamQuestion } from '@/types/studentPortal';
import { colors, fonts, spacing } from '@/theme/tokens';

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
        const data = await getExam(String(id));
        if (alive) {
          setExam(data?.exam ?? null);
          setQuestions(data?.questions ?? []);
          setLoading(false);
        }
      })();
      return () => {
        alive = false;
      };
    }, [id]),
  );

  if (loading) {
    return (
      <StudentScreen title="امتحان" onBack>
        <LoadingBlock />
      </StudentScreen>
    );
  }

  if (!exam) {
    return (
      <StudentScreen title="امتحان" onBack>
        <EmptyState icon="ClipboardList" title="الامتحان غير موجود" />
      </StudentScreen>
    );
  }

  const subject = getSubject(exam.subjectId);

  return (
    <StudentScreen title={exam.title} onBack>
      <View style={styles.box}>
        <Text style={styles.label}>المادة</Text>
        <Text style={styles.value}>{subject?.name}</Text>
        <Text style={styles.label}>الوحدة</Text>
        <Text style={styles.value}>{exam.unit || '—'}</Text>
        <Text style={styles.label}>عدد الأسئلة</Text>
        <Text style={styles.value}>{questions.length}</Text>
        <Text style={styles.label}>المدة</Text>
        <Text style={styles.value}>{exam.durationMin} دقيقة</Text>
        <Badge
          label={
            exam.difficulty === 'hard'
              ? 'صعب'
              : exam.difficulty === 'medium'
                ? 'متوسط'
                : 'سهل'
          }
          tone="warning"
        />
      </View>
      <Text style={styles.note}>
        الامتحان تجريبي ويُصحَّح محلياً. المؤقت والتنقل وحساب الدرجة يعملون داخل التطبيق.
      </Text>
      <Button
        label="بدء الامتحان"
        onPress={() => router.push(`/(student)/exam/${exam.id}/take` as never)}
      />
    </StudentScreen>
  );
}

const styles = StyleSheet.create({
  box: { gap: spacing.sm },
  label: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'right',
  },
  value: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
    color: colors.text,
    textAlign: 'right',
    marginBottom: spacing.sm,
  },
  note: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
});
