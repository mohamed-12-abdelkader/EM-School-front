import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Avatar, Badge, EmptyState } from '@/components/ui';
import {
  FadeIn,
  IconBadge,
  LoadingBlock,
  ProgressBar,
  SoftCard,
  StudentScreen,
  rowRtl,
} from '@/components/student/ui';
import { studentTheme as t } from '@/components/student/theme';
import { getStudentSubjects, getTeacher } from '@/services/studentPortal';
import type { StudentSubject } from '@/types/studentPortal';

const TOOLS = [
  { label: 'واجبات', icon: 'FileText', href: '/(student)/assignments', color: t.warning },
  { label: 'امتحانات', icon: 'ClipboardList', href: '/(student)/exams', color: t.sky },
  { label: 'دروس', icon: 'Presentation', href: '/(student)/lectures', color: t.brand },
  { label: 'نتائج', icon: 'FileBarChart', href: '/(student)/results', color: t.success },
  { label: 'جدول', icon: 'CalendarClock', href: '/(student)/timetable', color: '#6366F1' },
  { label: 'إشعارات', icon: 'Bell', href: '/(student)/notifications', color: t.danger },
] as const;

export default function StudyTab() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<StudentSubject[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        setLoading(true);
        const data = await getStudentSubjects();
        if (alive) {
          setSubjects(data);
          setLoading(false);
        }
      })();
      return () => {
        alive = false;
      };
    }, []),
  );

  return (
    <StudentScreen title="دراستي" subtitle="اختر مادة للمتابعة" hero>
      <Text style={styles.blockLabel}>وصول سريع</Text>
      <View style={styles.tools}>
        {TOOLS.map((tool, i) => (
          <FadeIn key={tool.href} delay={i * 25}>
            <Pressable
              style={({ pressed }) => [
                styles.tool,
                pressed && { transform: [{ scale: 0.97 }] },
              ]}
              onPress={() => router.push(tool.href as never)}
            >
              <IconBadge name={tool.icon} color={tool.color} size={40} />
              <Text style={styles.toolLabel}>{tool.label}</Text>
            </Pressable>
          </FadeIn>
        ))}
      </View>

      <View style={styles.subjectsHead}>
        <Text style={styles.blockLabel}>موادي هذا الترم</Text>
        <Text style={styles.count}>{subjects.length} مواد</Text>
      </View>

      {loading ? (
        <LoadingBlock />
      ) : subjects.length === 0 ? (
        <EmptyState
          icon="BookOpen"
          title="لا مواد بعد"
          description="عند إضافة دروس أو واجبات من المدرس ستظهر هنا"
        />
      ) : (
        subjects.map((s, i) => {
          const teacher = getTeacher(s.teacherId);
          const teacherName = teacher?.name || s.teacherName || '';
          return (
            <FadeIn key={s.id} delay={50 + i * 40}>
              <SoftCard
                onPress={() =>
                  router.push(`/(student)/subject/${s.id}` as never)
                }
                padded={false}
              >
                <View style={styles.subject}>
                  <View
                    style={[styles.subjectAccent, { backgroundColor: s.color }]}
                  />
                  <View style={styles.subjectBody}>
                    <View style={styles.subjectTop}>
                      <View
                        style={[
                          styles.subjectIcon,
                          { backgroundColor: `${s.color}18` },
                        ]}
                      >
                        <IconBadge
                          name={s.icon}
                          color={s.color}
                          bg="transparent"
                          size={40}
                        />
                      </View>
                      <View style={styles.subjectInfo}>
                        <Text style={styles.subjectName}>{s.name}</Text>
                        {teacherName ? (
                          <View style={styles.teacherRow}>
                            <Avatar
                              name={teacherName}
                              size={20}
                              color={teacher?.avatarColor || s.color}
                            />
                            <Text style={styles.teacherName}>{teacherName}</Text>
                          </View>
                        ) : null}
                      </View>
                      <Badge
                        label={`${s.lecturesCount + s.assignmentsCount}`}
                        tone="neutral"
                      />
                    </View>
                    <ProgressBar value={s.progress} color={s.color} height={7} />
                    <Text style={styles.meta}>
                      {s.lecturesCount} دروس · {s.assignmentsCount} واجبات
                      {s.examsCount != null ? ` · ${s.examsCount} امتحانات` : ''}
                    </Text>
                  </View>
                </View>
              </SoftCard>
            </FadeIn>
          );
        })
      )}
    </StudentScreen>
  );
}

const styles = StyleSheet.create({
  blockLabel: {
    fontFamily: t.fonts.bold,
    fontSize: 16,
    color: t.ink,
    textAlign: 'right',
    marginBottom: 4,
  },
  subjectsHead: {
    flexDirection: rowRtl,
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: t.space.sm,
  },
  count: {
    fontFamily: t.fonts.medium,
    fontSize: 12,
    color: t.inkMute,
  },
  tools: {
    flexDirection: rowRtl,
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: t.space.sm,
  },
  tool: {
    width: '31%',
    flexGrow: 1,
    minWidth: 96,
    backgroundColor: t.card,
    borderWidth: 1,
    borderColor: t.line,
    borderRadius: t.radius.lg,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 6,
    ...t.shadow.card,
  },
  toolLabel: {
    fontFamily: t.fonts.semiBold,
    fontSize: 12,
    color: t.inkSoft,
  },
  subject: {
    flexDirection: rowRtl,
    overflow: 'hidden',
  },
  subjectAccent: {
    width: 5,
  },
  subjectBody: {
    flex: 1,
    padding: t.space.md,
    gap: 10,
  },
  subjectTop: {
    flexDirection: rowRtl,
    alignItems: 'center',
    gap: 12,
  },
  subjectIcon: {
    borderRadius: 14,
  },
  subjectInfo: { flex: 1, gap: 6, minWidth: 0 },
  subjectName: {
    fontFamily: t.fonts.bold,
    fontSize: 16,
    color: t.ink,
    textAlign: 'right',
  },
  teacherRow: {
    flexDirection: rowRtl,
    alignItems: 'center',
    gap: 6,
  },
  teacherName: {
    fontFamily: t.fonts.regular,
    fontSize: 12,
    color: t.inkSoft,
  },
  meta: {
    fontFamily: t.fonts.medium,
    fontSize: 11,
    color: t.inkMute,
    textAlign: 'right',
  },
});
