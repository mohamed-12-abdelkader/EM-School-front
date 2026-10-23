import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Button, Icon } from '@/components/ui';
import {
  EmptyBlock,
  FadeIn,
  LoadingBlock,
  SoftCard,
  TeacherScreen,
  rowRtl,
} from '@/components/teacher/ui';
import { teacherTheme as t } from '@/components/teacher/theme';
import { getTeacherTasks } from '@/api/teacherPortal';
import type { TeacherTask } from '@/types/teacherPortal';

export default function TeacherTasksTab() {
  const router = useRouter();
  const [tasks, setTasks] = useState<TeacherTask[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getTeacherTasks();
      setTasks(res.tasks);
    } catch {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <TeacherScreen
      title="الواجبات والتقييم"
      subtitle="درجات ومراجعات للطلاب"
      hero
      right={
        <Pressable
          style={styles.addBtn}
          onPress={() => router.push('/teacher/task/new' as never)}
        >
          <Icon name="Plus" size={20} color="#fff" />
        </Pressable>
      }
    >
      {loading ? (
        <LoadingBlock />
      ) : tasks.length === 0 ? (
        <EmptyBlock
          icon="FileText"
          title="لا توجد واجبات"
          subtitle="أضف واجباً ثم قيّم طلاب الصف بملاحظات ودرجات"
          action={
            <Button
              label="إضافة واجب"
              onPress={() => router.push('/teacher/task/new' as never)}
            />
          }
        />
      ) : (
        tasks.map((task, i) => (
          <FadeIn key={task.id} delay={i * 40}>
            <SoftCard onPress={() => router.push(`/teacher/task/${task.id}` as never)}>
              <View style={[styles.row, { flexDirection: rowRtl as 'row' }]}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={styles.title}>{task.title}</Text>
                  <Text style={styles.sub}>
                    {task.grade_name} · {task.classroom_name} · {task.subject_name}
                  </Text>
                  <Text style={styles.meta}>
                    تم تقييم {task.graded_count || 0}/{task.students_count || 0} · الحد الأقصى{' '}
                    {Number(task.max_grade)}
                  </Text>
                </View>
                <Icon name="ChevronLeft" size={18} color={t.inkMute} />
              </View>
            </SoftCard>
          </FadeIn>
        ))
      )}
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { alignItems: 'center', gap: 10 },
  title: {
    fontFamily: t.fonts.bold,
    fontSize: 15,
    color: t.ink,
    writingDirection: 'rtl',
  },
  sub: {
    fontFamily: t.fonts.regular,
    fontSize: 12,
    color: t.inkSoft,
    writingDirection: 'rtl',
  },
  meta: {
    fontFamily: t.fonts.medium,
    fontSize: 12,
    color: t.warning,
    fontVariant: ['tabular-nums'],
    writingDirection: 'rtl',
  },
});
