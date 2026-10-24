import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { EmptyState, Icon } from '@/components/ui';
import {
  FadeIn,
  IconBadge,
  LoadingBlock,
  StudentPageShell,
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
  const [refreshing, setRefreshing] = useState(false);
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(
    async (soft = false) => {
      if (soft) setRefreshing(true);
      else setLoading(true);
      setError('');
      try {
        const [data, subs] = await Promise.all([
          getExams(subjectId ?? undefined),
          getStudentSubjects(),
        ]);
        setList(data);
        setSubjects(subs);
      } catch (err) {
        setList([]);
        setError(err instanceof Error ? err.message : 'تعذر تحميل الامتحانات');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [subjectId],
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const openCount = useMemo(
    () => list.filter((e) => !e.attempted).length,
    [list],
  );
  const doneCount = list.length - openCount;

  return (
    <StudentPageShell
      title="الامتحانات"
      subtitle={
        openCount > 0
          ? `${openCount} بانتظارك · من مدرسي فصلك`
          : 'نتائجك وتصحيحاتك هنا'
      }
      icon="ClipboardList"
      refreshing={refreshing}
      onRefresh={() => load(true)}
    >
      <FadeIn>
        <View style={styles.stats}>
          <View style={[styles.stat, styles.statPrimary]}>
            <Text style={styles.statValue}>{openCount}</Text>
            <Text style={styles.statLabel}>بانتظارك</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: t.success }]}>
              {doneCount}
            </Text>
            <Text style={styles.statLabel}>مكتمل</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{list.length}</Text>
            <Text style={styles.statLabel}>الإجمالي</Text>
          </View>
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
      ) : error ? (
        <EmptyState
          icon="AlertCircle"
          title="تعذر التحميل"
          description={error}
          actionLabel="إعادة المحاولة"
          onAction={() => load()}
        />
      ) : list.length === 0 ? (
        <EmptyState
          icon="ClipboardList"
          title="لا امتحانات منشورة"
          description="عندما ينشر المدرس امتحاناً لفصلك سيظهر هنا"
        />
      ) : (
        <View style={styles.list}>
          {list.map((e, i) => {
            const color = e.attempted ? t.success : t.brand;
            return (
              <FadeIn key={e.id} delay={i * 40}>
                <Pressable
                  style={({ pressed }) => [
                    styles.card,
                    pressed && {
                      opacity: 0.94,
                      transform: [{ scale: 0.995 }],
                    },
                  ]}
                  onPress={() =>
                    router.push(`/(student)/exam/${e.id}` as never)
                  }
                >
                  <View style={[styles.accent, { backgroundColor: color }]} />
                  <View style={styles.body}>
                    <View style={styles.top}>
                      <IconBadge
                        name={e.attempted ? 'Trophy' : 'ClipboardList'}
                        color={color}
                        size={48}
                      />
                      <View style={styles.textCol}>
                        <View style={styles.titleRow}>
                          <Text style={styles.title} numberOfLines={2}>
                            {e.title}
                          </Text>
                          <View
                            style={[
                              styles.pill,
                              {
                                backgroundColor: e.attempted
                                  ? t.successSoft
                                  : t.brandSoft,
                              },
                            ]}
                          >
                            <Text style={[styles.pillText, { color }]}>
                              {e.attempted
                                ? e.score != null
                                  ? `${e.score}/${e.maxScore}`
                                  : 'مكتمل'
                                : 'ابدأ'}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.meta} numberOfLines={2}>
                          {[
                            e.subjectName,
                            e.teacherName ? `أ/${e.teacherName}` : null,
                            `${e.questionIds.length || '—'} أسئلة`,
                            `${e.durationMin} د`,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </Text>
                        {e.date ? (
                          <View style={styles.metaChip}>
                            <Icon
                              name="CalendarDays"
                              size={12}
                              color={t.inkMute}
                            />
                            <Text style={styles.metaChipText}>
                              {formatShortDate(e.date)}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                    <View style={styles.foot}>
                      <Text style={[styles.cta, { color }]}>
                        {e.attempted
                          ? 'عرض النتيجة والتصحيح'
                          : 'دخول الامتحان'}
                      </Text>
                      <Icon name="ChevronLeft" size={16} color={color} />
                    </View>
                  </View>
                </Pressable>
              </FadeIn>
            );
          })}
        </View>
      )}
    </StudentPageShell>
  );
}

const styles = StyleSheet.create({
  stats: {
    flexDirection: rowRtl,
    gap: 8,
  },
  stat: {
    flex: 1,
    backgroundColor: t.card,
    borderRadius: t.radius.lg,
    borderWidth: 1,
    borderColor: t.line,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 2,
    ...t.shadow.card,
  },
  statPrimary: {
    backgroundColor: t.brandSoft,
    borderColor: '#BFDBFE',
  },
  statValue: {
    fontFamily: t.fonts.bold,
    fontSize: 22,
    color: t.brandDeep,
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontFamily: t.fonts.medium,
    fontSize: 11,
    color: t.inkMute,
  },
  chips: {
    flexDirection: rowRtl,
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
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
  list: { gap: 12 },
  card: {
    flexDirection: rowRtl,
    backgroundColor: t.card,
    borderRadius: t.radius.xl,
    borderWidth: 1,
    borderColor: t.line,
    overflow: 'hidden',
    ...t.shadow.card,
  },
  accent: { width: 5 },
  body: { flex: 1, padding: t.space.md, gap: 12 },
  top: {
    flexDirection: rowRtl,
    alignItems: 'flex-start',
    gap: 12,
  },
  textCol: { flex: 1, gap: 6, minWidth: 0 },
  titleRow: {
    flexDirection: rowRtl,
    alignItems: 'flex-start',
    gap: 8,
  },
  title: {
    flex: 1,
    fontFamily: t.fonts.bold,
    fontSize: 15,
    color: t.ink,
    textAlign: 'right',
    lineHeight: 22,
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: t.radius.full,
  },
  pillText: {
    fontFamily: t.fonts.semiBold,
    fontSize: 11,
  },
  meta: {
    fontFamily: t.fonts.regular,
    fontSize: 12,
    color: t.inkMute,
    textAlign: 'right',
    lineHeight: 18,
  },
  metaChip: {
    alignSelf: 'flex-end',
    flexDirection: rowRtl,
    alignItems: 'center',
    gap: 4,
    backgroundColor: t.cardMuted,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: t.radius.full,
  },
  metaChipText: {
    fontFamily: t.fonts.medium,
    fontSize: 11,
    color: t.inkSoft,
  },
  foot: {
    flexDirection: rowRtl,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 2,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: t.line,
  },
  cta: {
    fontFamily: t.fonts.semiBold,
    fontSize: 13,
  },
});
