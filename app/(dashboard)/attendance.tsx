import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  AppModal,
  Avatar,
  Button,
  DateField,
  EmptyState,
  Input,
  PageHeader,
  useToast,
} from '@/components/ui';
import { FormError, FormLabel, SegmentControl } from '@/components/admin';
import { AttendanceQrScanner } from '@/components/attendance/AttendanceQrScanner';
import {
  cancelAttendance,
  checkInByQr,
  exportAttendanceCsv,
  getDailyAttendanceSummary,
  listAttendance,
  listUnrecordedStudents,
  markAttendanceBulk,
  markAttendanceManual,
} from '@/api/attendance';
import { listClassrooms } from '@/api/classrooms';
import { listGrades } from '@/api/grades';
import { listStudents } from '@/api/students';
import { ApiError } from '@/api/client';
import type { SchoolClassroom } from '@/types/classrooms';
import type { SchoolGrade } from '@/types/grades';
import type {
  AttendanceRecord,
  AttendanceStatus,
  DailyAttendanceSummary,
  UnrecordedStudent,
} from '@/types/attendance';
import type { SchoolStudent } from '@/types/students';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

const rtlProps =
  Platform.OS === 'web' ? ({ dir: 'rtl' } as Record<string, string>) : {};
const rowRtl = Platform.OS === 'web' ? 'row' : 'row-reverse';

type BoardMode = 'board' | 'qr' | 'unrecorded';

const STATUS_LABELS: Record<AttendanceStatus, string> = {
  present: 'حاضر',
  absent: 'غائب',
  late: 'متأخر',
  excused: 'بعذر',
};

const STATUS_OPTIONS: { key: AttendanceStatus; label: string }[] = [
  { key: 'present', label: 'حاضر' },
  { key: 'absent', label: 'غائب' },
  { key: 'late', label: 'متأخر' },
  { key: 'excused', label: 'بعذر' },
];

const MODE_OPTIONS: { key: BoardMode; label: string }[] = [
  { key: 'board', label: 'التسجيل' },
  { key: 'qr', label: 'QR' },
  { key: 'unrecorded', label: 'غير المسجلين' },
];

type RosterRow = {
  student_id: number;
  name: string;
  login_code: string;
  grade_name: string;
  classroom_name: string;
  attendance_id: number | null;
  saved_status: AttendanceStatus | null;
  draft_status: AttendanceStatus | null;
  absence_reason: string;
};

function todayISO() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Cairo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function statusToneColor(status: AttendanceStatus | null) {
  if (status === 'present') return colors.success;
  if (status === 'absent') return colors.danger;
  if (status === 'late') return colors.warning;
  if (status === 'excused') return colors.info;
  return colors.textMuted;
}

