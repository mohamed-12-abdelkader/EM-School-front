import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { EmptyState, Icon } from '@/components/ui';
import {
  FadeIn,
  IconBadge,
  LoadingBlock,
  StudentPageShell,
  assignmentStatusLabel,
  formatShortDate,
  rowRtl,
} from '@/components/student/ui';
import { studentTheme as t } from '@/components/student/theme';
import { getAssignments } from '@/services/studentPortal';
import type { Assignment, AssignmentStatus } from '@/types/studentPortal';

type Filter = 'all' | AssignmentStatus;

const FILTERS: { key: Filter; label: string; icon: string }[] = [
  { key: 'all', label: 'الكل', icon: 'Layers' },
  { key: 'new', label: 'جديد', icon: 'Sparkles' },
  { key: 'submitted', label: 'مُسلَّم', icon: 'Send' },
  { key: 'overdue', label: 'متأخر', icon: 'AlertCircle' },
  { key: 'graded', label: 'مصحح', icon: 'Trophy' },
];

function statusColor(status: AssignmentStatus) {
  if (status === 'overdue') return t.danger;
  if (status === 'graded') return t.success;
  if (status === 'submitted') return t.sky;
  if (status === 'new' || status === 'in_progress') return t.warning;
  return t.inkMute;
}

function statusSoft(status: AssignmentStatus) {
  if (status === 'overdue') return t.dangerSoft;
  if (status === 'graded') return t.successSoft;
  if (status === 'submitted') return t.skySoft;
  return t.warningSoft;
}

function ctaLabel(status: AssignmentStatus) {
  if (status === 'graded') return 'عرض التصحيح';
  if (status === 'submitted') return 'عرض التسليم';
  if (status === 'overdue') return 'سلّم الآن';
  return 'ابدأ الحل';
}

function buildMeta(a: Assignment) {
  const parts: string[] = [];
  if (a.subjectName) parts.push(a.subjectName);
  if (a.teacherName) parts.push(`أ/${a.teacherName}`);
  return parts.join(' · ') || 'واجب دراسي';
}

export default function AssignmentsScreen() {
  const router = useRouter();
  const [list, setList] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [error, setError] = useState('');

  const load = useCallback(async (soft = false) => {
    if (soft) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      setList(await getAssignments());
    } catch (err) {
      setList([]);
      setError(err instanceof Error ? err.message : 'تعذر تحميل الواجبات');
    } finally {
      setLoading(false);
      setRefreshing(false);
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
    (a) =>
      a.status === 'new' || a.status === 'overdue' || a.status === 'in_progress',
  ).length;
  const graded = counts.graded || 0;
  const submitted = counts.submitted || 0;

  return (
    <StudentPageShell
      title="الواجبات"
      subtitle={
        pending > 0
          ? `${pending} بانتظارك · سحّب للتحديث`
          : 'حل وسلّم قبل الموعد'
      }
      icon="ClipboardList"
      refreshing={refreshing}
      onRefresh={() => load(true)}
    >
      <FadeIn>
        <View style={styles.stats}>
          <View style={[styles.stat, styles.statPrimary]}>
            <Text style={styles.statValue}>{pending}</Text>
            <Text style={styles.statLabel}>بانتظارك</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: t.sky }]}>{submitted}</Text>
            <Text style={styles.statLabel}>مُسلَّم</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: t.success }]}>{graded}</Text>
            <Text style={styles.statLabel}>مصحح</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{list.length}</Text>
            <Text style={styles.statLabel}>الإجمالي</Text>
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
              <Icon
                name={f.icon}
                size={14}
                color={active ? t.brandDeep : t.inkMute}
              />
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
          onAction={() => load()}
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
        <View style={styles.list}>
          {filtered.map((a, i) => {
            const color = statusColor(a.status);
            const soft = statusSoft(a.status);
            const due = formatShortDate(a.dueAt);
            return (
              <FadeIn key={a.id} delay={i * 40}>
                <Pressable
                  style={({ pressed }) => [
                    styles.card,
                    pressed && { opacity: 0.94, transform: [{ scale: 0.995 }] },
                  ]}
                  onPress={() =>
                    router.push(`/(student)/assignment/${a.id}` as never)
                  }
                >
                  <View style={[styles.accent, { backgroundColor: color }]} />
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
                        color={color}
                        size={48}
                      />
                      <View style={styles.cardText}>
                        <View style={styles.titleRow}>
                          <Text style={styles.title} numberOfLines={2}>
                            {a.title}
                          </Text>
                          <View
                            style={[styles.statusPill, { backgroundColor: soft }]}
                          >
                            <Text style={[styles.statusText, { color }]}>
                              {a.status === 'graded' && a.score != null
                                ? `${a.score}/${a.maxScore}`
                                : assignmentStatusLabel[a.status] || a.status}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.meta} numberOfLines={1}>
                          {buildMeta(a)}
                        </Text>
                        <View style={styles.metaRow}>
                          {due ? (
                            <View style={styles.metaChip}>
                              <Icon name="CalendarDays" size={12} color={t.inkMute} />
                              <Text style={styles.metaChipText}>تسليم {due}</Text>
                            </View>
                          ) : null}
                          {a.tasksCount > 0 ? (
                            <View style={styles.metaChip}>
                              <Icon name="ClipboardCheck" size={12} color={t.inkMute} />
                              <Text style={styles.metaChipText}>
                                {a.tasksCount} أسئلة
                              </Text>
                            </View>
                          ) : (a.attachmentsCount || 0) > 0 ? (
                            <View style={styles.metaChip}>
                              <Icon name="FileText" size={12} color={t.inkMute} />
                              <Text style={styles.metaChipText}>
                                {a.attachmentsCount} مرفق
                              </Text>
                            </View>
                          ) : null}
                        </View>
                      </View>
                    </View>

                    <View style={styles.cardFoot}>
                      <Text style={[styles.cta, { color }]}>
                        {ctaLabel(a.status)}
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
    paddingHorizontal: 8,
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
    flexDirection: rowRtl,
    alignItems: 'center',
    gap: 6,
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
  cardText: { flex: 1, gap: 6, minWidth: 0 },
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
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: t.radius.full,
  },
  statusText: {
    fontFamily: t.fonts.semiBold,
    fontSize: 11,
  },
  meta: {
    fontFamily: t.fonts.regular,
    fontSize: 12,
    color: t.inkMute,
    textAlign: 'right',
  },
  metaRow: {
    flexDirection: rowRtl,
    flexWrap: 'wrap',
    gap: 6,
  },
  metaChip: {
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
  cardFoot: {
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
