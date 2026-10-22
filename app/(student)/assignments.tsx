import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { Badge, EmptyState } from '@/components/ui';
import { SegmentControl } from '@/components/admin';
import {
  LoadingBlock,
  ListRow,
  StudentScreen,
  assignmentStatusLabel,
  formatShortDate,
} from '@/components/student/ui';
import { getAssignments, getSubject, getTeacher } from '@/services/studentPortal';
import type { Assignment } from '@/types/studentPortal';

type Filter = 'all' | 'new' | 'in_progress' | 'submitted' | 'graded' | 'overdue';

export default function AssignmentsScreen() {
  const router = useRouter();
  const [list, setList] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        setLoading(true);
        const data = await getAssignments();
        if (alive) {
          setList(data);
          setLoading(false);
        }
      })();
      return () => {
        alive = false;
      };
    }, []),
  );

  const filtered = useMemo(
    () => (filter === 'all' ? list : list.filter((a) => a.status === filter)),
    [list, filter],
  );

  return (
    <StudentScreen title="الواجبات" onBack hero>
      <SegmentControl
        value={filter}
        options={[
          { key: 'all', label: 'الكل' },
          { key: 'new', label: 'جديد' },
          { key: 'in_progress', label: 'جارٍ' },
          { key: 'overdue', label: 'متأخر' },
          { key: 'graded', label: 'مصحح' },
        ]}
        onChange={setFilter}
      />
      {loading ? (
        <LoadingBlock />
      ) : filtered.length === 0 ? (
        <EmptyState icon="FileText" title="لا توجد واجبات في هذا التصنيف" />
      ) : (
        filtered.map((a) => {
          const sub = getSubject(a.subjectId);
          const teacher = getTeacher(a.teacherId);
          return (
            <ListRow
              key={a.id}
              title={a.title}
              meta={`${sub?.name} · ${teacher?.name} · تسليم ${formatShortDate(a.dueAt)} · ${a.tasksCount} مهام`}
              onPress={() => router.push(`/(student)/assignment/${a.id}` as never)}
              right={
                <Badge
                  label={
                    a.status === 'graded' && a.score != null
                      ? `${a.score}/${a.maxScore}`
                      : assignmentStatusLabel[a.status]
                  }
                  tone={
                    a.status === 'overdue'
                      ? 'danger'
                      : a.status === 'graded'
                        ? 'success'
                        : 'warning'
                  }
                />
              }
            />
          );
        })
      )}
    </StudentScreen>
  );
}
