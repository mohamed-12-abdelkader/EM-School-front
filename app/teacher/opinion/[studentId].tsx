import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Button, Input, useToast } from '@/components/ui';
import {
  EmptyBlock,
  FadeIn,
  LoadingBlock,
  SoftCard,
  TeacherScreen,
  rowRtl,
} from '@/components/teacher/ui';
import { teacherTheme as t } from '@/components/teacher/theme';
import {
  createTeacherStudentOpinion,
  deleteTeacherStudentOpinion,
  listTeacherStudentOpinions,
  type TeacherStudentOpinion,
} from '@/api/teacherPortal';
import { ApiError } from '@/api/client';

function formatDate(iso: string) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

export default function TeacherStudentOpinionScreen() {
  const { studentId, classroom_id, subject_id, name } = useLocalSearchParams<{
    studentId: string;
    classroom_id?: string;
    subject_id?: string;
    name?: string;
  }>();
  const { showToast } = useToast();

  const classroomId = Number(classroom_id);
  const subjectId = subject_id ? Number(subject_id) : null;
  const sid = Number(studentId);

  const [opinions, setOpinions] = useState<TeacherStudentOpinion[]>([]);
  const [studentName, setStudentName] = useState(name || 'طالب');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!sid || !classroomId) return;
    setLoading(true);
    setError('');
    try {
      const data = await listTeacherStudentOpinions(sid, classroomId);
      setOpinions(data.opinions);
      setStudentName(data.student.name || name || 'طالب');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تحميل الآراء');
      setOpinions([]);
    } finally {
      setLoading(false);
    }
  }, [sid, classroomId, name]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onSave = async () => {
    const text = body.trim();
    if (!text) {
      showToast('اكتب نص الرأي أو التقرير', 'danger');
      return;
    }
    if (!classroomId || !sid) {
      showToast('بيانات الصف أو الطالب ناقصة', 'danger');
      return;
    }
    setSaving(true);
    try {
      await createTeacherStudentOpinion({
        student_id: sid,
        classroom_id: classroomId,
        subject_id: subjectId,
        title: title.trim() || null,
        body: text,
      });
      setTitle('');
      setBody('');
      showToast('تم حفظ الرأي — سيظهر لولي الأمر', 'success');
      await load();
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'تعذر الحفظ';
      showToast(msg, 'danger');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = (opinion: TeacherStudentOpinion) => {
    const run = async () => {
      try {
        await deleteTeacherStudentOpinion(opinion.id);
        showToast('تم حذف الرأي', 'success');
        await load();
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'تعذر الحذف', 'danger');
      }
    };

    if (typeof window !== 'undefined' && window.confirm) {
      if (window.confirm('حذف هذا الرأي؟')) void run();
      return;
    }
    Alert.alert('حذف الرأي', 'هل تريد حذف هذا الرأي؟', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'حذف', style: 'destructive', onPress: () => void run() },
    ]);
  };

  return (
    <TeacherScreen
      title="رأي عن الطالب"
      subtitle={studentName}
      onBack
      hero
    >
      {loading ? (
        <LoadingBlock />
      ) : (
        <>
          <FadeIn>
            <SoftCard>
              <Text style={styles.formTitle}>كتابة رأي / تقرير جديد</Text>
              <Text style={styles.formHint}>
                يظهر هذا النص لأولياء أمور {studentName} في لوحة ولي الأمر.
              </Text>
              <Input
                label="العنوان (اختياري)"
                value={title}
                onChangeText={setTitle}
                placeholder="مثال: متابعة سلوك / تقدم دراسي"
              />
              <View style={styles.gap} />
              <Input
                label="نص الرأي"
                value={body}
                onChangeText={setBody}
                placeholder="اكتب ملاحظتك عن الطالب هنا..."
                multiline
                style={styles.bodyInput}
              />
              <View style={styles.gap} />
              <Button
                label={saving ? 'جارٍ الحفظ...' : 'حفظ وإظهار لولي الأمر'}
                onPress={onSave}
                disabled={saving}
              />
            </SoftCard>
          </FadeIn>

          <Text style={styles.section}>آراؤك السابقة ({opinions.length})</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {opinions.length === 0 ? (
            <EmptyBlock
              icon="MessageSquareQuote"
              title="لا آراء بعد"
              subtitle="اكتب رأياً أعلاه ليظهر لولي الأمر فوراً"
            />
          ) : (
            opinions.map((o, i) => (
              <FadeIn key={o.id} delay={Math.min(i, 8) * 40}>
                <SoftCard style={styles.card}>
                  <View style={[styles.cardTop, { flexDirection: rowRtl as 'row' }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle}>
                        {o.title?.trim() || 'رأي بدون عنوان'}
                      </Text>
                      <Text style={styles.cardMeta}>
                        {formatDate(o.created_at)}
                        {o.subject_name ? ` · ${o.subject_name}` : ''}
                      </Text>
                    </View>
                    <Pressable onPress={() => onDelete(o)} hitSlop={8}>
                      <Text style={styles.delete}>حذف</Text>
                    </Pressable>
                  </View>
                  <Text style={styles.cardBody}>{o.body}</Text>
                </SoftCard>
              </FadeIn>
            ))
          )}
        </>
      )}
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  formTitle: {
    fontFamily: t.fonts.bold,
    fontSize: 16,
    color: t.ink,
    textAlign: 'right',
    marginBottom: 4,
  },
  formHint: {
    fontFamily: t.fonts.regular,
    fontSize: 12,
    color: t.inkSoft,
    textAlign: 'right',
    lineHeight: 18,
    marginBottom: 12,
  },
  gap: { height: 10 },
  bodyInput: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  section: {
    fontFamily: t.fonts.bold,
    fontSize: 16,
    color: t.ink,
    textAlign: 'right',
    marginTop: 16,
    marginBottom: 8,
  },
  error: {
    fontFamily: t.fonts.medium,
    fontSize: 12,
    color: t.danger,
    textAlign: 'right',
    marginBottom: 8,
  },
  card: { marginBottom: 8 },
  cardTop: { alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  cardTitle: {
    fontFamily: t.fonts.semiBold,
    fontSize: 14,
    color: t.ink,
    textAlign: 'right',
  },
  cardMeta: {
    fontFamily: t.fonts.regular,
    fontSize: 12,
    color: t.inkSoft,
    textAlign: 'right',
    marginTop: 2,
  },
  cardBody: {
    fontFamily: t.fonts.regular,
    fontSize: 14,
    color: t.inkSoft,
    textAlign: 'right',
    lineHeight: 22,
  },
  delete: {
    fontFamily: t.fonts.semiBold,
    fontSize: 12,
    color: t.danger,
  },
});
