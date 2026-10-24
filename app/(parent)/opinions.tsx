import { useCallback, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Icon } from '@/components/ui';
import { ChildSwitcher } from '@/components/parent/ChildSwitcher';
import { useParentChild } from '@/components/parent/ParentChildContext';
import { parentTheme as t } from '@/components/parent/theme';
import {
  EmptyHint,
  FadeIn,
  LoadingBlock,
  formatShortDate,
  rowRtl,
} from '@/components/parent/ui';
import { StudentPageShell } from '@/components/student/ui';
import { getParentChildOpinions } from '@/services/parentPortal';
import type { TeacherOpinion } from '@/types/parentPortal';
import { displayTitle } from '@/utils/displayTitle';

export default function ParentOpinionsScreen() {
  const { width } = useWindowDimensions();
  const wide = width >= 720;
  const { children, selectedChild, selectedChildId, setSelectedChildId } =
    useParentChild();

  const [opinions, setOpinions] = useState<TeacherOpinion[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(
    async (soft = false) => {
      if (!selectedChildId) {
        setOpinions([]);
        setLoading(false);
        return;
      }
      if (soft) setRefreshing(true);
      else setLoading(true);
      setError('');
      try {
        const data = await getParentChildOpinions(selectedChildId);
        setOpinions(data.opinions);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'تعذر تحميل الآراء');
        if (!soft) setOpinions([]);
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

  return (
    <StudentPageShell
      title="آراء المعلّمين"
      subtitle={
        selectedChild
          ? `ملاحظات مكتوبة عن ${selectedChild.name}`
          : 'ملاحظات المعلّمين على الواجبات'
      }
      icon="MessageSquareQuote"
      refreshing={refreshing}
      onRefresh={() => load(true)}
    >
      <View style={[styles.wrap, wide && { maxWidth: 880 }]}>
        <ChildSwitcher
          children={children}
          selectedId={selectedChildId}
          onSelect={setSelectedChildId}
        />

        {loading ? (
          <LoadingBlock label="جارٍ تحميل الآراء..." />
        ) : error ? (
          <EmptyHint title="تعذر التحميل" body={error} />
        ) : opinions.length === 0 ? (
          <EmptyHint
            title="لا آراء بعد"
            body="عندما يكتب المعلّم رأياً أو تقريراً عن ابنك من لوحة المعلّم سيظهر هنا."
          />
        ) : (
          <View style={styles.list}>
            {opinions.map((o, i) => (
              <FadeIn key={o.id} delay={Math.min(i, 10) * 40} style={styles.card}>
                <View style={[styles.head, { flexDirection: rowRtl as 'row' }]}>
                  <View style={styles.icon}>
                    <Icon name="MessageSquareQuote" size={18} color={t.guardian} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.teacher}>{o.teacherName}</Text>
                    <Text style={styles.meta}>
                      {o.subjectName}
                      {o.gradedAt ? ` · ${formatShortDate(o.gradedAt)}` : ''}
                    </Text>
                  </View>
                  {o.grade != null && o.maxGrade != null ? (
                    <View style={styles.grade}>
                      <Text style={styles.gradeText}>
                        {o.grade}/{o.maxGrade}
                      </Text>
                    </View>
                  ) : null}
                </View>
                {o.title ? <Text style={styles.opinionTitle}>{o.title}</Text> : null}
                <Text style={styles.review}>{o.review}</Text>
                {o.taskTitle ? (
                  <Text style={styles.task}>
                    على الواجب: {displayTitle(o.taskTitle, 'واجب')}
                  </Text>
                ) : o.subjectName ? (
                  <Text style={styles.task}>المادة: {o.subjectName}</Text>
                ) : null}
              </FadeIn>
            ))}
          </View>
        )}
      </View>
    </StudentPageShell>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12, width: '100%', alignSelf: 'center' },
  list: { gap: 10 },
  card: {
    backgroundColor: t.card,
    borderRadius: t.radius.lg,
    borderWidth: 1,
    borderColor: t.line,
    padding: 14,
    gap: 10,
    ...t.shadow.card,
  },
  head: { alignItems: 'center', gap: 10 },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: t.guardianSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teacher: {
    fontFamily: t.fonts.semiBold,
    fontSize: 15,
    color: t.ink,
    textAlign: 'right',
  },
  meta: {
    fontFamily: t.fonts.regular,
    fontSize: 12,
    color: t.inkMute,
    textAlign: 'right',
    marginTop: 2,
  },
  grade: {
    backgroundColor: t.brandSoft,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  gradeText: {
    fontFamily: t.fonts.bold,
    fontSize: 13,
    color: t.brand,
    fontVariant: ['tabular-nums'],
  },
  opinionTitle: {
    fontFamily: t.fonts.semiBold,
    fontSize: 14,
    color: t.ink,
    textAlign: 'right',
  },
  review: {
    fontFamily: t.fonts.regular,
    fontSize: 14,
    color: t.inkSoft,
    textAlign: 'right',
    lineHeight: 22,
  },
  task: {
    fontFamily: t.fonts.medium,
    fontSize: 12,
    color: t.inkMute,
    textAlign: 'right',
  },
});
