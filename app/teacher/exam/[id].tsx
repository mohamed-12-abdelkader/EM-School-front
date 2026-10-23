import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Badge, Button, Icon, useToast } from '@/components/ui';
import {
  EmptyBlock,
  LoadingBlock,
  SoftCard,
  TeacherScreen,
  rowRtl,
} from '@/components/teacher/ui';
import { teacherTheme as t } from '@/components/teacher/theme';
import {
  deleteTeacherExam,
  getTeacherExam,
  updateTeacherExam,
} from '@/api/teacherPortal';
import type { TeacherExam, TeacherExamQuestion } from '@/types/teacherPortal';

const STATUS: Record<string, { label: string; tone: 'neutral' | 'success' | 'warning' }> = {
  draft: { label: 'مسودة', tone: 'neutral' },
  published: { label: 'منشور', tone: 'success' },
  closed: { label: 'مغلق', tone: 'warning' },
};

export default function ExamDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();
  const [exam, setExam] = useState<TeacherExam | null>(null);
  const [questions, setQuestions] = useState<TeacherExamQuestion[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await getTeacherExam(Number(id));
      setExam(res.exam);
      setQuestions(res.questions);
    } catch {
      setExam(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const st = exam ? STATUS[exam.status] || STATUS.draft : STATUS.draft;

  return (
    <TeacherScreen
      title={exam?.title || 'الاختبار'}
      subtitle={
        exam
          ? `${exam.grade_name} · ${exam.classroom_name} · ${exam.subject_name}`
          : undefined
      }
      onBack
      hero
      right={
        <Pressable
          style={styles.trash}
          onPress={async () => {
            await deleteTeacherExam(Number(id));
            showToast('تم الحذف', 'success');
            router.replace('/teacher/exams' as never);
          }}
        >
          <Icon name="Trash2" size={18} color="#fff" />
        </Pressable>
      }
    >
      {loading ? (
        <LoadingBlock />
      ) : !exam ? (
        <EmptyBlock title="الاختبار غير موجود" />
      ) : (
        <>
          <SoftCard>
            <View style={[styles.top, { flexDirection: rowRtl as 'row' }]}>
              <Badge label={st.label} tone={st.tone} />
              <Text style={styles.meta}>
                {questions.length} سؤال · {Number(exam.total_points)} درجة
                {exam.duration_minutes ? ` · ${exam.duration_minutes} د` : ''}
              </Text>
            </View>
            {exam.description ? <Text style={styles.desc}>{exam.description}</Text> : null}
            <View style={[styles.actions, { flexDirection: rowRtl as 'row' }]}>
              {exam.status !== 'published' ? (
                <Button
                  label="نشر"
                  size="sm"
                  onPress={async () => {
                    await updateTeacherExam(exam.id, { status: 'published' });
                    showToast('تم النشر', 'success');
                    load();
                  }}
                />
              ) : (
                <Button
                  label="إغلاق"
                  size="sm"
                  variant="secondary"
                  onPress={async () => {
                    await updateTeacherExam(exam.id, { status: 'closed' });
                    load();
                  }}
                />
              )}
            </View>
          </SoftCard>

          {questions.map((q, i) => (
            <SoftCard key={q.id || i}>
              <Text style={styles.qType}>
                {q.type === 'mcq' ? 'اختيار من متعدد' : 'سؤال مقالي'} · {Number(q.points)} درجة
              </Text>
              <Text style={styles.qText}>
                {i + 1}. {q.text}
              </Text>
              {q.type === 'mcq'
                ? (q.choices || []).map((c, ci) => (
                    <Text
                      key={ci}
                      style={[styles.choice, c.is_correct && styles.choiceOk]}
                    >
                      {c.is_correct ? '✓ ' : '• '}
                      {c.text}
                    </Text>
                  ))
                : q.model_answer
                  ? (
                    <Text style={styles.model}>نموذج الإجابة: {q.model_answer}</Text>
                    )
                  : null}
            </SoftCard>
          ))}
        </>
      )}
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  trash: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(239,68,68,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  top: { alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  meta: {
    fontFamily: t.fonts.medium,
    fontSize: 12,
    color: t.inkSoft,
    fontVariant: ['tabular-nums'],
  },
  desc: {
    marginTop: 10,
    fontFamily: t.fonts.regular,
    fontSize: 13,
    color: t.inkSoft,
    writingDirection: 'rtl',
    lineHeight: 20,
  },
  actions: { marginTop: 12, gap: 8 },
  qType: {
    fontFamily: t.fonts.semiBold,
    fontSize: 12,
    color: t.accent,
    marginBottom: 6,
    writingDirection: 'rtl',
  },
  qText: {
    fontFamily: t.fonts.bold,
    fontSize: 14,
    color: t.ink,
    writingDirection: 'rtl',
    marginBottom: 8,
  },
  choice: {
    fontFamily: t.fonts.regular,
    fontSize: 13,
    color: t.inkSoft,
    writingDirection: 'rtl',
    marginTop: 4,
  },
  choiceOk: {
    color: t.success,
    fontFamily: t.fonts.semiBold,
  },
  model: {
    marginTop: 8,
    fontFamily: t.fonts.regular,
    fontSize: 13,
    color: t.info,
    writingDirection: 'rtl',
  },
});
