import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Icon } from '@/components/ui';
import {
  EmptyBlock,
  FadeIn,
  LoadingBlock,
  SoftCard,
  TeacherScreen,
  rowRtl,
} from '@/components/teacher/ui';
import { teacherTheme as t } from '@/components/teacher/theme';
import { getTeacherClasses } from '@/api/teacherPortal';
import type { TeacherClass } from '@/types/teacherPortal';

export default function TeacherClassesTab() {
  const router = useRouter();
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getTeacherClasses();
      setClasses(res.classes);
    } catch {
      setClasses([]);
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
    <TeacherScreen title="صفوفي" subtitle="الصفوف المعيّنة لك من الجدول" hero>
      {loading ? (
        <LoadingBlock />
      ) : classes.length === 0 ? (
        <EmptyBlock
          icon="Users"
          title="لا توجد صفوف معيّنة"
          subtitle="عند نشر جدول مدرسي يضم حصصك ستظهر هنا تلقائياً"
        />
      ) : (
        classes.map((c, i) => (
          <FadeIn key={`${c.classroom_id}-${c.subject_id}`} delay={i * 50}>
            <SoftCard
              onPress={() =>
                router.push(
                  `/teacher/class/${c.classroom_id}?subject_id=${c.subject_id}` as never,
                )
              }
            >
              <View style={[styles.row, { flexDirection: rowRtl as 'row' }]}>
                <View style={styles.icon}>
                  <Icon name="GraduationCap" size={22} color={t.brand} />
                </View>
                <View style={styles.main}>
                  <Text style={styles.title}>
                    {c.grade_name} · {c.classroom_name}
                  </Text>
                  <Text style={styles.sub}>{c.subject_name}</Text>
                  <View style={[styles.meta, { flexDirection: rowRtl as 'row' }]}>
                    <Meta icon="Users" text={`${c.students_count} طالب`} />
                    <Meta icon="CalendarDays" text={`${c.weekly_slots} حصة/أسبوع`} />
                  </View>
                </View>
                <Icon name="ChevronLeft" size={20} color={t.inkMute} />
              </View>
            </SoftCard>
          </FadeIn>
        ))
      )}
    </TeacherScreen>
  );
}

function Meta({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={[styles.metaItem, { flexDirection: rowRtl as 'row' }]}>
      <Icon name={icon} size={13} color={t.inkMute} />
      <Text style={styles.metaText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: 'center', gap: 12 },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: t.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  main: { flex: 1, gap: 4 },
  title: {
    fontFamily: t.fonts.bold,
    fontSize: 15,
    color: t.ink,
    writingDirection: 'rtl',
  },
  sub: {
    fontFamily: t.fonts.medium,
    fontSize: 13,
    color: t.brand,
    writingDirection: 'rtl',
  },
  meta: { gap: 12, marginTop: 4 },
  metaItem: { alignItems: 'center', gap: 4 },
  metaText: {
    fontFamily: t.fonts.regular,
    fontSize: 12,
    color: t.inkSoft,
    fontVariant: ['tabular-nums'],
  },
});
