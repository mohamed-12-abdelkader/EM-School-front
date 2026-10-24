import { useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '@/components/ui';
import { ChildSwitcher } from '@/components/parent/ChildSwitcher';
import { useParentChild } from '@/components/parent/ParentChildContext';
import { parentTheme as t } from '@/components/parent/theme';
import {
  EmptyHint,
  FadeIn,
  LoadingBlock,
  StatCard,
  percentTone,
  rowRtl,
} from '@/components/parent/ui';
import {
  getParentChildExams,
  getParentChildTasks,
} from '@/services/parentPortal';
import type { ParentExamResult, ParentTaskGrade } from '@/types/parentPortal';

type MaterialGradeGroup = {
  key: string;
  subjectId: string;
  subjectName: string;
  teacherName: string;
  name: string;
  exams: ParentExamResult[];
  tasks: ParentTaskGrade[];
  avgExam: number | null;
  avgTask: number | null;
};

function avgPercent(items: Array<{ percent: number }>) {
  if (!items.length) return null;
  return Math.round(items.reduce((s, x) => s + x.percent, 0) / items.length);
}

export default function ParentGradesTab() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const wide = width >= 720;
  const { children, selectedChild, selectedChildId, setSelectedChildId } =
    useParentChild();

  const [exams, setExams] = useState<ParentExamResult[]>([]);
  const [tasks, setTasks] = useState<ParentTaskGrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(
    async (soft = false) => {
      if (!selectedChildId) {
        setExams([]);
        setTasks([]);
        setLoading(false);
        return;
      }
      if (soft) setRefreshing(true);
      else setLoading(true);
      setError('');
      try {
        const [examData, taskData] = await Promise.all([
          getParentChildExams(selectedChildId),
          getParentChildTasks(selectedChildId),
        ]);
        setExams(examData.exams);
        setTasks(taskData.tasks);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'تعذر تحميل الدرجات');
        if (!soft) {
          setExams([]);
          setTasks([]);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [selectedChildId],
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const materials = useMemo((): MaterialGradeGroup[] => {
    const map = new Map<string, MaterialGradeGroup>();

    const ensure = (
      subjectId: string,
      subjectName: string,
      teacherName: string | null | undefined,
    ) => {
      const teacher = (teacherName || '').trim() || 'معلّم';
      const key = `${subjectId}::${teacher}`;
      let group = map.get(key);
      if (!group) {
        group = {
          key,
          subjectId,
          subjectName,
          teacherName: teacher,
          name: [subjectName, teacher].filter(Boolean).join(' '),
          exams: [],
          tasks: [],
          avgExam: null,
          avgTask: null,
        };
        map.set(key, group);
      }
      return group;
    };

    for (const e of exams) {
      ensure(e.subjectId, e.subjectName, e.teacherName).exams.push(e);
    }
    for (const task of tasks) {
      ensure(task.subjectId, task.subjectName, task.teacherName).tasks.push(task);
    }

    return Array.from(map.values())
      .map((g) => ({
        ...g,
        avgExam: avgPercent(g.exams),
        avgTask: avgPercent(g.tasks),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  }, [exams, tasks]);

  const avgExam = avgPercent(exams) ?? 0;
  const avgTask = avgPercent(tasks) ?? 0;

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            wide && { maxWidth: 880, alignSelf: 'center', width: '100%' },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(true)}
              tintColor={t.guardian}
            />
          }
        >
          <Text style={styles.title}>الدرجات والنتائج</Text>
          <Text style={styles.sub}>
            {selectedChild
              ? `درجات ${selectedChild.name} حسب المادة — مثل: اللغة العربية leo`
              : 'اختر ابناً لعرض الدرجات'}
          </Text>

          <ChildSwitcher
            children={children}
            selectedId={selectedChildId}
            onSelect={setSelectedChildId}
          />

          {loading ? (
            <LoadingBlock label="جارٍ تحميل الدرجات..." />
          ) : error ? (
            <EmptyHint title="تعذر التحميل" body={error} />
          ) : (
            <>
              <View style={[styles.stats, { flexDirection: rowRtl as 'row' }]}>
                <StatCard
                  label="متوسط الامتحانات"
                  value={`${avgExam}%`}
                  hint={`${exams.length} امتحان`}
                  icon="GraduationCap"
                  tone="brand"
                />
                <StatCard
                  label="متوسط الواجبات"
                  value={`${avgTask}%`}
                  hint={`${tasks.length} واجب`}
                  icon="ClipboardCheck"
                  tone="guardian"
                />
              </View>

              {materials.length === 0 ? (
                <EmptyHint
                  title="لا درجات بعد"
                  body="عندما يُصحَّح امتحان أو واجب لابنك ستظهر المواد هنا."
                />
              ) : (
                <View style={styles.list}>
                  {materials.map((m, i) => {
                    const overall =
                      m.avgExam != null && m.avgTask != null
                        ? Math.round((m.avgExam + m.avgTask) / 2)
                        : m.avgExam ?? m.avgTask ?? 0;
                    const tone = percentTone(overall);
                    return (
                      <FadeIn key={m.key} delay={Math.min(i, 10) * 35}>
                        <Pressable
                          onPress={() =>
                            router.push(
                              `/(parent)/grade/${selectedChildId}/${m.subjectId}?teacher=${encodeURIComponent(m.teacherName)}` as never,
                            )
                          }
                          style={({ pressed }) => [
                            styles.card,
                            pressed && { opacity: 0.94 },
                          ]}
                        >
                          <View
                            style={[styles.cardTop, { flexDirection: rowRtl as 'row' }]}
                          >
                            <View style={[styles.badge, { backgroundColor: tone.soft }]}>
                              <Text style={[styles.badgeText, { color: tone.color }]}>
                                {overall}%
                              </Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.cardTitle} numberOfLines={2}>
                                {m.name}
                              </Text>
                              <Text style={styles.cardMeta}>
                                {m.exams.length} امتحان · {m.tasks.length} واجب
                                {m.avgExam != null ? ` · امتحانات ${m.avgExam}%` : ''}
                                {m.avgTask != null ? ` · واجبات ${m.avgTask}%` : ''}
                              </Text>
                            </View>
                            <Icon name="ChevronLeft" size={20} color={t.inkMute} />
                          </View>
                        </Pressable>
                      </FadeIn>
                    );
                  })}
                </View>
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: t.canvas },
  safe: { flex: 1 },
  content: { padding: 16, gap: 12, paddingBottom: 110 },
  title: {
    fontFamily: t.fonts.bold,
    fontSize: 24,
    color: t.ink,
    textAlign: 'right',
  },
  sub: {
    fontFamily: t.fonts.regular,
    fontSize: 14,
    color: t.inkSoft,
    textAlign: 'right',
    marginTop: -6,
    lineHeight: 22,
  },
  stats: { gap: 10 },
  list: { gap: 10 },
  card: {
    backgroundColor: t.card,
    borderRadius: t.radius.lg,
    borderWidth: 1,
    borderColor: t.line,
    padding: 14,
    ...t.shadow.card,
  },
  cardTop: { alignItems: 'center', gap: 12 },
  badge: {
    minWidth: 58,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  badgeText: {
    fontFamily: t.fonts.bold,
    fontSize: 16,
    fontVariant: ['tabular-nums'],
  },
  cardTitle: {
    fontFamily: t.fonts.bold,
    fontSize: 16,
    color: t.ink,
    textAlign: 'right',
  },
  cardMeta: {
    fontFamily: t.fonts.regular,
    fontSize: 12,
    color: t.inkMute,
    textAlign: 'right',
    marginTop: 6,
    lineHeight: 18,
  },
});
