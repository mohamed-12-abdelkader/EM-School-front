import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Avatar, Badge, Button, EmptyState } from '@/components/ui';
import {
  LoadingBlock,
  ListRow,
  ProgressBar,
  SectionTitle,
  StudentScreen,
  assignmentStatusLabel,
  formatShortDate,
  lectureStatusLabel,
} from '@/components/student/ui';
import {
  ensureThreadForTeacher,
  getSubjectDetail,
} from '@/services/studentPortal';
import type { Assignment, Exam, Lecture, StudentSubject, StudentTeacher } from '@/types/studentPortal';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

export default function SubjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState<StudentSubject | null>(null);
  const [teacher, setTeacher] = useState<StudentTeacher | null>(null);
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [announcements, setAnnouncements] = useState<string[]>([]);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        setLoading(true);
        const data = await getSubjectDetail(String(id));
        if (!alive) return;
        if (data) {
          setSubject(data.subject);
          setTeacher(data.teacher);
          setLectures(data.lectures);
          setAssignments(data.assignments);
          setExams(data.exams);
          setAnnouncements(data.announcements);
        }
        setLoading(false);
      })();
      return () => {
        alive = false;
      };
    }, [id]),
  );

  const chatTeacher = async () => {
    if (!teacher) return;
    const thread = await ensureThreadForTeacher(teacher.id);
    router.push(`/(student)/chat/${thread.id}` as never);
  };

  if (loading) {
    return (
      <StudentScreen title="المادة" onBack>
        <LoadingBlock />
      </StudentScreen>
    );
  }

  if (!subject) {
    return (
      <StudentScreen title="المادة" onBack>
        <EmptyState icon="BookOpen" title="المادة غير موجودة" />
      </StudentScreen>
    );
  }

  return (
    <StudentScreen
      title={subject.name}
      subtitle={teacher?.name || subject.teacherName || 'مدرسك'}
      onBack
    >
      <View style={styles.hero}>
        <Avatar
          name={teacher?.name || subject.name}
          color={teacher?.avatarColor || subject.color}
          size={48}
        />
        <View style={styles.heroText}>
          <Text style={styles.teacher}>
            {teacher?.name || subject.teacherName || 'مدرس المادة'}
          </Text>
          <Text style={styles.desc}>{subject.description}</Text>
        </View>
      </View>
      <ProgressBar value={subject.progress} color={subject.color} />
      <Text style={styles.progressLabel}>تقدمك {subject.progress}%</Text>

      {teacher ? (
        <Button label="تواصل مع المدرس" variant="outline" onPress={chatTeacher} />
      ) : null}

      <SectionTitle title="إعلانات المدرس" />
      {announcements.length === 0 ? (
        <Text style={styles.muted}>لا توجد إعلانات</Text>
      ) : (
        announcements.map((a, i) => (
          <Text key={i} style={styles.announce}>
            • {a}
          </Text>
        ))
      )}

      <SectionTitle title="المحاضرات" />
      {lectures.map((l) => (
        <ListRow
          key={l.id}
          title={l.title}
          meta={`${formatShortDate(l.date)} · ${l.durationMin} د · مشاهدة ${l.watchProgress}%`}
          onPress={() => router.push(`/(student)/lecture/${l.id}` as never)}
          right={<Badge label={lectureStatusLabel[l.status]} tone="info" />}
        />
      ))}

      <SectionTitle title="الواجبات" />
      {assignments.map((a) => (
        <ListRow
          key={a.id}
          title={a.title}
          meta={`تسليم ${formatShortDate(a.dueAt)}`}
          onPress={() => router.push(`/(student)/assignment/${a.id}` as never)}
          right={
            <Badge
              label={assignmentStatusLabel[a.status]}
              tone={a.status === 'overdue' ? 'danger' : 'neutral'}
            />
          }
        />
      ))}

      <SectionTitle title="الامتحانات وبنك الأسئلة" />
      {exams.map((e) => (
        <ListRow
          key={e.id}
          title={e.title}
          meta={`${e.questionIds.length} أسئلة · ${e.durationMin} د`}
          onPress={() => router.push(`/(student)/exam/${e.id}` as never)}
        />
      ))}
    </StudentScreen>
  );
}

const styles = StyleSheet.create({
  hero: {
    flexDirection: 'row-reverse',
    gap: spacing.md,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  heroText: { flex: 1, gap: 4 },
  teacher: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
    color: colors.text,
    textAlign: 'right',
  },
  desc: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'right',
  },
  progressLabel: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'right',
    marginTop: -8,
  },
  muted: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'right',
  },
  announce: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.text,
    textAlign: 'right',
    lineHeight: 20,
  },
});
