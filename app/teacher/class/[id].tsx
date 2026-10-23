import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Icon } from '@/components/ui';
import {
  DAY_AR,
  EmptyBlock,
  FadeIn,
  LoadingBlock,
  SoftCard,
  TeacherScreen,
  rowRtl,
} from '@/components/teacher/ui';
import { teacherTheme as t } from '@/components/teacher/theme';
import { getTeacherClassDetail } from '@/api/teacherPortal';

export default function TeacherClassDetailScreen() {
  const { id, subject_id } = useLocalSearchParams<{ id: string; subject_id?: string }>();
  const [data, setData] = useState<Awaited<ReturnType<typeof getTeacherClassDetail>> | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      setData(
        await getTeacherClassDetail(
          Number(id),
          subject_id ? Number(subject_id) : undefined,
        ),
      );
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [id, subject_id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <TeacherScreen
      title={data ? `${data.classroom.grade_name} · ${data.classroom.name}` : 'تفاصيل الصف'}
      subtitle={data?.subjects.map((s) => s.name).join(' · ')}
      onBack
      hero
    >
      {loading ? (
        <LoadingBlock />
      ) : !data ? (
        <EmptyBlock title="تعذر تحميل الصف" />
      ) : (
        <>
          <FadeIn>
            <Text style={styles.section}>الحصص الأسبوعية</Text>
            {data.slots.length === 0 ? (
              <EmptyBlock title="لا توجد حصص" />
            ) : (
              data.slots.map((s, i) => (
                <SoftCard key={`${s.day_of_week}-${s.period_number}-${i}`} style={styles.slot}>
                  <View style={[styles.row, { flexDirection: rowRtl as 'row' }]}>
                    <Icon name="Clock" size={16} color={t.brand} />
                    <Text style={styles.slotText}>
                      {DAY_AR[s.day_of_week] || s.day_of_week} · الحصة {s.period_number} ·{' '}
                      {String(s.start_time).slice(0, 5)}–{String(s.end_time).slice(0, 5)}
                    </Text>
                    <Text style={styles.subject}>{s.subject_name}</Text>
                  </View>
                </SoftCard>
              ))
            )}
          </FadeIn>

          <FadeIn delay={80}>
            <Text style={styles.section}>الطلاب ({data.students.length})</Text>
            {data.students.length === 0 ? (
              <EmptyBlock icon="Users" title="لا يوجد طلاب في هذا الصف" />
            ) : (
              data.students.map((st) => (
                <SoftCard key={st.id} style={styles.student}>
                  <View style={[styles.row, { flexDirection: rowRtl as 'row' }]}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{st.name.slice(0, 1)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.name}>{st.name}</Text>
                      <Text style={styles.meta}>
                        {st.seat_number ? `مقعد ${st.seat_number}` : 'بدون مقعد'} ·{' '}
                        {st.status || 'active'}
                      </Text>
                    </View>
                  </View>
                </SoftCard>
              ))
            )}
          </FadeIn>
        </>
      )}
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  section: {
    fontFamily: t.fonts.bold,
    fontSize: 16,
    color: t.ink,
    writingDirection: 'rtl',
    marginTop: 8,
    marginBottom: 4,
  },
  slot: { paddingVertical: 12 },
  student: { paddingVertical: 12 },
  row: { alignItems: 'center', gap: 10 },
  slotText: {
    flex: 1,
    fontFamily: t.fonts.medium,
    fontSize: 13,
    color: t.ink,
    writingDirection: 'rtl',
    fontVariant: ['tabular-nums'],
  },
  subject: {
    fontFamily: t.fonts.semiBold,
    fontSize: 12,
    color: t.brand,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: t.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: t.fonts.bold,
    color: t.brand,
    fontSize: 16,
  },
  name: {
    fontFamily: t.fonts.semiBold,
    fontSize: 14,
    color: t.ink,
    writingDirection: 'rtl',
  },
  meta: {
    fontFamily: t.fonts.regular,
    fontSize: 12,
    color: t.inkSoft,
    writingDirection: 'rtl',
  },
});
