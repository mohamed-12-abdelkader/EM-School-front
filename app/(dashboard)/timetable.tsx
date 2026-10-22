import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
  Badge,
  Button,
  Card,
  EmptyState,
  Icon,
  Input,
  PageHeader,
  useToast,
} from '@/components/ui';
import {
  ChipSelect,
  EntityRow,
  FormError,
  FormLabel,
  FormSwitch,
  SegmentControl,
} from '@/components/admin';
import { listClassrooms } from '@/api/classrooms';
import { listGrades } from '@/api/grades';
import { ApiError } from '@/api/client';
import {
  copyTimetable,
  createTimetable,
  deleteTimetable,
  deleteTimetableSlot,
  extractConflicts,
  getTimetable,
  getTimetableSettings,
  listSubjectsForClassroom,
  listTeachersForSubject,
  listTimetables,
  publishTimetable,
  unpublishTimetable,
  updateTimetableSettings,
  upsertTimetableSlot,
  validateTimetable,
} from '@/api/timetables';
import type { SchoolClassroom } from '@/types/classrooms';
import type { SchoolGrade } from '@/types/grades';
import type {
  ClassroomSubjectOption,
  PeriodTemplate,
  SlotType,
  SubjectTeacherOption,
  TimetableDetail,
  TimetableListItem,
  TimetableSettings,
  TimetableSlot,
  TimetableStatus,
} from '@/types/timetables';
import {
  DAY_LABELS,
  SLOT_TYPE_LABELS,
  conflictMessage,
  formatTime,
  resolvePeriodInfo,
} from '@/utils/timetable';
import { colors, fonts, radii, shadows, spacing } from '@/theme/tokens';

const PAGE_SIZE = 20;
const CURRENT_YEAR = '2025/2026';

type StatusFilter = 'all' | TimetableStatus;
type SlotForm = {
  slot_type: SlotType;
  subject_id: number | null;
  teacher_id: number | null;
  start_time: string;
  end_time: string;
  notes: string;
};

