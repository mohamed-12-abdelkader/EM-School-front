import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Badge, Button, EmptyState } from '@/components/ui';
import {
  LoadingBlock,
  ProgressBar,
  StudentScreen,
  formatShortDate,
  lectureStatusLabel,
} from '@/components/student/ui';
import {
  getLecture,
  getSubject,
  getTeacher,
} from '@/services/studentPortal';
import type { Lecture } from '@/types/studentPortal';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

export default function LectureDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [lecture, setLecture] = useState<Lecture | null>(null);
  const [loading, setLoading] = useState(true);
  const [watched, setWatched] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        setLoading(true);
        const data = await getLecture(String(id));
        if (alive) {
          setLecture(data);
          setWatched(data?.watchProgress ?? 0);
          setLoading(false);
        }
      })();
      return () => {
        alive = false;
      };
    }, [id]),
  );

  if (loading) {
    return (
      <StudentScreen title="المحاضرة" onBack>
        <LoadingBlock />
      </StudentScreen>
    );
  }

  if (!lecture) {
    return (
      <StudentScreen title="المحاضرة" onBack>
        <EmptyState icon="Presentation" title="المحاضرة غير موجودة" />
      </StudentScreen>
    );
  }

  const subject = getSubject(lecture.subjectId);
  const teacher = getTeacher(lecture.teacherId);

  return (
    <StudentScreen title={lecture.title} onBack>
      <View style={styles.player}>
        <Text style={styles.playerHint}>مشغّل فيديو — جاهز للربط لاحقاً</Text>
        <Text style={styles.playerTitle}>{lecture.title}</Text>
        <Badge label={lectureStatusLabel[lecture.status]} tone="primary" />
      </View>

      <Text style={styles.meta}>
        {subject?.name} · {teacher?.name} · {formatShortDate(lecture.date)} ·{' '}
        {lecture.durationMin} دقيقة
      </Text>
      {lecture.summary ? <Text style={styles.summary}>{lecture.summary}</Text> : null}

      <Text style={styles.progressLabel}>نسبة المشاهدة (تجريبية): {watched}%</Text>
      <ProgressBar value={watched} />

      <Button
        label={watched >= 100 ? 'مكتملة' : 'متابعة المشاهدة (تجريبي)'}
        onPress={() => setWatched((w) => Math.min(100, w + 25))}
        disabled={watched >= 100}
      />
      <Button
        label="فتح المادة"
        variant="outline"
        onPress={() => router.push(`/(student)/subject/${lecture.subjectId}` as never)}
      />
    </StudentScreen>
  );
}

const styles = StyleSheet.create({
  player: {
    backgroundColor: colors.primaryDeep,
    borderRadius: radii.xl,
    padding: spacing['2xl'],
    gap: spacing.md,
    minHeight: 180,
    justifyContent: 'center',
  },
  playerHint: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.onBrandMuted,
    textAlign: 'center',
  },
  playerTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.onBrand,
    textAlign: 'center',
  },
  meta: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'right',
  },
  summary: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.text,
    textAlign: 'right',
    lineHeight: 22,
  },
  progressLabel: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'right',
  },
});
