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
import { getTeacherLessons } from '@/api/teacherPortal';
import type { TeacherLesson } from '@/types/teacherPortal';

export default function TeacherLessonsTab() {
  const router = useRouter();
  const [lessons, setLessons] = useState<TeacherLesson[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getTeacherLessons();
      setLessons(res.lessons);
    } catch {
      setLessons([]);
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
      title="الدروس والمواد"
      subtitle="فيديوهات وملفات PDF مرتبطة بالدروس"
      hero
      right={
        <Pressable
          style={styles.addBtn}
          onPress={() => router.push('/teacher/lesson/new' as never)}
        >
          <Icon name="Plus" size={20} color="#fff" />
        </Pressable>
      }
    >
      {loading ? (
        <LoadingBlock />
      ) : lessons.length === 0 ? (
        <EmptyBlock
          icon="BookOpen"
          title="لا توجد دروس بعد"
          subtitle="أنشئ درساً وارفق فيديو أو PDF للطلاب"
          action={
            <Button
              label="إنشاء درس"
              onPress={() => router.push('/teacher/lesson/new' as never)}
            />
          }
        />
      ) : (
        lessons.map((l, i) => (
          <FadeIn key={l.id} delay={i * 40}>
            <SoftCard onPress={() => router.push(`/teacher/lesson/${l.id}` as never)}>
              <View style={[styles.row, { flexDirection: rowRtl as 'row' }]}>
                <View style={styles.icon}>
                  <Icon name="BookOpen" size={20} color={t.info} />
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={styles.title}>{l.title}</Text>
                  <Text style={styles.sub}>
                    {l.grade_name} · {l.classroom_name} · {l.subject_name}
                  </Text>
                  <Text style={styles.meta}>
                    {l.attachments_count || 0} مرفق
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
  row: { alignItems: 'center', gap: 12 },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: t.infoSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
    color: t.brand,
    fontVariant: ['tabular-nums'],
  },
});
