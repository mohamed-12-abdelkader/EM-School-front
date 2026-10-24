import { useCallback, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChildSwitcher } from '@/components/parent/ChildSwitcher';
import { useParentChild } from '@/components/parent/ParentChildContext';
import { parentTheme as t } from '@/components/parent/theme';
import {
  EmptyHint,
  FadeIn,
  LoadingBlock,
  RateRing,
  StatCard,
  StatusPill,
  formatShortDate,
  rowRtl,
} from '@/components/parent/ui';
import { getParentChildAttendance } from '@/services/parentPortal';
import type { AttendanceRecord, AttendanceSummary } from '@/types/parentPortal';

export default function ParentAttendanceTab() {
  const { width } = useWindowDimensions();
  const wide = width >= 720;
  const { children, selectedChild, selectedChildId, setSelectedChildId } =
    useParentChild();

  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(
    async (soft = false) => {
      if (!selectedChildId) {
        setSummary(null);
        setRecords([]);
        setLoading(false);
        return;
      }
      if (soft) setRefreshing(true);
      else setLoading(true);
      setError('');
      try {
        const data = await getParentChildAttendance(selectedChildId);
        setSummary(data.summary);
        setRecords(data.records);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'تعذر تحميل الحضور');
        if (!soft) {
          setSummary(null);
          setRecords([]);
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
          <Text style={styles.title}>الحضور والغياب</Text>
          <Text style={styles.sub}>
            {selectedChild
              ? `سجل حضور ${selectedChild.name}`
              : 'اختر ابناً لعرض الحضور'}
          </Text>

          <ChildSwitcher
            children={children}
            selectedId={selectedChildId}
            onSelect={setSelectedChildId}
          />

          {loading ? (
            <LoadingBlock label="جارٍ تحميل الحضور..." />
          ) : error ? (
            <EmptyHint title="تعذر التحميل" body={error} />
          ) : !selectedChildId ? (
            <EmptyHint title="لا يوجد أبناء" body="اربط حساب ولي الأمر بطالب من لوحة الإدارة." />
          ) : (
            <>
              <View style={[styles.top, wide && { flexDirection: rowRtl as 'row' }]}>
                <View style={styles.ringCard}>
                  <RateRing percent={summary?.attendanceRate ?? 0} label="نسبة الحضور" />
                </View>
                <View style={styles.grid}>
                  <StatCard
                    label="حاضر"
                    value={String(summary?.presentDays ?? 0)}
                    icon="CheckCircle2"
                    tone="success"
                  />
                  <StatCard
                    label="غائب"
                    value={String(summary?.absentDays ?? 0)}
                    icon="XCircle"
                    tone="danger"
                  />
                  <StatCard
                    label="متأخر"
                    value={String(summary?.lateDays ?? 0)}
                    icon="Clock"
                    tone="warning"
                  />
                  <StatCard
                    label="بعذر"
                    value={String(summary?.excusedDays ?? 0)}
                    icon="FileCheck"
                    tone="brand"
                  />
                </View>
              </View>

              <Text style={styles.section}>السجل التفصيلي</Text>
              {records.length === 0 ? (
                <EmptyHint
                  title="لا سجلات في هذه الفترة"
                  body="تظهر أيام الحضور والغياب بعد تسجيلها من المدرسة أو المعلّم."
                />
              ) : (
                <View style={styles.list}>
                  {records.map((r, i) => (
                    <FadeIn key={r.id} delay={Math.min(i, 12) * 30} style={styles.row}>
                      <View style={[styles.rowInner, { flexDirection: rowRtl as 'row' }]}>
                        <StatusPill status={r.status} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.rowTitle}>{formatShortDate(r.date)}</Text>
                          <Text style={styles.rowMeta}>
                            {[
                              r.checkInTime
                                ? `دخول ${String(r.checkInTime).slice(0, 5)}`
                                : null,
                              r.checkInMethod,
                              r.notes,
                            ]
                              .filter(Boolean)
                              .join(' · ') || '—'}
                          </Text>
                        </View>
                      </View>
                    </FadeIn>
                  ))}
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
  },
  top: { gap: 12 },
  ringCard: {
    backgroundColor: t.card,
    borderRadius: t.radius.xl,
    borderWidth: 1,
    borderColor: t.line,
    padding: 18,
    alignItems: 'center',
    ...t.shadow.card,
  },
  grid: {
    flex: 1,
    flexDirection: rowRtl as 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  section: {
    fontFamily: t.fonts.bold,
    fontSize: 16,
    color: t.ink,
    textAlign: 'right',
    marginTop: 8,
  },
  list: { gap: 8 },
  row: {
    backgroundColor: t.card,
    borderRadius: t.radius.lg,
    borderWidth: 1,
    borderColor: t.line,
    padding: 12,
    ...t.shadow.card,
  },
  rowInner: { alignItems: 'center', gap: 12 },
  rowTitle: {
    fontFamily: t.fonts.semiBold,
    fontSize: 14,
    color: t.ink,
    textAlign: 'right',
  },
  rowMeta: {
    fontFamily: t.fonts.regular,
    fontSize: 12,
    color: t.inkMute,
    textAlign: 'right',
    marginTop: 2,
  },
});
