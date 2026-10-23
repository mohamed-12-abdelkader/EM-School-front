import { useCallback, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Badge, EmptyState } from '@/components/ui';
import {
  LoadingBlock,
  ListRow,
  SectionTitle,
  StudentScreen,
  formatShortDate,
} from '@/components/student/ui';
import { getStudentResults } from '@/services/studentPortal';
import { colors, fonts, spacing } from '@/theme/tokens';

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

export default function ResultsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [attempts, setAttempts] = useState<ExamRow[]>([]);
  const [taskGrades, setTaskGrades] = useState<TaskGrade[]>([]);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        setLoading(true);
        const data = await getStudentResults();
        if (alive) {
          setAttempts(data.attempts as ExamRow[]);
          setTaskGrades((data.taskGrades as TaskGrade[]) || []);
          setLoading(false);
        }
      })();
      return () => {
        alive = false;
      };
    }, []),
  );

  return (
    <StudentScreen title="النتائج والتقارير" subtitle="درجاتك هذا الترم" onBack hero>
      {loading ? (
        <LoadingBlock />
      ) : (
        <>
          <SectionTitle title="نتائج الامتحانات" />
          {attempts.length === 0 ? (
            <EmptyState icon="FileBarChart" title="لا نتائج بعد" />
          ) : (
            attempts.map((a) => (
              <ListRow
                key={a.id}
                title={a.examTitle || 'امتحان'}
                meta={`${a.subjectName || ''} · ${formatShortDate(a.finishedAt)} · ${a.score}/${a.maxScore}`}
                onPress={() =>
                  router.push({
                    pathname: '/(student)/exam/[id]/result',
                    params: { id: a.examId, attemptId: a.id },
                  } as never)
                }
                right={<Badge label={`${a.percent}%`} tone="info" />}
              />
            ))
          )}

          <SectionTitle title="تقييم الواجبات" />
          {taskGrades.length === 0 ? (
            <Text style={styles.note}>لا تقييمات واجبات بعد</Text>
          ) : (
            taskGrades.map((g) => (
              <ListRow
                key={g.id}
                title={g.taskTitle}
                meta={`${g.subjectName} · ${g.score}/${g.maxScore}${
                  g.review ? ` · ${g.review}` : ''
                }`}
                onPress={() =>
                  router.push(`/(student)/assignment/${g.taskId}` as never)
                }
                right={
                  <Badge
                    label={`${
                      g.maxScore
                        ? Math.round((g.score / g.maxScore) * 100)
                        : 0
                    }%`}
                    tone="success"
                  />
                }
              />
            ))
          )}
        </>
      )}
    </StudentScreen>
  );
}

const styles = StyleSheet.create({
  note: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'right',
    marginBottom: spacing.md,
  },
});
