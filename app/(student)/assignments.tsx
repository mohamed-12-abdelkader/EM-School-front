import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Badge, EmptyState, Icon } from '@/components/ui';
import {
  FadeIn,
  IconBadge,
  LoadingBlock,
  StudentScreen,
  assignmentStatusLabel,
  formatShortDate,
  rowRtl,
} from '@/components/student/ui';
import { studentTheme as t } from '@/components/student/theme';
import { getAssignments } from '@/services/studentPortal';
import type { Assignment, AssignmentStatus } from '@/types/studentPortal';

type Filter = 'all' | AssignmentStatus;

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'الكل' },
  { key: 'new', label: 'جديد' },
  { key: 'submitted', label: 'مُسلَّم' },
  { key: 'overdue', label: 'متأخر' },
  { key: 'graded', label: 'مصحح' },
];

function statusTone(
  status: AssignmentStatus,
): 'danger' | 'success' | 'warning' | 'info' | 'primary' | 'neutral' {
  if (status === 'overdue') return 'danger';
  if (status === 'graded') return 'success';
  if (status === 'submitted') return 'info';
  if (status === 'new') return 'warning';
  return 'neutral';
}

function buildMeta(a: Assignment) {
  const parts: string[] = [];
  if (a.subjectName) parts.push(a.subjectName);
  if (a.teacherName) parts.push(a.teacherName);
  const due = formatShortDate(a.dueAt);
  if (due) parts.push(`تسليم ${due}`);
  if (a.tasksCount > 0) parts.push(`${a.tasksCount} أسئلة`);
  else if ((a.attachmentsCount || 0) > 0) {
    parts.push(`${a.attachmentsCount} مرفق`);
  }
  return parts.join(' · ') || 'واجب دراسي';
}

export default function AssignmentsScreen() {
  const router = useRouter();
  const [list, setList] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setList(await getAssignments());
    } catch (err) {
      setList([]);
      setError(err instanceof Error ? err.message : 'تعذر تحميل الواجبات');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: list.length };
    for (const a of list) c[a.status] = (c[a.status] || 0) + 1;
    return c;
  }, [list]);

  const filtered = useMemo(
    () => (filter === 'all' ? list : list.filter((a) => a.status === filter)),
    [list, filter],
  );

  const pending = list.filter(
    (a) => a.status === 'new' || a.status === 'overdue' || a.status === 'in_progress',
  ).length;

  return (
    <StudentScreen title="الواجبات" subtitle="حل وسلّم درجاتك" onBack hero>
      <FadeIn>
        <View style={styles.summary}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{list.length}</Text>
            <Text style={styles.summaryLabel}>إجمالي</Text>
          </View>
          <View style={styles.summaryDiv} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: t.warning }]}>
              {pending}
            </Text>
            <Text style={styles.summaryLabel}>بانتظارك</Text>
          </View>
          <View style={styles.summaryDiv} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: t.success }]}>
              {counts.graded || 0}
            </Text>
            <Text style={styles.summaryLabel}>مصحح</Text>
          </View>
        </View>
      </FadeIn>

      <View style={styles.chips}>
        {FILTERS.map((f) => {
          const active = filter === f.key;
          const n = f.key === 'all' ? counts.all : counts[f.key] || 0;
          return (
            <Pressable
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={[styles.chip, active && styles.chipOn]}
            >
              <Text style={[styles.chipText, active && styles.chipTextOn]}>
                {f.label}
              </Text>
              {n > 0 ? (
                <View style={[styles.chipBadge, active && styles.chipBadgeOn]}>
                  <Text
                    style={[styles.chipCount, active && styles.chipCountOn]}
                  >
                    {n}
                  </Text>
                </View>
              ) : null}
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
          onAction={load}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="FileText"
          title="لا واجبات هنا"
          description={
            filter === 'all'
              ? 'عندما ينشر المدرس واجباً سيظهر في هذه القائمة'
              : 'جرّب تصنيفاً آخر'
          }
        />
      ) : (
        filtered.map((a, i) => (
          <FadeIn key={a.id} delay={i * 40}>
            <Pressable
              style={({ pressed }) => [
                styles.card,
                pressed && { opacity: 0.94, transform: [{ scale: 0.99 }] },
              ]}
              onPress={() =>
                router.push(`/(student)/assignment/${a.id}` as never)
              }
            >
              <View
                style={[
                  styles.accent,
                  {
                    backgroundColor:
                      a.status === 'overdue'
                        ? t.danger
                        : a.status === 'graded'
                          ? t.success
                          : a.status === 'submitted'
                            ? t.sky
                            : t.warning,
                  },
                ]}
              />
              <View style={styles.cardBody}>
                <View style={styles.cardTop}>
                  <IconBadge
                    name={
                      a.status === 'graded'
                        ? 'Trophy'
                        : a.tasksCount > 0
                          ? 'ClipboardList'
                          : 'FileText'
                    }
                    color={
                      a.status === 'overdue'
                        ? t.danger
                        : a.status === 'graded'
                          ? t.success
                          : t.brand
                    }
                    size={44}
                  />
                  <View style={styles.cardText}>
                    <Text style={styles.title} numberOfLines={2}>
                      {a.title}
                    </Text>
                    <Text style={styles.meta} numberOfLines={2}>
                      {buildMeta(a)}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardFoot}>
                  <Badge
                    label={
                      a.status === 'graded' && a.score != null
                        ? `${a.score}/${a.maxScore}`
                        : assignmentStatusLabel[a.status] || a.status
                    }
                    tone={statusTone(a.status)}
                  />
                  <View style={styles.openRow}>
                    <Text style={styles.openText}>
                      {a.status === 'graded' || a.status === 'submitted'
                        ? 'عرض'
                        : 'ابدأ الحل'}
                    </Text>
                    <Icon name="ChevronLeft" size={16} color={t.brand} />
                  </View>
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
    flexDirection: rowRtl,
    backgroundColor: t.card,
    borderRadius: t.radius.lg,
    borderWidth: 1,
    borderColor: t.line,
    paddingVertical: 14,
    ...t.shadow.card,
  },
  summaryItem: { flex: 1, alignItems: 'center', gap: 2 },
  summaryDiv: { width: 1, backgroundColor: t.line },
  summaryValue: {
    fontFamily: t.fonts.bold,
    fontSize: 20,
    color: t.ink,
    fontVariant: ['tabular-nums'],
  },
  summaryLabel: {
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
    flexDirection: rowRtl,
    alignItems: 'center',
    gap: 6,
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
  chipBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    backgroundColor: t.cardMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipBadgeOn: { backgroundColor: t.brand },
  chipCount: {
    fontFamily: t.fonts.bold,
    fontSize: 10,
    color: t.inkMute,
    fontVariant: ['tabular-nums'],
  },
  chipCountOn: { color: '#fff' },
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
  cardBody: {
    flex: 1,
    padding: t.space.md,
    gap: 12,
  },
  cardTop: {
    flexDirection: rowRtl,
    alignItems: 'flex-start',
    gap: 12,
  },
  cardText: { flex: 1, gap: 4, minWidth: 0 },
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
  cardFoot: {
    flexDirection: rowRtl,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  openRow: {
    flexDirection: rowRtl,
    alignItems: 'center',
    gap: 2,
  },
  openText: {
    fontFamily: t.fonts.semiBold,
    fontSize: 13,
    color: t.brand,
  },
});
