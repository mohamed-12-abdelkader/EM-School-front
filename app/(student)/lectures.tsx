import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Badge, EmptyState, Input } from '@/components/ui';
import { ChipSelect, SegmentControl } from '@/components/admin';
import {
  LoadingBlock,
  ListRow,
  StudentScreen,
  formatShortDate,
  lectureStatusLabel,
} from '@/components/student/ui';
import {
  getLectures,
  getSubject,
  getTeacher,
  subjects,
} from '@/services/studentPortal';
import type { Lecture } from '@/types/studentPortal';
import { spacing } from '@/theme/tokens';

type StatusFilter = 'all' | 'upcoming' | 'recorded' | 'completed' | 'live';

export default function LecturesScreen() {
  const router = useRouter();
  const [list, setList] = useState<Lecture[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [subjectId, setSubjectId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getLectures({
      search,
      status,
      subjectId: subjectId ?? undefined,
    });
    setList(data);
    setLoading(false);
  }, [search, status, subjectId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <StudentScreen title="المحاضرات" onBack hero>
      <Input
        value={search}
        onChangeText={setSearch}
        placeholder="بحث في المحاضرات..."
        icon="Search"
      />
      <SegmentControl
        value={status}
        options={[
          { key: 'all', label: 'الكل' },
          { key: 'upcoming', label: 'قادمة' },
          { key: 'recorded', label: 'مسجلة' },
          { key: 'completed', label: 'منتهية' },
        ]}
        onChange={setStatus}
      />
      <ChipSelect
        options={[
          { id: 'all', label: 'كل المواد' },
          ...subjects.map((s) => ({ id: s.id, label: s.name })),
        ]}
        value={subjectId ?? 'all'}
        onChange={(next) =>
          setSubjectId(typeof next === 'string' && next !== 'all' ? next : null)
        }
      />

      {loading ? (
        <LoadingBlock />
      ) : list.length === 0 ? (
        <EmptyState icon="Presentation" title="لا توجد محاضرات" />
      ) : (
        <View style={styles.list}>
          {list.map((l) => {
            const sub = getSubject(l.subjectId);
            const teacher = getTeacher(l.teacherId);
            return (
              <ListRow
                key={l.id}
                title={l.title}
                meta={`${sub?.name} · ${teacher?.name} · ${formatShortDate(l.date)} · ${l.durationMin} د`}
                onPress={() => router.push(`/(student)/lecture/${l.id}` as never)}
                right={
                  <Badge
                    label={
                      l.watchProgress > 0 && l.watchProgress < 100
                        ? `${l.watchProgress}%`
                        : lectureStatusLabel[l.status]
                    }
                    tone={l.completed ? 'success' : 'info'}
                  />
                }
              />
            );
          })}
        </View>
      )}
    </StudentScreen>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.xs },
});