function StatChip({ label, value, tone }: { label: string; value: string | number; tone?: string }) {
  return (
    <View style={styles.statChip}>
      <Text style={[styles.statValue, tone ? { color: tone } : null]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function StudentAttendanceRow({
  row,
  onPick,
  onCancel,
}: {
  row: RosterRow;
  onPick: (status: AttendanceStatus) => void;
  onCancel?: () => void;
}) {
  const current = row.draft_status ?? row.saved_status;
  const dirty = row.draft_status != null && row.draft_status !== row.saved_status;

  return (
    <View style={styles.studentRow}>
      <View style={styles.studentMain}>
        <Avatar name={row.name} color={colors.primary} size={40} />
        <View style={styles.studentText}>
          <Text style={styles.studentName} numberOfLines={1}>
            {row.name}
          </Text>
          <Text style={styles.studentMeta} numberOfLines={1}>
            {row.login_code}
            {dirty ? ' · تعديل معلّق' : ''}
            {!current ? ' · غير مسجّل' : ''}
          </Text>
        </View>
        {row.attendance_id && onCancel ? (
          <Pressable onPress={onCancel} hitSlop={8}>
            <Text style={styles.cancelLink}>إلغاء</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.marks}>
        {STATUS_OPTIONS.map((opt) => {
          const on = current === opt.key;
          return (
            <Pressable
              key={opt.key}
              onPress={() => onPick(opt.key)}
              style={[
                styles.markBtn,
                on && {
                  backgroundColor: `${statusToneColor(opt.key)}22`,
                  borderColor: statusToneColor(opt.key),
                },
              ]}
            >
              <Text
                style={[
                  styles.markText,
                  on && { color: statusToneColor(opt.key), fontFamily: fonts.semiBold },
                ]}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function AttendancePage() {
  const { showToast } = useToast();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [date, setDate] = useState(todayISO());
  const [grades, setGrades] = useState<SchoolGrade[]>([]);
  const [classrooms, setClassrooms] = useState<SchoolClassroom[]>([]);
  const [gradeFilter, setGradeFilter] = useState<number | null>(null);
  const [classroomFilter, setClassroomFilter] = useState<number | null>(null);
  const [mode, setMode] = useState<BoardMode>('board');

  const [summary, setSummary] = useState<DailyAttendanceSummary | null>(null);
  const [roster, setRoster] = useState<RosterRow[]>([]);
  const [unrecorded, setUnrecorded] = useState<UnrecordedStudent[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [qrPayload, setQrPayload] = useState('');
  const [qrBusy, setQrBusy] = useState(false);
  const [qrError, setQrError] = useState('');
  const [showManualQr, setShowManualQr] = useState(false);

  const [reasonOpen, setReasonOpen] = useState(false);
  const [reasonTarget, setReasonTarget] = useState<RosterRow | null>(null);
  const [reasonStatus, setReasonStatus] = useState<AttendanceStatus>('absent');
  const [absenceReason, setAbsenceReason] = useState('');
  const [reasonError, setReasonError] = useState('');

  const [cancelTarget, setCancelTarget] = useState<RosterRow | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const dirtyCount = useMemo(
    () =>
      roster.filter(
        (r) => r.draft_status != null && r.draft_status !== r.saved_status,
      ).length,
    [roster],
  );

  const loadGrades = useCallback(async () => {
    try {
      const data = await listGrades({ limit: 200, skip: 0, is_active: true });
      setGrades([...data.grades].sort((a, b) => a.position - b.position));
    } catch {
      // non-blocking
    }
  }, []);

  const loadClassrooms = useCallback(async (gradeId: number | null) => {
    try {
      const data = await listClassrooms({
        grade_id: gradeId ?? undefined,
        limit: 200,
        skip: 0,
        is_active: true,
      });
      setClassrooms(data.classrooms);
    } catch {
      setClassrooms([]);
    }
  }, []);

  const buildRoster = (
    students: SchoolStudent[],
    records: AttendanceRecord[],
    missing: UnrecordedStudent[],
  ): RosterRow[] => {
    const map = new Map<number, RosterRow>();

    for (const s of students) {
      map.set(s.id, {
        student_id: s.id,
        name: s.name,
        login_code: s.login_code,
        grade_name: s.grade_name,
        classroom_name: s.classroom_name,
        attendance_id: null,
        saved_status: null,
        draft_status: null,
        absence_reason: '',
      });
    }

    for (const s of missing) {
      if (map.has(s.id)) continue;
      map.set(s.id, {
        student_id: s.id,
        name: s.name,
        login_code: s.login_code,
        grade_name: s.grade_name,
        classroom_name: s.classroom_name,
        attendance_id: null,
        saved_status: null,
        draft_status: null,
        absence_reason: '',
      });
    }

    for (const r of records) {
      const prev = map.get(r.student_id);
      map.set(r.student_id, {
        student_id: r.student_id,
        name: r.student_name || prev?.name || `#${r.student_id}`,
        login_code: prev?.login_code || '',
        grade_name: r.grade_name || prev?.grade_name || '',
        classroom_name: r.classroom_name || prev?.classroom_name || '',
        attendance_id: r.id,
        saved_status: r.status,
        draft_status: r.status,
        absence_reason: r.absence_reason || '',
      });
    }

    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  };

  const loadDay = useCallback(
    async (opts?: { soft?: boolean }) => {
      if (!opts?.soft) setLoading(true);
      try {
        const [summaryRes, recordsRes, unrecordedRes, studentsRes] = await Promise.all([
          getDailyAttendanceSummary({
            date,
            grade_id: gradeFilter ?? undefined,
            classroom_id: classroomFilter ?? undefined,
          }),
          classroomFilter
            ? listAttendance({
                date,
                grade_id: gradeFilter ?? undefined,
                classroom_id: classroomFilter,
                limit: 300,
                skip: 0,
              })
            : Promise.resolve({ records: [], total: 0, limit: 0, skip: 0 }),
          listUnrecordedStudents({
            date,
            grade_id: gradeFilter ?? undefined,
            classroom_id: classroomFilter ?? undefined,
          }),
          classroomFilter
            ? listStudents({
                classroom_id: classroomFilter,
                grade_id: gradeFilter ?? undefined,
                status: 'active',
                limit: 300,
                skip: 0,
              })
            : Promise.resolve({ students: [], total: 0, limit: 0, skip: 0, counts_by_classroom: [] }),
        ]);

        setSummary(summaryRes.summary);
        setUnrecorded(unrecordedRes.students);

        if (classroomFilter) {
          setRoster(
            buildRoster(
              studentsRes.students,
              recordsRes.records,
              unrecordedRes.students,
            ),
          );
        } else {
          setRoster([]);
        }
      } catch (err) {
        showToast(err instanceof ApiError ? err.message : 'تعذر تحميل الحضور', 'danger');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [date, gradeFilter, classroomFilter, showToast],
  );

  useEffect(() => {
    loadGrades();
  }, [loadGrades]);

  useEffect(() => {
    loadClassrooms(gradeFilter);
  }, [gradeFilter, loadClassrooms]);

  useEffect(() => {
    loadDay();
  }, [loadDay]);

  const pickStatus = (row: RosterRow, status: AttendanceStatus) => {
    if (status === 'absent' || status === 'excused') {
      setReasonTarget(row);
      setReasonStatus(status);
      setAbsenceReason(row.absence_reason || '');
      setReasonError('');
      setReasonOpen(true);
      return;
    }
    setRoster((prev) =>
      prev.map((r) =>
        r.student_id === row.student_id
          ? { ...r, draft_status: status, absence_reason: '' }
          : r,
      ),
    );
  };

  const confirmReason = () => {
    if (!reasonTarget) return;
    if (!absenceReason.trim() && reasonStatus === 'excused') {
      setReasonError('سبب العذر مطلوب');
      return;
    }
    setRoster((prev) =>
      prev.map((r) =>
        r.student_id === reasonTarget.student_id
          ? {
              ...r,
              draft_status: reasonStatus,
              absence_reason: absenceReason.trim(),
            }
          : r,
      ),
    );
    setReasonOpen(false);
    setReasonTarget(null);
  };

  const markAllPresent = () => {
    setRoster((prev) =>
      prev.map((r) => ({
        ...r,
        draft_status: 'present',
        absence_reason: '',
      })),
    );
  };

  const saveBulk = async () => {
    if (!classroomFilter) {
      showToast('اختر فصلاً أولاً', 'info');
      return;
    }
    const items = roster
      .filter((r) => r.draft_status != null && r.draft_status !== r.saved_status)
      .map((r) => ({
        student_id: r.student_id,
        status: r.draft_status!,
        absence_reason:
          r.draft_status === 'absent' || r.draft_status === 'excused'
            ? r.absence_reason || null
            : null,
      }));

    if (items.length === 0) {
      showToast('لا توجد تغييرات للحفظ', 'info');
      return;
    }

    setSaving(true);
    try {
      const res = await markAttendanceBulk({
        date,
        grade_id: gradeFilter ?? undefined,
        classroom_id: classroomFilter,
        items,
      });
      if (res.failed_count > 0) {
        showToast(
          `تم حفظ ${res.success_count} · فشل ${res.failed_count}`,
          'warning',
        );
      } else {
        showToast(`تم حفظ حضور ${res.success_count} طالب`, 'success');
      }
      await loadDay({ soft: true });
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'فشل حفظ الحضور', 'danger');
    } finally {
      setSaving(false);
    }
  };

  const onQrCheckIn = useCallback(
    async (raw?: string) => {
      const fromScanner = typeof raw === 'string';
      const payload = (raw ?? qrPayload).trim();
      if (!payload) {
        setQrError('امسح QR أو أدخل القيمة يدوياً');
        return;
      }
      setQrBusy(true);
      setQrError('');
      try {
        const res = await checkInByQr({ qr_payload: payload });
        if (res.already_recorded) {
          showToast(`${res.student.name} مسجّل حاضر مسبقاً`, 'info');
        } else {
          showToast(`تم تسجيل حضور ${res.student.name}`, 'success');
        }
        setQrPayload('');
        await loadDay({ soft: true });
      } catch (err) {
        const message =
          err instanceof ApiError ? err.message : 'فشل تسجيل QR';
        setQrError(message);
        showToast(message, 'danger');
        if (fromScanner) throw err;
      } finally {
        setQrBusy(false);
      }
    },
    [qrPayload, showToast, loadDay],
  );

  const quickMarkUnrecorded = async (student: UnrecordedStudent, status: AttendanceStatus) => {
    try {
      await markAttendanceManual({
        student_id: student.id,
        date,
        status,
      });
      showToast(`تم تسجيل ${student.name}: ${STATUS_LABELS[status]}`, 'success');
      await loadDay({ soft: true });
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'فشل التسجيل', 'danger');
    }
  };

  const onCancel = async () => {
    if (!cancelTarget?.attendance_id) return;
    setCancelling(true);
    try {
      await cancelAttendance(cancelTarget.attendance_id, cancelReason.trim() || undefined);
      showToast('تم إلغاء السجل', 'success');
      setCancelTarget(null);
      setCancelReason('');
      await loadDay({ soft: true });
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'فشل الإلغاء', 'danger');
    } finally {
      setCancelling(false);
    }
  };

  const onExport = async () => {
    try {
      const csv = await exportAttendanceCsv({
        date,
        grade_id: gradeFilter ?? undefined,
        classroom_id: classroomFilter ?? undefined,
      });
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `attendance-${date}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }
      showToast('تم تجهيز ملف CSV', 'success');
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'فشل التصدير', 'danger');
    }
  };

  const listHeader = (
    <View style={styles.headerBlock}>
      <PageHeader
        title="الحضور والغياب"
        subtitle={summary ? `${summary.attendance_rate}% نسبة اليوم` : 'تسجيل يومي حسب الفصل'}
        actions={
          <View style={styles.headerActions}>
            <Button label="تصدير CSV" variant="outline" size="sm" icon="Download" onPress={onExport} />
            {mode === 'board' && classroomFilter ? (
              <Button
                label={saving ? 'جارٍ الحفظ...' : dirtyCount > 0 ? `حفظ (${dirtyCount})` : 'حفظ'}
                size="sm"
                disabled={saving || dirtyCount === 0}
                onPress={saveBulk}
              />
            ) : null}
          </View>
        }
      />

      <View style={styles.toolbar}>
        <DateField
          label="التاريخ"
          value={date}
          onChange={setDate}
          placeholder="اختر تاريخ الحضور"
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsRow}>
          <Pressable
            onPress={() => {
              setGradeFilter(null);
              setClassroomFilter(null);
            }}
            style={[styles.pill, gradeFilter == null && styles.pillOn]}
          >
            <Text style={[styles.pillText, gradeFilter == null && styles.pillTextOn]}>كل الصفوف</Text>
          </Pressable>
          {grades.map((g) => {
            const on = gradeFilter === g.id;
            return (
              <Pressable
                key={g.id}
                onPress={() => {
                  setGradeFilter(g.id);
                  setClassroomFilter(null);
                }}
                style={[styles.pill, on && styles.pillOn]}
              >
                <Text style={[styles.pillText, on && styles.pillTextOn]}>{g.name}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {gradeFilter ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsRow}>
            {classrooms.map((c) => {
              const on = classroomFilter === c.id;
              return (
                <Pressable
                  key={c.id}
                  onPress={() => setClassroomFilter(c.id)}
                  style={[styles.pill, on && styles.pillOn]}
                >
                  <Text style={[styles.pillText, on && styles.pillTextOn]}>{c.name}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : (
          <Text style={styles.hint}>اختر صفاً ثم فصلاً لفتح لوحة التسجيل</Text>
        )}

        <SegmentControl value={mode} options={MODE_OPTIONS} onChange={setMode} />

        {summary ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsRow}>
            <StatChip label="الطلاب" value={summary.total_students} />
            <StatChip label="حاضر" value={summary.present} tone={colors.success} />
            <StatChip label="غائب" value={summary.absent} tone={colors.danger} />
            <StatChip label="متأخر" value={summary.late} tone={colors.warning} />
            <StatChip label="بعذر" value={summary.excused} tone={colors.info} />
            <StatChip label="غير مسجّل" value={summary.not_recorded} />
            <StatChip label="النسبة" value={`${summary.attendance_rate}%`} tone={colors.primary} />
          </ScrollView>
        ) : null}

        {mode === 'board' && classroomFilter ? (
          <View style={styles.boardActions}>
            <Button label="الكل حاضر" variant="outline" size="sm" onPress={markAllPresent} />
            <Text style={styles.hint}>{roster.length} طالب في اللوحة</Text>
          </View>
        ) : null}
      </View>

      {loading ? <ActivityIndicator color={colors.primary} style={styles.loader} /> : null}
    </View>
  );

  const boardData = mode === 'board' ? roster : [];
  const unrecordedData = mode === 'unrecorded' ? unrecorded : [];

  return (
    <View style={styles.root} {...rtlProps}>
      {mode === 'qr' ? (
        <ScrollView
          contentContainerStyle={[styles.content, isMobile && styles.contentMobile]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadDay({ soft: true });
              }}
              tintColor={colors.primary}
            />
          }
        >
          {listHeader}
          <View style={styles.qrBox}>
            <Text style={styles.sectionTitle}>مسح QR للحضور</Text>
            <Text style={styles.hint}>
              اسمح للكاميرا، ثم وجّهها لـ QR الطالب. عند نجاح القراءة تظهر القيمة أسفل الكاميرا ويُسجَّل الحضور فوراً.
            </Text>
            <AttendanceQrScanner disabled={qrBusy} onScan={onQrCheckIn} />
            <FormError message={qrError} />

            <Pressable onPress={() => setShowManualQr((v) => !v)}>
              <Text style={styles.manualToggle}>
                {showManualQr ? 'إخفاء الإدخال اليدوي' : 'إدخال يدوي (لصق القيمة)'}
              </Text>
            </Pressable>

            {showManualQr ? (
              <View style={styles.manualQr}>
                <Input
                  label="QR Payload"
                  value={qrPayload}
                  onChangeText={setQrPayload}
                  placeholder="EMS|v1|2|...."
                  autoCapitalize="none"
                />
                <Button
                  label={qrBusy ? 'جارٍ...' : 'تسجيل حضور'}
                  onPress={() => onQrCheckIn()}
                  disabled={qrBusy}
                />
              </View>
            ) : null}
          </View>
        </ScrollView>
      ) : mode === 'board' ? (
        <FlatList
          data={loading ? [] : boardData}
          keyExtractor={(item) => String(item.student_id)}
          renderItem={({ item }) => (
            <StudentAttendanceRow
              row={item}
              onPick={(status) => pickStatus(item, status)}
              onCancel={() => {
                setCancelTarget(item);
                setCancelReason('');
              }}
            />
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={[
            styles.content,
            isMobile && styles.contentMobile,
            boardData.length === 0 && !loading ? styles.contentEmpty : null,
          ]}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={
            !loading ? (
              <EmptyState
                icon="ClipboardCheck"
                title={
                  classroomFilter ? 'لا طلاب في هذا الفصل' : 'اختر فصلاً للتسجيل'
                }
                description="حدّد الصف والفصل ثم سجّل الحالات واضغط حفظ"
              />
            ) : null
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadDay({ soft: true });
              }}
              tintColor={colors.primary}
            />
          }
        />
      ) : (
        <FlatList
          data={loading ? [] : unrecordedData}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <View style={styles.studentRow}>
              <View style={styles.studentMain}>
                <Avatar name={item.name} color={colors.primary} size={40} />
                <View style={styles.studentText}>
                  <Text style={styles.studentName}>{item.name}</Text>
                  <Text style={styles.studentMeta}>
                    {item.grade_name} · {item.classroom_name} · {item.login_code}
                  </Text>
                </View>
              </View>
              <View style={styles.marks}>
                <Pressable
                  style={styles.markBtn}
                  onPress={() => quickMarkUnrecorded(item, 'present')}
                >
                  <Text style={styles.markText}>حاضر</Text>
                </Pressable>
                <Pressable
                  style={styles.markBtn}
                  onPress={() => quickMarkUnrecorded(item, 'absent')}
                >
                  <Text style={styles.markText}>غائب</Text>
                </Pressable>
              </View>
            </View>
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={[
            styles.content,
            isMobile && styles.contentMobile,
            unrecordedData.length === 0 && !loading ? styles.contentEmpty : null,
          ]}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={
            !loading ? (
              <EmptyState
                icon="ClipboardCheck"
                title="لا يوجد غير مسجّلين"
                description="كل الطلاب لديهم سجل لهذا اليوم ضمن الفلتر الحالي"
              />
            ) : null
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadDay({ soft: true });
              }}
              tintColor={colors.primary}
            />
          }
        />
      )}

      <AppModal
        visible={reasonOpen}
        title={reasonStatus === 'excused' ? 'غياب بعذر' : 'تسجيل غياب'}
        description={reasonTarget ? reasonTarget.name : undefined}
        confirmLabel="تأكيد"
        onConfirm={confirmReason}
        onClose={() => {
          setReasonOpen(false);
          setReasonTarget(null);
        }}
      >
        <View style={styles.form}>
          <Input
            label="السبب"
            value={absenceReason}
            onChangeText={setAbsenceReason}
            placeholder={reasonStatus === 'excused' ? 'ظرف عائلي / مرض...' : 'اختياري'}
          />
          <FormError message={reasonError} />
        </View>
      </AppModal>

      <AppModal
        visible={!!cancelTarget}
        title="إلغاء سجل الحضور؟"
        description={
          cancelTarget
            ? `إلغاء سجل «${cancelTarget.name}» لهذا اليوم (إلغاء منطقي).`
            : undefined
        }
        confirmLabel={cancelling ? 'جارٍ...' : 'إلغاء السجل'}
        danger
        onConfirm={() => {
          if (!cancelling) onCancel();
        }}
        onClose={() => {
          if (!cancelling) {
            setCancelTarget(null);
            setCancelReason('');
          }
        }}
      >
        <View style={styles.form}>
          <FormLabel>سبب الإلغاء</FormLabel>
          <Input
            value={cancelReason}
            onChangeText={setCancelReason}
            placeholder="سجل بالخطأ"
          />
        </View>
      </AppModal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    writingDirection: 'rtl',
  },
  content: {
    paddingHorizontal: spacing['2xl'],
    paddingBottom: spacing['4xl'],
  },
  contentMobile: {
    paddingHorizontal: spacing.lg,
  },
  contentEmpty: {
    flexGrow: 1,
  },
  headerBlock: {
    paddingTop: spacing.xl,
    gap: spacing.xl,
    marginBottom: spacing.lg,
    writingDirection: 'rtl',
  },
  headerActions: {
    flexDirection: rowRtl,
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  toolbar: {
    gap: spacing.md,
  },
  pillsRow: {
    flexDirection: rowRtl,
    gap: 8,
    paddingVertical: 2,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
  },
  pillOn: {
    backgroundColor: colors.primarySoft,
  },
  pillText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.textSecondary,
  },
  pillTextOn: {
    color: colors.primaryDark,
    fontFamily: fonts.semiBold,
  },
  statsRow: {
    flexDirection: rowRtl,
    gap: spacing.sm,
  },
  statChip: {
    minWidth: 72,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.text,
  },
  statLabel: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.textMuted,
  },
  boardActions: {
    flexDirection: rowRtl,
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  hint: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'right',
  },
  loader: {
    marginVertical: spacing.lg,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
  },
  studentRow: {
    gap: spacing.md,
    paddingVertical: spacing.lg,
    writingDirection: 'rtl',
  },
  studentMain: {
    flexDirection: rowRtl,
    alignItems: 'center',
    gap: spacing.md,
  },
  studentText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  studentName: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
    color: colors.text,
    textAlign: 'right',
  },
  studentMeta: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'right',
  },
  cancelLink: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.danger,
  },
  marks: {
    flexDirection: rowRtl,
    flexWrap: 'wrap',
    gap: 6,
  },
  markBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  markText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.textSecondary,
  },
  qrBox: {
    gap: spacing.md,
    paddingBottom: spacing['2xl'],
  },
  manualToggle: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.primary,
    textAlign: 'right',
  },
  manualQr: {
    gap: spacing.md,
  },
  sectionTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
    color: colors.text,
    textAlign: 'right',
  },
  form: { gap: spacing.md },
});
