import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { Badge, EmptyState } from '@/components/ui';
import { ChipSelect } from '@/components/admin';
import {
  LoadingBlock,
  ListRow,
  StudentScreen,
} from '@/components/student/ui';
import { getExams, getSubject, subjects } from '@/services/studentPortal';
import type { Exam } from '@/types/studentPortal';

export default function ExamsScreen() {
  const router = useRouter();
  const [list, setList] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [subjectId, setSubjectId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        setLoading(true);
        const data = await getExams(subjectId ?? undefined);
        if (alive) {
          setList(data);
          setLoading(false);
        }
      })();
      return () => {
        alive = false;
      };
    }, [subjectId]),
  );

  return (
    <StudentScreen title="الامتحانات وبنك الأسئلة" onBack hero>
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
        <EmptyState icon="ClipboardList" title="لا توجد امتحانات" />
      ) : (
        list.map((e) => {
          const sub = getSubject(e.subjectId);
          return (
            <ListRow
              key={e.id}
              title={e.title}
              meta={`${sub?.name} · ${e.unit || ''} · ${e.questionIds.length} أسئلة · ${e.durationMin} د`}
              onPress={() => router.push(`/(student)/exam/${e.id}` as never)}
              right={
                <Badge
                  label={e.difficulty === 'hard' ? 'صعب' : e.difficulty === 'medium' ? 'متوسط' : 'سهل'}
                  tone={e.difficulty === 'hard' ? 'danger' : 'info'}
                />
              }
            />
          );
        })
      )}
    </StudentScreen>
  );
}
