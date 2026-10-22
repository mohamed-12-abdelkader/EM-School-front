import { useCallback, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Badge, Button, EmptyState, useToast } from '@/components/ui';
import {
  LoadingBlock,
  StudentScreen,
  assignmentStatusLabel,
  formatShortDate,
} from '@/components/student/ui';
import {
  getAssignment,
  getSubject,
  getTeacher,
  updateAssignmentStatus,
} from '@/services/studentPortal';
import type { Assignment } from '@/types/studentPortal';
import { colors, fonts, spacing } from '@/theme/tokens';

export default function AssignmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();
  const [item, setItem] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setItem(await getAssignment(String(id)));
    setLoading(false);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const setStatus = async (status: Assignment['status']) => {
    setBusy(true);
    const updated = await updateAssignmentStatus(String(id), status);
    setItem(updated);
    setBusy(false);
    showToast(
      status === 'submitted'
        ? 'تم تحديث الحالة محلياً (تجريبي — لم يُرسل للخادم)'
        : 'تم تحديث الحالة محلياً',
      'success',
    );
  };

  if (loading) {
    return (
      <StudentScreen title="الواجب" onBack>
        <LoadingBlock />
      </StudentScreen>
    );
  }

  if (!item) {
    return (
      <StudentScreen title="الواجب" onBack>
        <EmptyState icon="FileText" title="الواجب غير موجود" />
      </StudentScreen>
    );
  }

  const subject = getSubject(item.subjectId);
  const teacher = getTeacher(item.teacherId);

  return (
    <StudentScreen title={item.title} onBack>
      <Badge label={assignmentStatusLabel[item.status]} tone="primary" />
      <Text style={styles.meta}>
        {subject?.name} · {teacher?.name}
      </Text>
      <Text style={styles.meta}>تسليم: {formatShortDate(item.dueAt)}</Text>
      <Text style={styles.meta}>عدد المهام: {item.tasksCount}</Text>
      {item.description ? <Text style={styles.body}>{item.description}</Text> : null}
      {item.score != null ? (
        <Text style={styles.score}>
          الدرجة: {item.score}/{item.maxScore}
        </Text>
      ) : null}

      <Text style={styles.note}>
        التفاعلات هنا تجريبية وتُحفظ على الجهاز فقط — لا يوجد إرسال حقيقي للخادم.
      </Text>

      {item.status === 'new' || item.status === 'overdue' ? (
        <Button
          label={busy ? '...' : 'بدء الحل'}
          disabled={busy}
          onPress={() => setStatus('in_progress')}
        />
      ) : null}
      {item.status === 'in_progress' ? (
        <Button
          label={busy ? '...' : 'تسليم تجريبي'}
          disabled={busy}
          onPress={() => setStatus('submitted')}
        />
      ) : null}
      <Button
        label="المواد"
        variant="outline"
        onPress={() => router.push(`/(student)/subject/${item.subjectId}` as never)}
      />
    </StudentScreen>
  );
}

const styles = StyleSheet.create({
  meta: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'right',
  },
  body: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.text,
    textAlign: 'right',
    lineHeight: 22,
    marginVertical: spacing.sm,
  },
  score: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.success,
    textAlign: 'right',
  },
  note: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginVertical: spacing.md,
  },
});
