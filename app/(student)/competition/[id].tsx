import { useCallback, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Badge, Button, EmptyState, useToast } from '@/components/ui';
import {
  LoadingBlock,
  StudentScreen,
  formatShortDate,
} from '@/components/student/ui';
import {
  getCompetitions,
  getSubject,
  joinCompetition,
} from '@/services/studentPortal';
import type { Competition } from '@/types/studentPortal';
import { colors, fonts, spacing } from '@/theme/tokens';

export default function CompetitionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();
  const [item, setItem] = useState<Competition | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const list = await getCompetitions();
    setItem(list.find((c) => c.id === id) ?? null);
    setLoading(false);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (loading) {
    return (
      <StudentScreen title="مسابقة" onBack>
        <LoadingBlock />
      </StudentScreen>
    );
  }

  if (!item) {
    return (
      <StudentScreen title="مسابقة" onBack>
        <EmptyState icon="Trophy" title="المسابقة غير موجودة" />
      </StudentScreen>
    );
  }

  const subject = item.subjectId ? getSubject(item.subjectId) : null;

  return (
    <StudentScreen title={item.title} onBack>
      <Badge
        label={
          item.status === 'open'
            ? 'متاحة'
            : item.status === 'joined'
              ? 'مشترك'
              : 'منتهية'
        }
        tone={item.status === 'open' ? 'success' : 'neutral'}
      />
      <Text style={styles.body}>{item.description}</Text>
      <Text style={styles.meta}>
        {subject ? `المادة: ${subject.name}` : 'مسابقة عامة'}
      </Text>
      <Text style={styles.meta}>المكافأة: {item.rewardPoints} نقطة</Text>
      <Text style={styles.meta}>المشاركون: {item.participants}</Text>
      <Text style={styles.meta}>ينتهي: {formatShortDate(item.endsAt)}</Text>
      <Text style={styles.note}>
        المشاركة تجريبية ومحلية — لا يوجد تسجيل حقيقي على الخادم.
      </Text>
      {item.status === 'open' ? (
        <Button
          label={busy ? '...' : 'انضم للمسابقة'}
          disabled={busy}
          onPress={async () => {
            setBusy(true);
            await joinCompetition(item.id);
            showToast('تم التسجيل محلياً', 'success');
            setBusy(false);
            load();
          }}
        />
      ) : null}
      {item.status === 'joined' && item.subjectId ? (
        <Button
          label="ابدأ تدريباً مرتبطاً"
          variant="outline"
          onPress={() => router.push('/(student)/exams' as never)}
        />
      ) : null}
    </StudentScreen>
  );
}

const styles = StyleSheet.create({
  body: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.text,
    textAlign: 'right',
    lineHeight: 22,
  },
  meta: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'right',
  },
  note: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginVertical: spacing.md,
    lineHeight: 18,
  },
});
