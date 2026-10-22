import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import {
  AppModal,
  Badge,
  Button,
  DateField,
  EmptyState,
  Input,
  useToast,
} from '@/components/ui';
import { ChipSelect, FormLabel, SegmentControl } from '@/components/admin';
import {
  LoadingBlock,
  StudentScreen,
  rowRtl,
} from '@/components/student/ui';
import {
  deleteStudySession,
  getStudyPlan,
  setStudySessionStatus,
  subjects,
  upsertStudySession,
} from '@/services/studentPortal';
import type {
  StudyPriority,
  StudySession,
  StudySessionStatus,
} from '@/types/studentPortal';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

const STATUS_LABEL: Record<StudySessionStatus, string> = {
  planned: 'لم تبدأ',
  in_progress: 'قيد التنفيذ',
  done: 'مكتملة',
};

export default function PlannerScreen() {
  const { showToast } = useToast();
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'day' | 'week'>('day');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<StudySession | null>(null);
  const [form, setForm] = useState({
    subjectId: subjects[0]?.id ?? 's1',
    title: '',
    date: new Date().toISOString().slice(0, 10),
    start: '16:00',
    end: '17:00',
    goal: '',
    priority: 'medium' as StudyPriority,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setSessions(await getStudyPlan());
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const today = new Date().toISOString().slice(0, 10);
  const visible = useMemo(() => {
    if (view === 'day') return sessions.filter((s) => s.date === today);
    return sessions;
  }, [sessions, view, today]);

  const adherence = useMemo(() => {
    if (!sessions.length) return 0;
    const done = sessions.filter((s) => s.status === 'done').length;
    return Math.round((done / sessions.length) * 100);
  }, [sessions]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      subjectId: subjects[0]?.id ?? 's1',
      title: '',
      date: today,
      start: '16:00',
      end: '17:00',
      goal: '',
      priority: 'medium',
    });
    setFormOpen(true);
  };

  const openEdit = (s: StudySession) => {
    setEditing(s);
    setForm({
      subjectId: s.subjectId,
      title: s.title,
      date: s.date,
      start: s.start,
      end: s.end,
      goal: s.goal,
      priority: s.priority,
    });
    setFormOpen(true);
  };

  const onSave = async () => {
    if (!form.title.trim()) {
      showToast('أدخل عنوان الجلسة', 'warning');
      return;
    }
    const session: StudySession = {
      id: editing?.id || `ss-${Date.now()}`,
      subjectId: form.subjectId,
      title: form.title.trim(),
      date: form.date,
      start: form.start,
      end: form.end,
      goal: form.goal.trim() || 'جلسة مذاكرة',
      priority: form.priority,
      status: editing?.status || 'planned',
    };
    await upsertStudySession(session);
    setFormOpen(false);
    showToast('تم حفظ الجلسة محلياً', 'success');
    load();
  };

  return (
    <StudentScreen
      title="جدول المذاكرة"
      subtitle={`الالتزام ${adherence}%`}
      onBack
      right={
        <Pressable onPress={openCreate} hitSlop={8}>
          <Text style={styles.add}>إضافة</Text>
        </Pressable>
      }
    >
      <SegmentControl
        value={view}
        options={[
          { key: 'day', label: 'اليوم' },
          { key: 'week', label: 'الكل' },
        ]}
        onChange={setView}
      />

      {loading ? (
        <LoadingBlock />
      ) : visible.length === 0 ? (
        <EmptyState
          icon="CalendarDays"
          title="لا جلسات"
          description="أنشئ خطة مذاكرة جديدة"
          actionLabel="جلسة جديدة"
          onAction={openCreate}
        />
      ) : (
        visible.map((s) => {
          const sub = subjects.find((x) => x.id === s.subjectId);
          return (
            <Pressable key={s.id} style={styles.card} onPress={() => openEdit(s)}>
              <View style={styles.cardHead}>
                <Text style={styles.cardTitle}>{s.title}</Text>
                <Badge label={STATUS_LABEL[s.status]} tone="info" />
              </View>
              <Text style={styles.meta}>
                {sub?.name} · {s.date} · {s.start}–{s.end}
              </Text>
              <Text style={styles.goal}>{s.goal}</Text>
              <View style={styles.actions}>
                {s.status !== 'done' ? (
                  <Button
                    label={s.status === 'planned' ? 'بدء' : 'إكمال'}
                    size="sm"
                    onPress={async () => {
                      await setStudySessionStatus(
                        s.id,
                        s.status === 'planned' ? 'in_progress' : 'done',
                      );
                      load();
                    }}
                  />
                ) : null}
                <Button
                  label="حذف"
                  size="sm"
                  variant="danger"
                  onPress={async () => {
                    await deleteStudySession(s.id);
                    load();
                  }}
                />
              </View>
            </Pressable>
          );
        })
      )}

      <AppModal
        visible={formOpen}
        title={editing ? 'تعديل جلسة' : 'جلسة مذاكرة جديدة'}
        confirmLabel="حفظ"
        onConfirm={onSave}
        onClose={() => setFormOpen(false)}
      >
        <View style={styles.form}>
          <FormLabel>المادة</FormLabel>
          <ChipSelect
            required
            options={subjects.map((s) => ({ id: s.id, label: s.name }))}
            value={form.subjectId}
            onChange={(next) =>
              typeof next === 'string' &&
              setForm((f) => ({ ...f, subjectId: next }))
            }
          />
          <Input
            label="العنوان"
            value={form.title}
            onChangeText={(title) => setForm((f) => ({ ...f, title }))}
          />
          <DateField
            label="التاريخ"
            value={form.date}
            onChange={(date) => setForm((f) => ({ ...f, date }))}
          />
          <Input
            label="من"
            value={form.start}
            onChangeText={(start) => setForm((f) => ({ ...f, start }))}
            placeholder="16:00"
          />
          <Input
            label="إلى"
            value={form.end}
            onChangeText={(end) => setForm((f) => ({ ...f, end }))}
            placeholder="17:00"
          />
          <Input
            label="هدف الجلسة"
            value={form.goal}
            onChangeText={(goal) => setForm((f) => ({ ...f, goal }))}
          />
          <FormLabel>الأولوية</FormLabel>
          <ChipSelect
            required
            options={[
              { id: 'low', label: 'منخفضة' },
              { id: 'medium', label: 'متوسطة' },
              { id: 'high', label: 'عالية' },
            ]}
            value={form.priority}
            onChange={(next) =>
              typeof next === 'string' &&
              setForm((f) => ({ ...f, priority: next as StudyPriority }))
            }
          />
        </View>
      </AppModal>
    </StudentScreen>
  );
}

const styles = StyleSheet.create({
  add: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: colors.primary,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: 6,
  },
  cardHead: {
    flexDirection: rowRtl,
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardTitle: {
    flex: 1,
    fontFamily: fonts.semiBold,
    fontSize: 15,
    color: colors.text,
    textAlign: 'right',
  },
  meta: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'right',
  },
  goal: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.text,
    textAlign: 'right',
  },
  actions: {
    flexDirection: rowRtl,
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  form: { gap: spacing.md },
});
