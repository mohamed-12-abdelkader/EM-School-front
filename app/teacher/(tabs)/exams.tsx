import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Badge, Button, Icon } from '@/components/ui';
import {
  EmptyBlock,
  FadeIn,
  LoadingBlock,
  SoftCard,
  TeacherScreen,
  rowRtl,
} from '@/components/teacher/ui';
import { teacherTheme as t } from '@/components/teacher/theme';
import { getTeacherExams } from '@/api/teacherPortal';
import type { TeacherExam } from '@/types/teacherPortal';

const STATUS: Record<string, { label: string; tone: 'neutral' | 'success' | 'warning' | 'danger' }> = {
  draft: { label: 'مسودة', tone: 'neutral' },
  published: { label: 'منشور', tone: 'success' },
  closed: { label: 'مغلق', tone: 'warning' },
};

export default function TeacherExamsTab() {
  const router = useRouter();
  const [exams, setExams] = useState<TeacherExam[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getTeacherExams();
      setExams(res.exams);
    } catch {
      setExams([]);
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
      title="الاختبارات"
      subtitle="اختيار من متعدد أو أسئلة مقالية"
      hero
      right={
        <Pressable
          style={styles.addBtn}
          onPress={() => router.push('/teacher/exam/new' as never)}
        >
          <Icon name="Plus" size={20} color="#fff" />
        </Pressable>
      }
    >
      {loading ? (
        <LoadingBlock />
      ) : exams.length === 0 ? (
        <EmptyBlock
          icon="ClipboardList"
          title="لا توجد اختبارات"
          subtitle="أنشئ اختباراً بأسئلة MCQ أو تحريرية"
          action={
            <Button
              label="إنشاء اختبار"
              onPress={() => router.push('/teacher/exam/new' as never)}
            />
          }
        />
      ) : (
        exams.map((e, i) => {
          const st = STATUS[e.status] || STATUS.draft;
          return (
            <FadeIn key={e.id} delay={i * 40}>
              <SoftCard onPress={() => router.push(`/teacher/exam/${e.id}` as never)}>
                <View style={[styles.row, { flexDirection: rowRtl as 'row' }]}>
                  <View style={{ flex: 1, gap: 6 }}>
                    <View style={[styles.top, { flexDirection: rowRtl as 'row' }]}>
                      <Text style={styles.title}>{e.title}</Text>
                      <Badge label={st.label} tone={st.tone} />
                    </View>
                    <Text style={styles.sub}>
                      {e.grade_name} · {e.classroom_name} · {e.subject_name}
                    </Text>
                    <Text style={styles.meta}>
                      {e.questions_count || 0} سؤال · {Number(e.total_points)} درجة
                      {e.duration_minutes ? ` · ${e.duration_minutes} دقيقة` : ''}
                    </Text>
                  </View>
                  <Icon name="ChevronLeft" size={18} color={t.inkMute} />
                </View>
              </SoftCard>
            </FadeIn>
          );
        })
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
  top: { alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  title: {
    flex: 1,
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
    color: t.accent,
    fontVariant: ['tabular-nums'],
    writingDirection: 'rtl',
  },
});
