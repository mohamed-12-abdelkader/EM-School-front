import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Badge, EmptyState } from '@/components/ui';
import {
  LoadingBlock,
  ListRow,
  ProgressBar,
  SectionTitle,
  StudentScreen,
  formatShortDate,
  rowRtl,
} from '@/components/student/ui';
import { getStudentResults, exams as examList } from '@/services/studentPortal';
import type { ExamAttempt, StudentSubject, TermResult } from '@/types/studentPortal';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

export default function ResultsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [term, setTerm] = useState<TermResult[]>([]);
  const [subjects, setSubjects] = useState<StudentSubject[]>([]);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        setLoading(true);
        const data = await getStudentResults();
        if (alive) {
          setAttempts(data.attempts);
          setTerm(data.term);
          setSubjects(data.subjects);
          setLoading(false);
        }
      })();
      return () => {
        alive = false;
      };
    }, []),
  );

  return (
    <StudentScreen title="النتائج والتقارير" subtitle="بيانات تجريبية" onBack hero>
      {loading ? (
        <LoadingBlock />
      ) : (
        <>
          <SectionTitle title="نتائج الامتحانات" />
          {attempts.length === 0 ? (
            <EmptyState icon="FileBarChart" title="لا نتائج بعد" />
          ) : (
            attempts.map((a) => {
              const exam = examList.find((e) => e.id === a.examId);
              const sub = subjects.find((s) => s.id === exam?.subjectId);
              return (
                <ListRow
                  key={a.id}
                  title={exam?.title || 'امتحان'}
                  meta={`${sub?.name || ''} · ${formatShortDate(a.finishedAt)} · ${a.score}/${a.maxScore}`}
                  onPress={() =>
                    router.push({
                      pathname: '/(student)/exam/[id]/result',
                      params: { id: a.examId, attemptId: a.id },
                    } as never)
                  }
                  right={<Badge label={`${a.percent}%`} tone="info" />}
                />
              );
            })
          )}

          <SectionTitle title="نتائج الترم (تجريبية)" />
          <Text style={styles.note}>
            لم تُعلن النتائج النهائية بعد — الأرقام أدناه للعرض التجريبي فقط.
          </Text>
          {term.map((t) => {
            const sub = subjects.find((s) => s.id === t.subjectId);
            const pct = t.total != null ? Math.round((t.total / t.maxTotal) * 100) : 0;
            return (
              <View key={t.subjectId} style={styles.termCard}>
                <View style={styles.termHead}>
                  <Text style={styles.termName}>{sub?.name}</Text>
                  <Badge
                    label={t.status === 'available' ? 'متاحة' : 'لم تعلن'}
                    tone={t.status === 'available' ? 'success' : 'warning'}
                  />
                </View>
                <Text style={styles.termMeta}>
                  منتصف الترم: {t.midterm ?? '—'} · نهائي: {t.final ?? '—'} ·
                  إجمالي: {t.total ?? '—'}/{t.maxTotal}
                </Text>
                <ProgressBar value={pct} color={sub?.color} />
              </View>
            );
          })}

          <SectionTitle title="ملخص الأداء" />
          <Text style={styles.insight}>
            نقاط القوة: اللغة العربية والرياضيات تظهر تقدماً جيداً في الاختبارات
            القصيرة.
          </Text>
          <Text style={styles.insight}>
            يحتاج مراجعة: الكيمياء (لا يوجد امتحان بعد) والفيزياء (نسبة إنجاز أقل).
          </Text>
        </>
      )}
    </StudentScreen>
  );
}

const styles = StyleSheet.create({
  note: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'right',
    lineHeight: 18,
  },
  termCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: 8,
  },
  termHead: {
    flexDirection: rowRtl,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  termName: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: colors.text,
  },
  termMeta: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'right',
  },
  insight: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.text,
    textAlign: 'right',
    lineHeight: 20,
  },
});
