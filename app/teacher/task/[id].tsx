import { useCallback, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Button, Input, Icon, useToast } from '@/components/ui';
import {
  EmptyBlock,
  LoadingBlock,
  SoftCard,
  TeacherScreen,
  rowRtl,
} from '@/components/teacher/ui';
import { teacherTheme as t } from '@/components/teacher/theme';
import {
  deleteTeacherTask,
  getTeacherTask,
  upsertTaskGrade,
} from '@/api/teacherPortal';
import type {
  TeacherAttachment,
  TeacherExamQuestion,
  TeacherTask,
  TeacherTaskStudent,
} from '@/types/teacherPortal';

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();
  const [task, setTask] = useState<TeacherTask | null>(null);
  const [students, setStudents] = useState<TeacherTaskStudent[]>([]);
  const [attachments, setAttachments] = useState<TeacherAttachment[]>([]);
  const [questions, setQuestions] = useState<TeacherExamQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<
    Record<number, { grade: string; review: string }>
  >({});
  const [savingId, setSavingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await getTeacherTask(Number(id));
      setTask(res.task);
      setStudents(res.students);
      setAttachments(res.attachments || []);
      setQuestions(res.questions || []);
      const next: Record<number, { grade: string; review: string }> = {};
      for (const s of res.students) {
        next[s.student_id] = {
          grade: s.grade != null ? String(s.grade) : '',
          review: s.review || '',
        };
      }
      setDrafts(next);
    } catch {
      setTask(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const saveGrade = async (studentId: number) => {
    const d = drafts[studentId];
    if (!d) return;
    setSavingId(studentId);
    try {
      await upsertTaskGrade(Number(id), {
        student_id: studentId,
        grade: d.grade.trim() === '' ? null : Number(d.grade),
        review: d.review.trim() || null,
      });
      showToast('تم حفظ التقييم', 'success');
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'تعذر الحفظ', 'danger');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <TeacherScreen
      title={task?.title || 'الواجب'}
      subtitle={
        task
          ? `${task.grade_name} · ${task.classroom_name} · ${task.subject_name}`
          : undefined
      }
      onBack={() => {
        if (router.canGoBack()) router.back();
        else router.replace('/teacher/tasks');
      }}
      hero
      right={
        <Pressable
          style={styles.trash}
          onPress={async () => {
            await deleteTeacherTask(Number(id));
            showToast('تم الحذف', 'success');
            router.replace('/teacher/tasks' as never);
          }}
        >
          <Icon name="Trash2" size={18} color="#fff" />
        </Pressable>
      }
    >
      {loading ? (
        <LoadingBlock />
      ) : !task ? (
        <EmptyBlock title="الواجب غير موجود" />
      ) : (
        <>
          <SoftCard>
            {task.description ? <Text style={styles.desc}>{task.description}</Text> : null}
            <Text style={styles.meta}>
              النمط:{' '}
              {(task.submission_mode || 'questions') === 'pdf'
                ? 'PDF'
                : 'أسئلة'}{' '}
              · الحد الأقصى {Number(task.max_grade)}
              {task.due_at
                ? ` · التسليم ${new Date(task.due_at).toLocaleDateString('ar-EG')}`
                : ''}
            </Text>
          </SoftCard>

          {attachments.length > 0 ? (
            <>
              <Text style={styles.section}>ملفات الواجب</Text>
              {attachments.map((a) => (
                <SoftCard key={a.id}>
                  <View style={[styles.attachRow, { flexDirection: rowRtl as 'row' }]}>
                    <View style={styles.pdfBadge}>
                      <Icon name="FileText" size={18} color={t.brand} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.name}>{a.title}</Text>
                      <Text style={styles.pending}>{a.filename || 'PDF'}</Text>
                    </View>
                    <Button
                      label="فتح / تحميل"
                      size="sm"
                      icon="Download"
                      variant="outline"
                      onPress={() => Linking.openURL(a.file_url)}
                    />
                  </View>
                </SoftCard>
              ))}
            </>
          ) : null}

          {questions.length > 0 ? (
            <>
              <Text style={styles.section}>أسئلة الواجب ({questions.length})</Text>
              {questions.map((q, i) => (
                <SoftCard key={q.id ?? i}>
                  <View style={[styles.head, { flexDirection: rowRtl as 'row' }]}>
                    <Text style={styles.qType}>
                      {q.type === 'mcq' ? 'اختيار' : 'مقالي'} · {Number(q.points)} درجة
                    </Text>
                    <Text style={styles.qNum}>س {i + 1}</Text>
                  </View>
                  <Text style={styles.qText}>{q.text}</Text>
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
                          <Text style={styles.model}>
                            نموذج: {q.model_answer}
                          </Text>
                        )
                      : null}
                </SoftCard>
              ))}
            </>
          ) : null}

          <Text style={styles.section}>تقييم الطلاب</Text>
          {students.length === 0 ? (
            <EmptyBlock icon="Users" title="لا طلاب في هذا الصف" />
          ) : (
            students.map((s) => {
              const d = drafts[s.student_id] || { grade: '', review: '' };
              return (
                <SoftCard key={s.student_id}>
                  <View style={[styles.head, { flexDirection: rowRtl as 'row' }]}>
                    <Text style={styles.name}>{s.student_name}</Text>
                    {s.grade != null ? (
                      <Text style={styles.graded}>
                        {Number(s.grade)}/{Number(task.max_grade)}
                      </Text>
                    ) : s.submitted_at ? (
                      <Text style={styles.pending}>مُسلَّم — بانتظار التقييم</Text>
                    ) : (
                      <Text style={styles.pending}>لم يُسلَّم</Text>
                    )}
                  </View>
                  {s.submission_note ? (
                    <Text style={styles.pending}>ملاحظة: {s.submission_note}</Text>
                  ) : null}
                  {s.submission_file_url ? (
                    <View style={{ marginBottom: 10 }}>
                      <Button
                        label={s.submission_filename || 'فتح PDF المسلَّم'}
                        size="sm"
                        variant="outline"
                        icon="Download"
                        onPress={() => Linking.openURL(s.submission_file_url!)}
                      />
                    </View>
                  ) : null}
                  <Input
                    label="الدرجة"
                    value={d.grade}
                    onChangeText={(grade) =>
                      setDrafts((prev) => ({
                        ...prev,
                        [s.student_id]: { ...d, grade },
                      }))
                    }
                    keyboardType="decimal-pad"
                  />
                  <View style={styles.gap} />
                  <Input
                    label="الملاحظة / المراجعة"
                    value={d.review}
                    onChangeText={(review) =>
                      setDrafts((prev) => ({
                        ...prev,
                        [s.student_id]: { ...d, review },
                      }))
                    }
                    multiline
                    placeholder="تعليق للمعلم للطالب"
                  />
                  <View style={styles.gap} />
                  <Button
                    label={savingId === s.student_id ? 'جارٍ الحفظ...' : 'حفظ التقييم'}
                    size="sm"
                    onPress={() => saveGrade(s.student_id)}
                    disabled={savingId === s.student_id}
                  />
                </SoftCard>
              );
            })
          )}
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
  desc: {
    fontFamily: t.fonts.regular,
    fontSize: 14,
    color: t.inkSoft,
    writingDirection: 'rtl',
    lineHeight: 22,
    marginBottom: 8,
  },
  meta: {
    fontFamily: t.fonts.medium,
    fontSize: 12,
    color: t.warning,
    fontVariant: ['tabular-nums'],
    writingDirection: 'rtl',
  },
  section: {
    fontFamily: t.fonts.bold,
    fontSize: 16,
    color: t.ink,
    writingDirection: 'rtl',
    marginTop: 6,
  },
  head: { alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  name: {
    fontFamily: t.fonts.bold,
    fontSize: 15,
    color: t.ink,
    writingDirection: 'rtl',
  },
  graded: {
    fontFamily: t.fonts.semiBold,
    color: t.success,
    fontVariant: ['tabular-nums'],
  },
  pending: {
    fontFamily: t.fonts.medium,
    color: t.inkMute,
    fontSize: 12,
  },
  gap: { height: 8 },
  attachRow: { alignItems: 'center', gap: 12 },
  pdfBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: t.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qNum: {
    fontFamily: t.fonts.bold,
    fontSize: 13,
    color: t.brand,
  },
  qType: {
    fontFamily: t.fonts.medium,
    fontSize: 12,
    color: t.inkMute,
    writingDirection: 'rtl',
  },
  qText: {
    fontFamily: t.fonts.semiBold,
    fontSize: 14,
    color: t.ink,
    writingDirection: 'rtl',
    lineHeight: 22,
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
    fontFamily: t.fonts.regular,
    fontSize: 12,
    color: t.inkMute,
    writingDirection: 'rtl',
    marginTop: 6,
  },
});