export default function SchoolTimetablePage() {
  const { showToast } = useToast();
  const { width } = useWindowDimensions();
  const isMobile = width < 900;
  const isPhone = width < 640;

  const [view, setView] = useState<'list' | 'editor'>('list');
  const [selectedDay, setSelectedDay] = useState<number>(0);
  const [grades, setGrades] = useState<SchoolGrade[]>([]);
  const [classrooms, setClassrooms] = useState<SchoolClassroom[]>([]);

  const [items, setItems] = useState<TimetableListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [gradeFilter, setGradeFilter] = useState<number | null>(null);
  const [classroomFilter, setClassroomFilter] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [yearFilter, setYearFilter] = useState(CURRENT_YEAR);
  const [termFilter, setTermFilter] = useState('1');

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    classroom_id: null as number | null,
    academic_year: CURRENT_YEAR,
    term: '1',
    title: '',
  });
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);

  const [editorLoading, setEditorLoading] = useState(false);
  const [timetable, setTimetable] = useState<TimetableDetail | null>(null);
  const [slots, setSlots] = useState<TimetableSlot[]>([]);
  const [settings, setSettings] = useState<TimetableSettings | null>(null);
  const [templates, setTemplates] = useState<PeriodTemplate[]>([]);
  const [conflicts, setConflicts] = useState<{ code: string; message?: string }[]>([]);

  const [slotCell, setSlotCell] = useState<{ day: number; period: number } | null>(null);
  const [slotForm, setSlotForm] = useState<SlotForm | null>(null);
  const [editingSlotId, setEditingSlotId] = useState<number | null>(null);
  const [subjects, setSubjects] = useState<ClassroomSubjectOption[]>([]);
  const [teachers, setTeachers] = useState<SubjectTeacherOption[]>([]);
  const [slotSaving, setSlotSaving] = useState(false);
  const [slotError, setSlotError] = useState('');

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    periods_per_day: '7',
    default_period_minutes: '45',
    day_start_time: '08:00',
    day_end_time: '14:00',
    allow_teacher_conflicts: false,
    working_days: [0, 1, 2, 3, 4] as number[],
  });
  const [settingsSaving, setSettingsSaving] = useState(false);

  const [copyOpen, setCopyOpen] = useState(false);
  const [copyClassroomId, setCopyClassroomId] = useState<number | null>(null);
  const [copyReplace, setCopyReplace] = useState(false);
  const [copying, setCopying] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<TimetableListItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const filteredClassrooms = useMemo(() => {
    if (gradeFilter == null) return classrooms;
    return classrooms.filter((c) => c.grade_id === gradeFilter);
  }, [classrooms, gradeFilter]);

  const workingDays = useMemo(() => {
    const days = settings?.working_days?.length ? settings.working_days : [0, 1, 2, 3, 4];
    return [...days].sort((a, b) => a - b);
  }, [settings]);

  useEffect(() => {
    if (!workingDays.length) return;
    if (!workingDays.includes(selectedDay)) {
      setSelectedDay(workingDays[0]);
    }
  }, [workingDays, selectedDay]);

  const periodsCount = settings?.periods_per_day ?? 7;
  const cellWidth = Math.max(96, Math.min(130, Math.floor((width - 100) / Math.max(workingDays.length, 1))));

  const slotsMap = useMemo(() => {
    const map = new Map<string, TimetableSlot>();
    slots.forEach((s) => map.set(`${s.day_of_week}-${s.period_number}`, s));
    return map;
  }, [slots]);

  const loadLookups = useCallback(async () => {
    try {
      const [g, c] = await Promise.all([
        listGrades({ limit: 200, is_active: true }),
        listClassrooms({ limit: 200, is_active: true }),
      ]);
      setGrades([...g.grades].sort((a, b) => a.position - b.position));
      setClassrooms([...c.classrooms].sort((a, b) => a.position - b.position));
    } catch {
      // non-blocking
    }
  }, []);

  const loadList = useCallback(
    async (opts?: { soft?: boolean }) => {
      if (!opts?.soft) setLoading(true);
      try {
        const data = await listTimetables({
          grade_id: gradeFilter ?? undefined,
          classroom_id: classroomFilter ?? undefined,
          academic_year: yearFilter.trim() || undefined,
          term: termFilter.trim() || undefined,
          status: statusFilter === 'all' ? undefined : statusFilter,
          limit: PAGE_SIZE,
          skip: page * PAGE_SIZE,
        });
        setItems(data.timetables);
        setTotal(data.total);
      } catch (err) {
        showToast(err instanceof ApiError ? err.message : 'تعذر تحميل الجداول', 'danger');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [gradeFilter, classroomFilter, yearFilter, termFilter, statusFilter, page, showToast],
  );

  const openEditor = useCallback(
    async (id: number) => {
      setView('editor');
      setEditorLoading(true);
      setConflicts([]);
      try {
        const [detail, settingsRes] = await Promise.all([
          getTimetable(id),
          getTimetableSettings(),
        ]);
        setTimetable(detail.timetable);
        setSlots(detail.slots);
        setSettings(settingsRes.settings);
        setTemplates(settingsRes.period_templates);
      } catch (err) {
        showToast(err instanceof ApiError ? err.message : 'تعذر فتح الجدول', 'danger');
        setView('list');
      } finally {
        setEditorLoading(false);
      }
    },
    [showToast],
  );

  useEffect(() => {
    loadLookups();
  }, [loadLookups]);

  useEffect(() => {
    if (view === 'list') loadList();
  }, [view, loadList]);

  const openCreate = () => {
    setCreateForm({
      classroom_id: classroomFilter ?? filteredClassrooms[0]?.id ?? null,
      academic_year: yearFilter || CURRENT_YEAR,
      term: termFilter || '1',
      title: '',
    });
    setCreateError('');
    setCreateOpen(true);
  };

  const onCreate = async () => {
    if (!createForm.classroom_id) {
      setCreateError('اختر الفصل');
      return;
    }
    if (!createForm.academic_year.trim()) {
      setCreateError('العام الدراسي مطلوب');
      return;
    }
    setCreating(true);
    setCreateError('');
    try {
      const res = await createTimetable({
        classroom_id: createForm.classroom_id,
        academic_year: createForm.academic_year.trim(),
        term: createForm.term.trim() || '1',
        title: createForm.title.trim() || null,
        slots: [],
      });
      showToast('تم إنشاء الجدول', 'success');
      setCreateOpen(false);
      await openEditor(res.timetable.id);
    } catch (err) {
      const conflictsFound = extractConflicts(err);
      if (conflictsFound.length) {
        setCreateError(conflictsFound.map((c) => conflictMessage(c.code)).join(' · '));
      } else if (err instanceof ApiError && err.status === 409) {
        setCreateError('يوجد جدول لنفس الفصل والعام والترم');
      } else {
        setCreateError(err instanceof ApiError ? err.message : 'فشل الإنشاء');
      }
    } finally {
      setCreating(false);
    }
  };

  const refreshEditor = async () => {
    if (!timetable) return;
    const detail = await getTimetable(timetable.id);
    setTimetable(detail.timetable);
    setSlots(detail.slots);
    setSettings(detail.settings);
  };

  const openSlot = async (day: number, period: number) => {
    if (!timetable || !settings) return;
    const existing = slotsMap.get(`${day}-${period}`);
    const info = resolvePeriodInfo(period, day, settings, templates);
    setSlotCell({ day, period });
    setEditingSlotId(existing?.id ?? null);
    setSlotError('');
    setTeachers([]);
    setSlotForm({
      slot_type: existing?.slot_type || info.slot_type,
      subject_id: existing?.subject_id ?? null,
      teacher_id: existing?.teacher_id ?? null,
      start_time: formatTime(existing?.start_time || info.start_time),
      end_time: formatTime(existing?.end_time || info.end_time),
      notes: existing?.notes || '',
    });
    try {
      const subRes = await listSubjectsForClassroom(timetable.classroom_id);
      setSubjects(subRes.subjects);
      if (existing?.subject_id) {
        const tRes = await listTeachersForSubject(existing.subject_id);
        setTeachers(tRes.teachers);
      }
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'تعذر تحميل المواد', 'danger');
    }
  };

  const onSubjectChange = async (subjectId: number | null) => {
    setSlotForm((f) => (f ? { ...f, subject_id: subjectId, teacher_id: null } : f));
    setTeachers([]);
    if (!subjectId) return;
    try {
      const tRes = await listTeachersForSubject(subjectId);
      setTeachers(tRes.teachers);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'تعذر تحميل المدرسين', 'danger');
    }
  };

  const saveSlot = async () => {
    if (!timetable || !slotCell || !slotForm) return;
    if (slotForm.slot_type === 'lesson') {
      if (!slotForm.subject_id || !slotForm.teacher_id) {
        setSlotError('المادة والمدرس مطلوبان لحصة الدرس');
        return;
      }
    }
    setSlotSaving(true);
    setSlotError('');
    try {
      await upsertTimetableSlot(timetable.id, {
        day_of_week: slotCell.day,
        period_number: slotCell.period,
        start_time: slotForm.start_time,
        end_time: slotForm.end_time,
        slot_type: slotForm.slot_type,
        subject_id: slotForm.slot_type === 'lesson' ? slotForm.subject_id : null,
        teacher_id: slotForm.slot_type === 'lesson' ? slotForm.teacher_id : null,
        notes: slotForm.notes.trim() || null,
      });
      showToast('تم حفظ الحصة', 'success');
      setSlotCell(null);
      await refreshEditor();
    } catch (err) {
      const found = extractConflicts(err);
      if (found.length) {
        setSlotError(found.map((c) => conflictMessage(c.code)).join('\n'));
      } else {
        setSlotError(err instanceof ApiError ? err.message : 'فشل حفظ الحصة');
      }
    } finally {
      setSlotSaving(false);
    }
  };

  const clearSlot = async () => {
    if (!timetable || !editingSlotId) {
      setSlotCell(null);
      return;
    }
    setSlotSaving(true);
    try {
      await deleteTimetableSlot(timetable.id, editingSlotId);
      showToast('تم حذف الحصة', 'success');
      setSlotCell(null);
      await refreshEditor();
    } catch (err) {
      setSlotError(err instanceof ApiError ? err.message : 'فشل الحذف');
    } finally {
      setSlotSaving(false);
    }
  };

  const runValidate = async () => {
    if (!timetable) return;
    setActionBusy(true);
    try {
      const res = await validateTimetable(timetable.id);
      setConflicts(res.conflicts);
      showToast(res.valid ? 'الجدول سليم بدون تعارضات' : 'يوجد تعارضات', res.valid ? 'success' : 'warning');
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'فشل التحقق', 'danger');
    } finally {
      setActionBusy(false);
    }
  };

  const runPublish = async (force = false) => {
    if (!timetable) return;
    setActionBusy(true);
    try {
      await publishTimetable(timetable.id, force);
      showToast('تم نشر الجدول', 'success');
      setConflicts([]);
      await refreshEditor();
    } catch (err) {
      const found = extractConflicts(err);
      setConflicts(found);
      showToast(
        found.length ? 'لا يمكن النشر بسبب تعارضات' : err instanceof ApiError ? err.message : 'فشل النشر',
        'danger',
      );
    } finally {
      setActionBusy(false);
    }
  };

  const runUnpublish = async () => {
    if (!timetable) return;
    setActionBusy(true);
    try {
      await unpublishTimetable(timetable.id);
      showToast('عاد الجدول لمسودة', 'info');
      await refreshEditor();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'فشل إلغاء النشر', 'danger');
    } finally {
      setActionBusy(false);
    }
  };

  const openSettings = async () => {
    try {
      const res = await getTimetableSettings();
      setSettings(res.settings);
      setTemplates(res.period_templates);
      setSettingsForm({
        periods_per_day: String(res.settings.periods_per_day),
        default_period_minutes: String(res.settings.default_period_minutes),
        day_start_time: formatTime(res.settings.day_start_time),
        day_end_time: formatTime(res.settings.day_end_time),
        allow_teacher_conflicts: !!res.settings.allow_teacher_conflicts,
        working_days: [...(res.settings.working_days || [0, 1, 2, 3, 4])],
      });
      setSettingsOpen(true);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'تعذر تحميل الإعدادات', 'danger');
    }
  };

  const saveSettings = async () => {
    setSettingsSaving(true);
    try {
      await updateTimetableSettings({
        periods_per_day: Number(settingsForm.periods_per_day) || 7,
        default_period_minutes: Number(settingsForm.default_period_minutes) || 45,
        day_start_time: settingsForm.day_start_time,
        day_end_time: settingsForm.day_end_time,
        allow_teacher_conflicts: settingsForm.allow_teacher_conflicts,
        working_days: settingsForm.working_days,
      });
      showToast('تم حفظ الإعدادات', 'success');
      setSettingsOpen(false);
      if (timetable) await refreshEditor();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'فشل حفظ الإعدادات', 'danger');
    } finally {
      setSettingsSaving(false);
    }
  };

  const runCopy = async () => {
    if (!timetable || !copyClassroomId) return;
    setCopying(true);
    try {
      const res = await copyTimetable(timetable.id, {
        target_classroom_id: copyClassroomId,
        replace_existing: copyReplace,
      });
      showToast('تم نسخ الجدول', 'success');
      setCopyOpen(false);
      await openEditor(res.timetable.id);
    } catch (err) {
      const found = extractConflicts(err);
      showToast(
        found.length
          ? found.map((c) => conflictMessage(c.code)).join(' · ')
          : err instanceof ApiError
            ? err.message
            : 'فشل النسخ',
        'danger',
      );
    } finally {
      setCopying(false);
    }
  };

  const onDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteTimetable(deleteTarget.id);
      showToast('تم حذف الجدول', 'success');
      setDeleteTarget(null);
      if (timetable?.id === deleteTarget.id) {
        setView('list');
        setTimetable(null);
      }
      loadList({ soft: true });
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'فشل الحذف', 'danger');
    } finally {
      setDeleting(false);
    }
  };

  const unpublishedHint =
    timetable?.status === 'draft' && timetable.last_published_at
      ? 'تغييرات غير منشورة'
      : null;

  if (view === 'editor') {
    return (
      <View style={styles.root}>
        <ScrollView
          contentContainerStyle={[styles.content, isMobile && styles.contentMobile]}
          refreshControl={
            <RefreshControl
              refreshing={editorLoading}
              onRefresh={() => timetable && openEditor(timetable.id)}
              tintColor={colors.primary}
            />
          }
        >
          <PageHeader
            title={timetable?.title || timetable?.classroom_name || 'محرر الجدول'}
            subtitle={
              timetable
                ? `${timetable.grade_name} · ${timetable.classroom_name} · ${timetable.academic_year} · ترم ${timetable.term}`
                : 'جارٍ التحميل...'
            }
            actions={
              <View style={styles.headerActions}>
                <Button
                  label="رجوع"
                  variant="outline"
                  size="sm"
                  onPress={() => {
                    setView('list');
                    loadList({ soft: true });
                  }}
                />
                <Button label="إعدادات" variant="outline" size="sm" onPress={openSettings} />
              </View>
            }
          />

          {timetable ? (
            <View style={styles.statusRow}>
              <Badge
                label={timetable.status === 'published' ? 'منشور' : 'مسودة'}
                tone={timetable.status === 'published' ? 'success' : 'warning'}
              />
              {unpublishedHint ? (
                <Badge label={unpublishedHint} tone="info" />
              ) : null}
              <Text style={styles.slotsCount}>{slots.length} حصة</Text>
            </View>
          ) : null}

          <Card style={styles.toolbar}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.toolbarRow}>
              <Button label="تحقق" variant="outline" size="sm" disabled={actionBusy} onPress={runValidate} />
              <Button
                label="نشر"
                size="sm"
                disabled={actionBusy}
                onPress={() => runPublish(false)}
              />
              <Button
                label="نشر إجباري"
                variant="secondary"
                size="sm"
                disabled={actionBusy}
                onPress={() => runPublish(true)}
              />
              <Button
                label="إلغاء النشر"
                variant="outline"
                size="sm"
                disabled={actionBusy || timetable?.status !== 'published'}
                onPress={runUnpublish}
              />
              <Button
                label="نسخ"
                variant="outline"
                size="sm"
                onPress={() => {
                  setCopyClassroomId(null);
                  setCopyReplace(false);
                  setCopyOpen(true);
                }}
              />
            </ScrollView>
          </Card>

          {conflicts.length > 0 ? (
            <Card style={styles.conflictsCard}>
              <Text style={styles.conflictsTitle}>تعارضات ({conflicts.length})</Text>
              {conflicts.map((c, i) => (
                <Text key={`${c.code}-${i}`} style={styles.conflictItem}>
                  • {conflictMessage(c.code)}
                  {c.message ? ` — ${c.message}` : ''}
                </Text>
              ))}
            </Card>
          ) : null}

          {editorLoading || !settings || !timetable ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 40 }} />
          ) : isPhone ? (
            <View style={styles.mobileSchedule}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.dayTabs}
              >
                {workingDays.map((day) => {
                  const active = selectedDay === day;
                  const daySlots = slots.filter((s) => s.day_of_week === day).length;
                  return (
                    <Pressable
                      key={day}
                      onPress={() => setSelectedDay(day)}
                      style={[styles.dayTab, active && styles.dayTabOn]}
                    >
                      <Text style={[styles.dayTabText, active && styles.dayTabTextOn]}>
                        {DAY_LABELS[day]}
                      </Text>
                      <Text style={[styles.dayTabMeta, active && styles.dayTabMetaOn]}>
                        {daySlots} حصة
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <Text style={styles.mobileDayTitle}>{DAY_LABELS[selectedDay]}</Text>

              <View style={styles.mobilePeriods}>
                {Array.from({ length: periodsCount }, (_, i) => i + 1).map((period) => {
                  const info = resolvePeriodInfo(period, selectedDay, settings, templates);
                  const slot = slotsMap.get(`${selectedDay}-${period}`);
                  return (
                    <Pressable
                      key={period}
                      onPress={() => openSlot(selectedDay, period)}
                      style={[
                        styles.mobilePeriodCard,
                        slot?.slot_type === 'break' && styles.slotBreak,
                        slot?.slot_type === 'activity' && styles.slotActivity,
                        slot?.slot_type === 'reserve' && styles.slotReserve,
                        slot?.slot_type === 'lesson' && styles.slotLesson,
                        !slot && styles.mobilePeriodEmpty,
                      ]}
                    >
                      <View style={styles.mobilePeriodIndex}>
                        <Text style={styles.mobilePeriodNum}>{period}</Text>
                        <Text style={styles.mobilePeriodClock}>
                          {formatTime(slot?.start_time || info.start_time)}
                          {'\n'}
                          {formatTime(slot?.end_time || info.end_time)}
                        </Text>
                      </View>
                      <View style={styles.mobilePeriodBody}>
                        {slot ? (
                          <>
                            <Text style={styles.mobileSlotTitle} numberOfLines={1}>
                              {slot.slot_type === 'lesson'
                                ? slot.subject_name || 'حصة'
                                : SLOT_TYPE_LABELS[slot.slot_type]}
                            </Text>
                            {slot.teacher_name ? (
                              <Text style={styles.mobileSlotSub} numberOfLines={1}>
                                {slot.teacher_name}
                              </Text>
                            ) : (
                              <Text style={styles.mobileSlotSub}>
                                {SLOT_TYPE_LABELS[slot.slot_type]}
                              </Text>
                            )}
                          </>
                        ) : (
                          <>
                            <Text style={styles.mobileEmptyTitle}>خانة فارغة</Text>
                            <Text style={styles.mobileEmptyHint}>اضغط لإضافة حصة</Text>
                          </>
                        )}
                      </View>
                      <Icon
                        name={slot ? 'Pencil' : 'Plus'}
                        size={18}
                        color={slot ? colors.primary : colors.textMuted}
                      />
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator>
              <View style={styles.grid}>
                <View style={styles.gridRow}>
                  <View style={[styles.corner, styles.cell]}>
                    <Text style={styles.cornerText}>الحصة</Text>
                  </View>
                  {workingDays.map((day) => (
                    <View
                      key={day}
                      style={[styles.dayHead, styles.cell, { width: cellWidth }]}
                    >
                      <Text style={styles.dayHeadText}>{DAY_LABELS[day]}</Text>
                    </View>
                  ))}
                </View>

                {Array.from({ length: periodsCount }, (_, i) => i + 1).map((period) => (
                  <View key={period} style={styles.gridRow}>
                    <View style={[styles.periodHead, styles.cell]}>
                      <Text style={styles.periodNum}>{period}</Text>
                      <Text style={styles.periodTime}>
                        {formatTime(
                          resolvePeriodInfo(period, workingDays[0] ?? 0, settings, templates)
                            .start_time,
                        )}
                      </Text>
                    </View>
                    {workingDays.map((day) => {
                      const slot = slotsMap.get(`${day}-${period}`);
                      return (
                        <Pressable
                          key={`${day}-${period}`}
                          onPress={() => openSlot(day, period)}
                          style={[
                            styles.cell,
                            styles.slotCell,
                            { width: cellWidth },
                            slot?.slot_type === 'break' && styles.slotBreak,
                            slot?.slot_type === 'activity' && styles.slotActivity,
                            slot?.slot_type === 'reserve' && styles.slotReserve,
                            slot?.slot_type === 'lesson' && styles.slotLesson,
                          ]}
                        >
                          {slot ? (
                            <>
                              <Text style={styles.slotTitle} numberOfLines={1}>
                                {slot.slot_type === 'lesson'
                                  ? slot.subject_name || 'حصة'
                                  : SLOT_TYPE_LABELS[slot.slot_type]}
                              </Text>
                              {slot.teacher_name ? (
                                <Text style={styles.slotSub} numberOfLines={1}>
                                  {slot.teacher_name}
                                </Text>
                              ) : null}
                              <Text style={styles.slotTime}>
                                {formatTime(slot.start_time)}–{formatTime(slot.end_time)}
                              </Text>
                            </>
                          ) : (
                            <Icon name="Plus" size={16} color={colors.textMuted} />
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
                ))}
              </View>
            </ScrollView>
          )}
        </ScrollView>

        <AppModal
          visible={!!slotCell && !!slotForm}
          title={
            slotCell
              ? `${DAY_LABELS[slotCell.day]} · الحصة ${slotCell.period}`
              : 'حصة'
          }
          confirmLabel={slotSaving ? 'جارٍ الحفظ...' : 'حفظ'}
          onConfirm={() => {
            if (!slotSaving) saveSlot();
          }}
          onClose={() => {
            if (!slotSaving) setSlotCell(null);
          }}
        >
          {slotForm ? (
            <View style={styles.form}>
              <FormLabel>نوع الخانة</FormLabel>
              <View style={styles.typeRow}>
                {(Object.keys(SLOT_TYPE_LABELS) as SlotType[]).map((type) => (
                  <Pressable
                    key={type}
                    onPress={() =>
                      setSlotForm((f) => (f ? { ...f, slot_type: type } : f))
                    }
                    style={[
                      styles.typeChip,
                      slotForm.slot_type === type && styles.typeChipOn,
                    ]}
                  >
                    <Text
                      style={[
                        styles.typeChipText,
                        slotForm.slot_type === type && styles.typeChipTextOn,
                      ]}
                    >
                      {SLOT_TYPE_LABELS[type]}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {slotForm.slot_type === 'lesson' ? (
                <>
                  <FormLabel>المادة</FormLabel>
                  <ChipSelect
                    required
                    options={subjects.map((s) => ({
                      id: s.id,
                      label: s.code ? `${s.name} (${s.code})` : s.name,
                    }))}
                    value={slotForm.subject_id}
                    onChange={(next) => onSubjectChange(typeof next === 'number' ? next : null)}
                    emptyHint="لا توجد مواد مربوطة بصف هذا الفصل"
                  />
                  <FormLabel>المدرس</FormLabel>
                  <ChipSelect
                    required
                    options={teachers.map((t) => ({ id: t.id, label: t.name }))}
                    value={slotForm.teacher_id}
                    onChange={(next) =>
                      setSlotForm((f) =>
                        f
                          ? { ...f, teacher_id: typeof next === 'number' ? next : null }
                          : f,
                      )
                    }
                    emptyHint={
                      slotForm.subject_id
                        ? 'لا يوجد مدرسون لهذه المادة'
                        : 'اختر المادة أولاً'
                    }
                  />
                </>
              ) : null}

              <View style={[styles.timeRow, isPhone && styles.timeRowStack]}>
                <View style={{ flex: 1, minWidth: isPhone ? '100%' : undefined }}>
                  <Input
                    label="من"
                    value={slotForm.start_time}
                    onChangeText={(start_time) =>
                      setSlotForm((f) => (f ? { ...f, start_time } : f))
                    }
                    placeholder="08:00"
                  />
                </View>
                <View style={{ flex: 1, minWidth: isPhone ? '100%' : undefined }}>
                  <Input
                    label="إلى"
                    value={slotForm.end_time}
                    onChangeText={(end_time) =>
                      setSlotForm((f) => (f ? { ...f, end_time } : f))
                    }
                    placeholder="08:45"
                  />
                </View>
              </View>

              <Input
                label="ملاحظات"
                value={slotForm.notes}
                onChangeText={(notes) => setSlotForm((f) => (f ? { ...f, notes } : f))}
                placeholder="اختياري"
              />

              {editingSlotId ? (
                <Button
                  label="حذف الحصة"
                  variant="danger"
                  onPress={clearSlot}
                  disabled={slotSaving}
                />
              ) : null}
              <FormError message={slotError} />
            </View>
          ) : null}
        </AppModal>

        <AppModal
          visible={copyOpen}
          title="نسخ الجدول لفصل آخر"
          confirmLabel={copying ? 'جارٍ النسخ...' : 'نسخ'}
          onConfirm={() => {
            if (!copying) runCopy();
          }}
          onClose={() => {
            if (!copying) setCopyOpen(false);
          }}
        >
          <View style={styles.form}>
            <FormLabel>الفصل المستهدف</FormLabel>
            <ChipSelect
              required
              options={classrooms
                .filter((c) => c.id !== timetable?.classroom_id)
                .map((c) => ({ id: c.id, label: `${c.grade_name} · ${c.name}` }))}
              value={copyClassroomId}
              onChange={(next) =>
                setCopyClassroomId(typeof next === 'number' ? next : null)
              }
            />
            <FormSwitch
              label="استبدال إن وُجد جدول"
              value={copyReplace}
              onChange={setCopyReplace}
            />
          </View>
        </AppModal>

        <AppModal
          visible={settingsOpen}
          title="إعدادات الجدول"
          confirmLabel={settingsSaving ? 'جارٍ الحفظ...' : 'حفظ'}
          onConfirm={() => {
            if (!settingsSaving) saveSettings();
          }}
          onClose={() => {
            if (!settingsSaving) setSettingsOpen(false);
          }}
        >
          <View style={styles.form}>
            <FormLabel>أيام العمل</FormLabel>
            <View style={styles.typeRow}>
              {DAY_LABELS.map((label, day) => {
                const on = settingsForm.working_days.includes(day);
                return (
                  <Pressable
                    key={day}
                    onPress={() =>
                      setSettingsForm((f) => ({
                        ...f,
                        working_days: on
                          ? f.working_days.filter((d) => d !== day)
                          : [...f.working_days, day].sort((a, b) => a - b),
                      }))
                    }
                    style={[styles.typeChip, on && styles.typeChipOn]}
                  >
                    <Text style={[styles.typeChipText, on && styles.typeChipTextOn]}>
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Input
              label="عدد الحصص يومياً"
              value={settingsForm.periods_per_day}
              onChangeText={(periods_per_day) =>
                setSettingsForm((f) => ({ ...f, periods_per_day }))
              }
              keyboardType="number-pad"
            />
            <Input
              label="مدة الحصة (دقيقة)"
              value={settingsForm.default_period_minutes}
              onChangeText={(default_period_minutes) =>
                setSettingsForm((f) => ({ ...f, default_period_minutes }))
              }
              keyboardType="number-pad"
            />
            <View style={styles.timeRow}>
              <View style={{ flex: 1 }}>
                <Input
                  label="بداية اليوم"
                  value={settingsForm.day_start_time}
                  onChangeText={(day_start_time) =>
                    setSettingsForm((f) => ({ ...f, day_start_time }))
                  }
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  label="نهاية اليوم"
                  value={settingsForm.day_end_time}
                  onChangeText={(day_end_time) =>
                    setSettingsForm((f) => ({ ...f, day_end_time }))
                  }
                />
              </View>
            </View>
            <FormSwitch
              label="السماح بتعارض المدرسين"
              value={settingsForm.allow_teacher_conflicts}
              onChange={(allow_teacher_conflicts) =>
                setSettingsForm((f) => ({ ...f, allow_teacher_conflicts }))
              }
            />
          </View>
        </AppModal>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.content, isMobile && styles.contentMobile]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadList({ soft: true });
            }}
            tintColor={colors.primary}
          />
        }
      >
        <PageHeader
          title="الجدول المدرسي"
          subtitle={`${total} جدول · صفحة ${page + 1} من ${totalPages}`}
          actions={
            <View style={styles.headerActions}>
              <Button label="إعدادات" variant="outline" onPress={openSettings} />
              <Button label="جدول جديد" icon="Plus" onPress={openCreate} />
            </View>
          }
        />

        <Card style={styles.filterCard}>
          <View style={[styles.filterRow, isPhone && styles.filterRowStack]}>
            <View style={{ flex: 1, minWidth: isPhone ? '100%' : 140 }}>
              <Input
                label="العام الدراسي"
                value={yearFilter}
                onChangeText={(v) => {
                  setPage(0);
                  setYearFilter(v);
                }}
                placeholder="2025/2026"
              />
            </View>
            <View style={{ width: isPhone ? '100%' : 100 }}>
              <Input
                label="الترم"
                value={termFilter}
                onChangeText={(v) => {
                  setPage(0);
                  setTermFilter(v);
                }}
                placeholder="1"
              />
            </View>
          </View>

          <SegmentControl
            value={statusFilter}
            options={[
              { key: 'all', label: 'الكل' },
              { key: 'draft', label: 'مسودة' },
              { key: 'published', label: 'منشور' },
            ]}
            onChange={(v) => {
              setPage(0);
              setStatusFilter(v);
            }}
          />

          <FormLabel>الصف</FormLabel>
          <ChipSelect
            options={grades.map((g) => ({ id: g.id, label: g.name }))}
            value={gradeFilter}
            onChange={(next) => {
              setPage(0);
              setGradeFilter(typeof next === 'number' ? next : null);
              setClassroomFilter(null);
            }}
          />

          <FormLabel>الفصل</FormLabel>
          <ChipSelect
            options={filteredClassrooms.map((c) => ({
              id: c.id,
              label: `${c.grade_name} · ${c.name}`,
            }))}
            value={classroomFilter}
            onChange={(next) => {
              setPage(0);
              setClassroomFilter(typeof next === 'number' ? next : null);
            }}
          />
        </Card>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 40 }} />
        ) : items.length === 0 ? (
          <EmptyState
            icon="CalendarClock"
            title="لا توجد جداول"
            description="أنشئ جدولاً أسبوعياً لفصل دراسي"
            actionLabel="جدول جديد"
            onAction={openCreate}
          />
        ) : (
          <View style={styles.list}>
            {items.map((item) => (
              <EntityRow
                key={item.id}
                title={item.title || item.classroom_name}
                subtitle={`${item.grade_name} · ${item.classroom_name}`}
                meta={`${item.academic_year} · ترم ${item.term} · ${item.slots_count} حصة`}
                badge={item.status === 'published' ? 'منشور' : 'مسودة'}
                status={item.status === 'published' ? 'active' : 'inactive'}
                onPress={() => openEditor(item.id)}
                onEdit={() => openEditor(item.id)}
                onDelete={() => setDeleteTarget(item)}
              />
            ))}
          </View>
        )}

        {items.length > 0 ? (
          <View style={styles.pagination}>
            <Button
              label="السابق"
              variant="outline"
              size="sm"
              disabled={page <= 0}
              onPress={() => setPage((p) => Math.max(0, p - 1))}
            />
            <Text style={styles.pageText}>
              {page + 1} / {totalPages}
            </Text>
            <Button
              label="التالي"
              variant="outline"
              size="sm"
              disabled={page + 1 >= totalPages}
              onPress={() => setPage((p) => p + 1)}
            />
          </View>
        ) : null}
      </ScrollView>

      <AppModal
        visible={createOpen}
        title="جدول جديد"
        description="جدول أسبوعي لفصل واحد ضمن عام وترم محددين."
        confirmLabel={creating ? 'جارٍ الإنشاء...' : 'إنشاء'}
        onConfirm={() => {
          if (!creating) onCreate();
        }}
        onClose={() => {
          if (!creating) setCreateOpen(false);
        }}
      >
        <View style={styles.form}>
          <FormLabel>الفصل</FormLabel>
          <ChipSelect
            required
            options={classrooms.map((c) => ({
              id: c.id,
              label: `${c.grade_name} · ${c.name}`,
            }))}
            value={createForm.classroom_id}
            onChange={(next) =>
              setCreateForm((f) => ({
                ...f,
                classroom_id: typeof next === 'number' ? next : null,
              }))
            }
            emptyHint="أضف فصولاً أولاً"
          />
          <Input
            label="العام الدراسي"
            value={createForm.academic_year}
            onChangeText={(academic_year) =>
              setCreateForm((f) => ({ ...f, academic_year }))
            }
          />
          <Input
            label="الترم"
            value={createForm.term}
            onChangeText={(term) => setCreateForm((f) => ({ ...f, term }))}
          />
          <Input
            label="العنوان"
            value={createForm.title}
            onChangeText={(title) => setCreateForm((f) => ({ ...f, title }))}
            placeholder="اختياري"
          />
          <FormError message={createError} />
        </View>
      </AppModal>

      <AppModal
        visible={!!deleteTarget}
        title="حذف الجدول؟"
        description={
          deleteTarget
            ? `حذف منطقي لجدول «${deleteTarget.title || deleteTarget.classroom_name}».`
            : undefined
        }
        confirmLabel={deleting ? 'جارٍ...' : 'حذف'}
        danger
        onConfirm={() => {
          if (!deleting) onDelete();
        }}
        onClose={() => {
          if (!deleting) setDeleteTarget(null);
        }}
      />

      <AppModal
        visible={settingsOpen}
        title="إعدادات الجدول"
        confirmLabel={settingsSaving ? 'جارٍ الحفظ...' : 'حفظ'}
        onConfirm={() => {
          if (!settingsSaving) saveSettings();
        }}
        onClose={() => {
          if (!settingsSaving) setSettingsOpen(false);
        }}
      >
        <View style={styles.form}>
          <FormLabel>أيام العمل</FormLabel>
          <View style={styles.typeRow}>
            {DAY_LABELS.map((label, day) => {
              const on = settingsForm.working_days.includes(day);
              return (
                <Pressable
                  key={day}
                  onPress={() =>
                    setSettingsForm((f) => ({
                      ...f,
                      working_days: on
                        ? f.working_days.filter((d) => d !== day)
                        : [...f.working_days, day].sort((a, b) => a - b),
                    }))
                  }
                  style={[styles.typeChip, on && styles.typeChipOn]}
                >
                  <Text style={[styles.typeChipText, on && styles.typeChipTextOn]}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Input
            label="عدد الحصص يومياً"
            value={settingsForm.periods_per_day}
            onChangeText={(periods_per_day) =>
              setSettingsForm((f) => ({ ...f, periods_per_day }))
            }
            keyboardType="number-pad"
          />
          <Input
            label="مدة الحصة (دقيقة)"
            value={settingsForm.default_period_minutes}
            onChangeText={(default_period_minutes) =>
              setSettingsForm((f) => ({ ...f, default_period_minutes }))
            }
            keyboardType="number-pad"
          />
          <View style={styles.timeRow}>
            <View style={{ flex: 1 }}>
              <Input
                label="بداية اليوم"
                value={settingsForm.day_start_time}
                onChangeText={(day_start_time) =>
                  setSettingsForm((f) => ({ ...f, day_start_time }))
                }
              />
            </View>
            <View style={{ flex: 1 }}>
              <Input
                label="نهاية اليوم"
                value={settingsForm.day_end_time}
                onChangeText={(day_end_time) =>
                  setSettingsForm((f) => ({ ...f, day_end_time }))
                }
              />
            </View>
          </View>
          <FormSwitch
            label="السماح بتعارض المدرسين"
            value={settingsForm.allow_teacher_conflicts}
            onChange={(allow_teacher_conflicts) =>
              setSettingsForm((f) => ({ ...f, allow_teacher_conflicts }))
            }
          />
        </View>
      </AppModal>
    </View>
  );
}

const PERIOD_W = 72;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: {
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing.xl,
    paddingBottom: spacing['4xl'],
    gap: spacing.md,
  },
  contentMobile: { paddingHorizontal: spacing.md },
  headerActions: {
    flexDirection: 'row-reverse',
    gap: spacing.sm,
    flexWrap: 'wrap',
    width: '100%',
  },
  filterCard: { gap: spacing.md, padding: spacing.lg },
  filterRow: {
    flexDirection: 'row-reverse',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  filterRowStack: {
    flexDirection: 'column',
  },
  list: { gap: spacing.sm },
  pagination: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  pageText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.textSecondary,
  },
  form: { gap: spacing.md },
  statusRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  slotsCount: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.textSecondary,
  },
  toolbar: { padding: spacing.md },
  toolbarRow: {
    flexDirection: 'row-reverse',
    gap: spacing.sm,
    paddingLeft: spacing.sm,
  },
  conflictsCard: {
    backgroundColor: colors.warningSoft,
    borderColor: colors.warning,
    gap: spacing.sm,
  },
  conflictsTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: colors.text,
    textAlign: 'right',
  },
  conflictItem: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'right',
  },
  mobileSchedule: {
    gap: spacing.md,
  },
  dayTabs: {
    flexDirection: 'row-reverse',
    gap: 8,
    paddingVertical: 2,
  },
  dayTab: {
    minWidth: 84,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    gap: 2,
  },
  dayTabOn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dayTabText: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: colors.text,
  },
  dayTabTextOn: {
    color: colors.onBrand,
  },
  dayTabMeta: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.textMuted,
  },
  dayTabMetaOn: {
    color: colors.onBrandMuted,
  },
  mobileDayTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.text,
    textAlign: 'right',
  },
  mobilePeriods: {
    gap: spacing.sm,
  },
  mobilePeriodCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    minHeight: 76,
    ...shadows.sm,
  },
  mobilePeriodEmpty: {
    backgroundColor: colors.surface,
    borderStyle: 'dashed',
  },
  mobilePeriodIndex: {
    width: 54,
    alignItems: 'center',
    gap: 2,
  },
  mobilePeriodNum: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.primaryDark,
  },
  mobilePeriodClock: {
    fontFamily: fonts.regular,
    fontSize: 10,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 14,
  },
  mobilePeriodBody: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  mobileSlotTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
    color: colors.text,
    textAlign: 'right',
  },
  mobileSlotSub: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'right',
  },
  mobileEmptyTitle: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'right',
  },
  mobileEmptyHint: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'right',
  },
  grid: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  gridRow: { flexDirection: 'row-reverse' },
  cell: {
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    minHeight: 78,
    justifyContent: 'center',
    padding: 8,
  },
  corner: {
    width: PERIOD_W,
    backgroundColor: colors.background,
  },
  cornerText: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
  },
  dayHead: {
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
  },
  dayHeadText: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: colors.primaryDark,
  },
  periodHead: {
    width: PERIOD_W,
    backgroundColor: colors.background,
    alignItems: 'center',
    gap: 2,
  },
  periodNum: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.text,
  },
  periodTime: {
    fontFamily: fonts.regular,
    fontSize: 10,
    color: colors.textMuted,
  },
  slotCell: {
    alignItems: 'center',
    gap: 2,
  },
  slotLesson: { backgroundColor: colors.primarySoft },
  slotBreak: { backgroundColor: colors.warningSoft },
  slotActivity: { backgroundColor: colors.infoSoft },
  slotReserve: { backgroundColor: colors.background },
  slotTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    color: colors.text,
    textAlign: 'center',
  },
  slotSub: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  slotTime: {
    fontFamily: fonts.medium,
    fontSize: 10,
    color: colors.textMuted,
  },
  typeRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  typeChipOn: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  typeChipText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.textSecondary,
  },
  typeChipTextOn: {
    color: colors.primaryDark,
    fontFamily: fonts.semiBold,
  },
  timeRow: {
    flexDirection: 'row-reverse',
    gap: spacing.md,
  },
  timeRowStack: {
    flexDirection: 'column',
  },
});
