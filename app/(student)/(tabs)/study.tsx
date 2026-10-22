import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Avatar, Badge } from '@/components/ui';
import {
  FadeIn,
  IconBadge,
  LoadingBlock,
  ProgressBar,
  SectionTitle,
  SoftCard,
  StudentScreen,
  rowRtl,
} from '@/components/student/ui';
import { studentTheme as t } from '@/components/student/theme';
import { getStudentSubjects, getTeacher } from '@/services/studentPortal';
import type { StudentSubject } from '@/types/studentPortal';

const TOOLS = [
  { label: 'الجدول', icon: 'CalendarClock', href: '/(student)/timetable', color: t.brand },
  { label: 'المحاضرات', icon: 'Presentation', href: '/(student)/lectures', color: '#0EA5E9' },
  { label: 'الواجبات', icon: 'FileText', href: '/(student)/assignments', color: t.warning },
  { label: 'الامتحانات', icon: 'ClipboardList', href: '/(student)/exams', color: t.accent },
  { label: 'المذاكرة', icon: 'CalendarDays', href: '/(student)/planner', color: t.success },
  { label: 'النتائج', icon: 'FileBarChart', href: '/(student)/results', color: '#6366F1' },
  { label: 'المسابقات', icon: 'Trophy', href: '/(student)/competitions', color: t.accent },
  { label: 'الإشعارات', icon: 'Bell', href: '/(student)/notifications', color: t.danger },
  { label: 'المزيد', icon: 'Menu', href: '/(student)/more', color: t.inkSoft },
];

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
    <StudentScreen title="دراستي" subtitle="المواد والأدوات" hero>
      <SectionTitle title="أدوات سريعة" icon="Sparkles" />
      <View style={styles.tools}>
        {TOOLS.map((tool, i) => (
          <FadeIn key={tool.href} delay={i * 30}>
            <Pressable
              style={styles.tool}
              onPress={() => router.push(tool.href as never)}
            >
              <IconBadge name={tool.icon} color={tool.color} size={44} />
              <Text style={styles.toolLabel}>{tool.label}</Text>
            </Pressable>
          </FadeIn>
        ))}
      </View>

      <SectionTitle title="موادي" icon="BookOpen" />
      {loading ? (
        <LoadingBlock />
      ) : (
        subjects.map((s, i) => {
          const teacher = getTeacher(s.teacherId);
          return (
            <FadeIn key={s.id} delay={60 + i * 40}>
              <SoftCard
                onPress={() => router.push(`/(student)/subject/${s.id}` as never)}
                padded={false}
              >
                <View style={styles.subject}>
                  <View
                    style={[styles.subjectAccent, { backgroundColor: s.color }]}
                  />
                  <View style={styles.subjectBody}>
                    <View style={styles.subjectTop}>
                      <IconBadge name={s.icon} color={s.color} size={48} />
                      <View style={styles.subjectInfo}>
                        <Text style={styles.subjectName}>{s.name}</Text>
                        <View style={styles.teacherRow}>
                          {teacher ? (
                            <Avatar
                              name={teacher.name}
                              size={22}
                              color={teacher.avatarColor}
                            />
                          ) : null}
                          <Text style={styles.teacherName}>{teacher?.name}</Text>
                        </View>
                      </View>
                      {s.lastExamScore != null ? (
                        <Badge
                          label={`${s.lastExamScore}/${s.lastExamMax}`}
                          tone="info"
                        />
                      ) : (
                        <Badge label="بدون امتحان" tone="neutral" />
                      )}
                    </View>
                    <ProgressBar value={s.progress} color={s.color} height={8} />
                    <Text style={styles.meta}>
                      {s.lecturesCount} محاضرة · {s.assignmentsCount} واجب · تقدم{' '}
                      {s.progress}%
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
  tools: {
    flexDirection: rowRtl,
    flexWrap: 'wrap',
    gap: 10,
  },
  tool: {
    width: '30%',
    flexGrow: 1,
    minWidth: 100,
    backgroundColor: t.card,
    borderWidth: 1,
    borderColor: t.line,
    borderRadius: t.radius.lg,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 8,
    ...t.shadow.card,
  },
  toolLabel: {
    fontFamily: t.fonts.semiBold,
    fontSize: 12,
    color: t.ink,
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
