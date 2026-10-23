import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Badge, EmptyState, Icon } from '@/components/ui';
import {
  FadeIn,
  LoadingBlock,
  StudentScreen,
  formatShortDate,
  rowRtl,
} from '@/components/student/ui';
import { studentTheme as t } from '@/components/student/theme';
import { getExams, getStudentSubjects } from '@/services/studentPortal';
import type { Exam, StudentSubject } from '@/types/studentPortal';

export default function ExamsScreen() {
  const router = useRouter();
  const [list, setList] = useState<Exam[]>([]);
  const [subjects, setSubjects] = useState<StudentSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [subjectId, setSubjectId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        setLoading(true);
        try {
          const [data, subs] = await Promise.all([
            getExams(subjectId ?? undefined),
            getStudentSubjects(),
          ]);
          if (alive) {
            setList(data);
            setSubjects(subs);
          }
        } finally {
          if (alive) setLoading(false);
        }
      })();
      return () => {
        alive = false;
      };
    }, [subjectId]),
  );

  const openCount = useMemo(
    () => list.filter((e) => !e.attempted).length,
    [list],
  );

  return (
    <StudentScreen title="الامتحانات" subtitle="من مدرسي فصلك" onBack hero>
      <FadeIn>
        <View style={styles.summary}>
          <Text style={styles.summaryText}>
            {list.length} امتحان · {openCount} بانتظارك
          </Text>
        </View>
      </FadeIn>

      <View style={styles.chips}>
        <Pressable
          onPress={() => setSubjectId(null)}
          style={[styles.chip, !subjectId && styles.chipOn]}
        >
          <Text style={[styles.chipText, !subjectId && styles.chipTextOn]}>
            الكل
          </Text>
        </Pressable>
        {subjects.map((s) => {
          const active = subjectId === s.id;
          return (
            <Pressable
              key={s.id}
              onPress={() => setSubjectId(s.id)}
              style={[styles.chip, active && styles.chipOn]}
            >
              <Text style={[styles.chipText, active && styles.chipTextOn]}>
                {s.name}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <LoadingBlock />
      ) : list.length === 0 ? (
        <EmptyState
          icon="ClipboardList"
          title="لا امتحانات منشورة"
          description="عندما ينشر المدرس امتحاناً لفصلك سيظهر هنا"
        />
      ) : (
        list.map((e, i) => (
          <FadeIn key={e.id} delay={i * 40}>
            <Pressable
              style={({ pressed }) => [
                styles.card,
                pressed && { opacity: 0.94 },
              ]}
              onPress={() => router.push(`/(student)/exam/${e.id}` as never)}
            >
              <View
                style={[
                  styles.accent,
                  { backgroundColor: e.attempted ? t.success : t.brand },
                ]}
              />
              <View style={styles.body}>
                <View style={styles.top}>
                  <View style={styles.textCol}>
                    <Text style={styles.title} numberOfLines={2}>
                      {e.title}
                    </Text>
                    <Text style={styles.meta}>
                      {[
                        e.subjectName,
                        e.teacherName ? `أ/${e.teacherName}` : null,
                        `${e.questionIds.length || '—'} أسئلة`,
                        `${e.durationMin} د`,
                        e.date ? formatShortDate(e.date) : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                  </View>
                  <Badge
                    label={
                      e.attempted
                        ? e.score != null
                          ? `${e.score}/${e.maxScore}`
                          : 'تم'
                        : 'ابدأ'
                    }
                    tone={e.attempted ? 'success' : 'primary'}
                  />
                </View>
                <View style={styles.foot}>
                  <Text style={styles.cta}>
                    {e.attempted ? 'عرض النتيجة والتصحيح' : 'دخول الامتحان'}
                  </Text>
                  <Icon name="ChevronLeft" size={16} color={t.brand} />
                </View>
              </View>
            </Pressable>
          </FadeIn>
        ))
      )}
    </StudentScreen>
  );
}

const styles = StyleSheet.create({
  summary: {
    backgroundColor: t.brandSoft,
    borderRadius: t.radius.lg,
    padding: t.space.md,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  summaryText: {
    fontFamily: t.fonts.semiBold,
    fontSize: 13,
    color: t.brandDeep,
    textAlign: 'right',
  },
  chips: {
    flexDirection: rowRtl,
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: t.radius.full,
    backgroundColor: t.card,
    borderWidth: 1,
    borderColor: t.line,
  },
  chipOn: {
    backgroundColor: t.brandSoft,
    borderColor: '#BFDBFE',
  },
  chipText: {
    fontFamily: t.fonts.semiBold,
    fontSize: 12,
    color: t.inkSoft,
  },
  chipTextOn: { color: t.brandDeep },
  card: {
    flexDirection: rowRtl,
    backgroundColor: t.card,
    borderRadius: t.radius.lg,
    borderWidth: 1,
    borderColor: t.line,
    overflow: 'hidden',
    ...t.shadow.card,
  },
  accent: { width: 5 },
  body: { flex: 1, padding: t.space.md, gap: 10 },
  top: {
    flexDirection: rowRtl,
    alignItems: 'flex-start',
    gap: 10,
  },
  textCol: { flex: 1, gap: 4 },
  title: {
    fontFamily: t.fonts.bold,
    fontSize: 15,
    color: t.ink,
    textAlign: 'right',
  },
  meta: {
    fontFamily: t.fonts.regular,
    fontSize: 12,
    color: t.inkMute,
    textAlign: 'right',
    lineHeight: 18,
  },
  foot: {
    flexDirection: rowRtl,
    alignItems: 'center',
    gap: 2,
  },
  cta: {
    fontFamily: t.fonts.semiBold,
    fontSize: 13,
    color: t.brand,
  },
});
