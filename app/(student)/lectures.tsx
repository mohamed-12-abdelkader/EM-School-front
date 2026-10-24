import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { EmptyState, Icon } from '@/components/ui';
import {
  FadeIn,
  IconBadge,
  LoadingBlock,
  StudentPageShell,
  formatShortDate,
  lectureStatusLabel,
  rowRtl,
} from '@/components/student/ui';
import { studentTheme as t } from '@/components/student/theme';
import {
  getLectures,
  getSubject,
  getTeacher,
  subjects,
} from '@/services/studentPortal';
import type { Lecture } from '@/types/studentPortal';

type StatusFilter = 'all' | 'upcoming' | 'recorded' | 'completed' | 'live';

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'الكل' },
  { key: 'upcoming', label: 'قادمة' },
  { key: 'recorded', label: 'مسجلة' },
  { key: 'completed', label: 'منتهية' },
];

function statusColor(status: Lecture['status'], completed: boolean) {
  if (completed || status === 'completed') return t.success;
  if (status === 'live') return t.danger;
  if (status === 'recorded') return t.sky;
  return t.brand;
}

export default function LecturesScreen() {
  const router = useRouter();
  const [list, setList] = useState<Lecture[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(
    async (soft = false) => {
      if (soft) setRefreshing(true);
      else setLoading(true);
      setError('');
      try {
        const data = await getLectures({
          search,
          status,
          subjectId: subjectId ?? undefined,
        });
        setList(data);
      } catch (err) {
        setList([]);
        setError(err instanceof Error ? err.message : 'تعذر تحميل المحاضرات');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [search, status, subjectId],
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const upcoming = useMemo(
    () => list.filter((l) => l.status === 'upcoming' || l.status === 'live').length,
    [list],
  );

  return (
    <StudentPageShell
      title="المحاضرات"
      subtitle={
        upcoming > 0 ? `${upcoming} قادمة أو مباشرة` : 'شاهد وتابع تقدّمك'
      }
      icon="Presentation"
      refreshing={refreshing}
      onRefresh={() => load(true)}
    >
      <View style={styles.searchBox}>
        <Icon name="Search" size={18} color={t.inkMute} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="بحث في المحاضرات..."
          placeholderTextColor={t.inkMute}
          style={styles.searchInput}
          textAlign="right"
        />
      </View>

      <View style={styles.chips}>
        {STATUS_FILTERS.map((f) => {
          const active = status === f.key;
          return (
            <Pressable
              key={f.key}
              onPress={() => setStatus(f.key)}
              style={[styles.chip, active && styles.chipOn]}
            >
              <Text style={[styles.chipText, active && styles.chipTextOn]}>
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.chips}>
        <Pressable
          onPress={() => setSubjectId(null)}
          style={[styles.chip, !subjectId && styles.chipOn]}
        >
          <Text style={[styles.chipText, !subjectId && styles.chipTextOn]}>
            كل المواد
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
          icon="Presentation"
          title="لا توجد محاضرات"
          description="جرّب بحثاً أو تصنيفاً آخر"
        />
      ) : (
        <View style={styles.list}>
          {list.map((l, i) => {
            const sub = getSubject(l.subjectId);
            const teacher = getTeacher(l.teacherId);
            const color = statusColor(l.status, l.completed);
            const badgeLabel =
              l.watchProgress > 0 && l.watchProgress < 100
                ? `${l.watchProgress}%`
                : lectureStatusLabel[l.status];
            return (
              <FadeIn key={l.id} delay={i * 35}>
                <Pressable
                  style={({ pressed }) => [
                    styles.card,
                    pressed && { opacity: 0.94 },
                  ]}
                  onPress={() =>
                    router.push(`/(student)/lecture/${l.id}` as never)
                  }
                >
                  <View style={[styles.accent, { backgroundColor: color }]} />
                  <View style={styles.body}>
                    <View style={styles.top}>
                      <IconBadge name="Presentation" color={color} size={44} />
                      <View style={styles.textCol}>
                        <View style={styles.titleRow}>
                          <Text style={styles.title} numberOfLines={2}>
                            {l.title}
                          </Text>
                          <View
                            style={[
                              styles.pill,
                              {
                                backgroundColor: l.completed
                                  ? t.successSoft
                                  : t.brandSoft,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.pillText,
                                {
                                  color: l.completed ? t.success : t.brandDeep,
                                },
                              ]}
                            >
                              {badgeLabel}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.meta} numberOfLines={2}>
                          {[
                            sub?.name,
                            teacher?.name ? `أ/${teacher.name}` : null,
                            formatShortDate(l.date),
                            `${l.durationMin} د`,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.foot}>
                      <Text style={[styles.cta, { color }]}>فتح المحاضرة</Text>
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
  searchBox: {
    flexDirection: rowRtl,
    alignItems: 'center',
    gap: 10,
    backgroundColor: t.card,
    borderRadius: t.radius.lg,
    borderWidth: 1,
    borderColor: t.line,
    paddingHorizontal: 14,
    paddingVertical: 12,
    ...t.shadow.card,
  },
  searchInput: {
    flex: 1,
    fontFamily: t.fonts.regular,
    fontSize: 14,
    color: t.ink,
    padding: 0,
    writingDirection: 'rtl',
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
  body: { flex: 1, padding: t.space.md, gap: 10 },
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
