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
  Badge,
  Button,
  DateField,
  toISODate,
  EmptyState,
  Icon,
  Input,
  PageHeader,
  useToast,
} from '@/components/ui';
import {
  ChipSelect,
  FormError,
  FormLabel,
  SegmentControl,
  StudentQrCode,
} from '@/components/admin';
import { listClassrooms } from '@/api/classrooms';
import { listGrades } from '@/api/grades';
import { listParents } from '@/api/parents';
import {
  createStudent,
  deleteStudent,
  getStudent,
  listStudents,
  regenerateStudentLoginCode,
  regenerateStudentQr,
  transferStudent,
  updateStudent,
  updateStudentStatus,
} from '@/api/students';
import { ApiError } from '@/api/client';
import type { SchoolClassroom } from '@/types/classrooms';
import type { SchoolGrade } from '@/types/grades';
import type { SchoolParent } from '@/types/parents';
import type {
  ParentRelation,
  SchoolStudent,
  StudentAccessCodes,
  StudentParentLink,
  StudentStatus,
} from '@/types/students';
import type { StatusTone } from '@/types';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

const PAGE_SIZE = 20;
const CURRENT_YEAR = '2025/2026';

type FormMode = 'create' | 'edit';
type ParentMode = 'new' | 'existing';
type StatusFilter = 'all' | StudentStatus;

const STATUS_LABELS: Record<StudentStatus, string> = {
  active: 'نشط',
  suspended: 'موقوف',
  archived: 'مؤرشف',
};

const STATUS_TONE: Record<StudentStatus, StatusTone> = {
  active: 'success',
  suspended: 'warning',
  archived: 'neutral',
};

const RELATION_LABELS: Record<ParentRelation, string> = {
  father: 'أب',
  mother: 'أم',
  guardian: 'وصي',
  other: 'أخرى',
};

const GENDER_OPTIONS = [
  { id: 'male' as const, label: 'ذكر' },
  { id: 'female' as const, label: 'أنثى' },
];

const RELATION_OPTIONS = (Object.keys(RELATION_LABELS) as ParentRelation[]).map(
  (id) => ({ id, label: RELATION_LABELS[id] }),
);

const STATUS_FILTER_OPTIONS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'الكل' },
  { key: 'active', label: 'نشط' },
  { key: 'suspended', label: 'موقوف' },
  { key: 'archived', label: 'مؤرشف' },
];

const emptyForm = {
  name: '',
  academic_year: CURRENT_YEAR,
  grade_id: null as number | null,
  classroom_id: null as number | null,
  birth_date: '',
  gender: null as string | null,
  phone: '',
  national_id: '',
  address: '',
  seat_number: '',
  notes: '',
  status: 'active' as StudentStatus,
  parent_mode: 'new' as ParentMode,
  parent_id: null as number | null,
  parent_name: '',
  parent_phone: '',
  parent_email: '',
  parent_relation: 'father' as ParentRelation,
};

const rtlProps =
  Platform.OS === 'web' ? ({ dir: 'rtl' } as Record<string, string>) : {};

/** Web uses dir=rtl + row; native needs row-reverse for visual RTL. */
const rowRtl = Platform.OS === 'web' ? 'row' : 'row-reverse';

async function copyText(value: string) {
  if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
    await navigator.clipboard.writeText(value);
    return;
  }
  throw new Error('clipboard_unavailable');
}

function CodeRow({
  label,
  value,
  onCopy,
}: {
  label: string;
  value: string;
  onCopy: (v: string) => void;
}) {
  return (
    <Pressable onPress={() => onCopy(value)} style={styles.codeRow}>
      <View style={styles.codeTextWrap}>
        <Text style={styles.codeLabel}>{label}</Text>
        <Text style={styles.codeValue}>{value}</Text>
      </View>
      <Text style={styles.copyHint}>نسخ</Text>
    </Pressable>
  );
}

function StudentRow({
  student,
  onOpen,
}: {
  student: SchoolStudent;
  onOpen: () => void;
}) {
  const archived = !!student.deleted_at || student.status === 'archived';

  return (
    <Pressable
      onPress={onOpen}
      disabled={archived}
      style={({ pressed }) => [
        styles.studentRow,
        archived && styles.studentRowMuted,
        pressed && !archived ? styles.studentRowPressed : null,
      ]}
    >
      <Avatar name={student.name} color={colors.primary} size={42} />
      <View style={styles.studentMain}>
        <Text style={styles.studentName} numberOfLines={1}>
          {student.name}
        </Text>
        <Text style={styles.studentClass} numberOfLines={1}>
          {student.grade_name} · {student.classroom_name}
          <Text style={styles.studentCode}> · {student.login_code}</Text>
        </Text>
      </View>
      <View style={styles.studentTrailing}>
        <Text
          style={[
            styles.statusText,
            student.status === 'active' && styles.statusActive,
            student.status === 'suspended' && styles.statusSuspended,
            student.status === 'archived' && styles.statusArchived,
          ]}
        >
          {STATUS_LABELS[student.status]}
        </Text>
        {!archived ? (
          <Icon name="ChevronLeft" size={18} color={colors.textMuted} />
        ) : null}
      </View>
    </Pressable>
  );
}

export default function SchoolStudentsPage() {
  const { showToast } = useToast();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [students, setStudents] = useState<SchoolStudent[]>([]);
  const [grades, setGrades] = useState<SchoolGrade[]>([]);
  const [classrooms, setClassrooms] = useState<SchoolClassroom[]>([]);
  const [formClassrooms, setFormClassrooms] = useState<SchoolClassroom[]>([]);
  const [transferClassrooms, setTransferClassrooms] = useState<SchoolClassroom[]>([]);
  const [parentHits, setParentHits] = useState<SchoolParent[]>([]);

  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [gradeFilter, setGradeFilter] = useState<number | null>(null);
  const [classroomFilter, setClassroomFilter] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [yearFilter, setYearFilter] = useState(CURRENT_YEAR);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>('create');
  const [editing, setEditing] = useState<SchoolStudent | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [parentSearch, setParentSearch] = useState('');
  const [searchingParents, setSearchingParents] = useState(false);

  const [accessOpen, setAccessOpen] = useState(false);
  const [accessCodes, setAccessCodes] = useState<StudentAccessCodes | null>(null);
  const [accessStudent, setAccessStudent] = useState<SchoolStudent | null>(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<SchoolStudent | null>(null);
  const [detailParents, setDetailParents] = useState<StudentParentLink[]>([]);
  const [schoolLoginCode, setSchoolLoginCode] = useState('');
  const [qrBump, setQrBump] = useState(0);

  const [transferOpen, setTransferOpen] = useState(false);
  const [transferForm, setTransferForm] = useState({
    grade_id: null as number | null,
    classroom_id: null as number | null,
    academic_year: CURRENT_YEAR,
  });

  const [deleteTarget, setDeleteTarget] = useState<SchoolStudent | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [moreFilters, setMoreFilters] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const filteredClassrooms = useMemo(
    () =>
      gradeFilter
        ? classrooms.filter((c) => c.grade_id === gradeFilter)
        : classrooms,
    [classrooms, gradeFilter],
  );

  const activeFiltersCount = useMemo(() => {
    let n = 0;
    if (statusFilter !== 'all') n += 1;
    if (gradeFilter != null) n += 1;
    if (classroomFilter != null) n += 1;
    if (yearFilter.trim() && yearFilter.trim() !== CURRENT_YEAR) n += 1;
    if (includeDeleted) n += 1;
    return n;
  }, [statusFilter, gradeFilter, classroomFilter, yearFilter, includeDeleted]);

  const loadGrades = useCallback(async () => {
    try {
      const data = await listGrades({ limit: 200, skip: 0, is_active: true });
      setGrades([...data.grades].sort((a, b) => a.position - b.position));
    } catch {
      // non-blocking
    }
  }, []);

  const loadClassroomsForFilter = useCallback(async (gradeId: number | null) => {
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

  const loadFormClassrooms = useCallback(async (gradeId: number | null) => {
    if (!gradeId) {
      setFormClassrooms([]);
      return;
    }
    try {
      const data = await listClassrooms({
        grade_id: gradeId,
        limit: 200,
        skip: 0,
        is_active: true,
      });
      setFormClassrooms(data.classrooms);
    } catch {
      setFormClassrooms([]);
    }
  }, []);

  const loadTransferClassrooms = useCallback(async (gradeId: number | null) => {
    if (!gradeId) {
      setTransferClassrooms([]);
      return;
    }
    try {
      const data = await listClassrooms({
        grade_id: gradeId,
        limit: 200,
        skip: 0,
        is_active: true,
      });
      setTransferClassrooms(data.classrooms);
    } catch {
      setTransferClassrooms([]);
    }
  }, []);

  const load = useCallback(
    async (opts?: { soft?: boolean }) => {
      if (!opts?.soft) setLoading(true);
      try {
        const data = await listStudents({
          search: search.trim() || undefined,
          grade_id: gradeFilter ?? undefined,
          classroom_id: classroomFilter ?? undefined,
          status: statusFilter === 'all' ? undefined : statusFilter,
          academic_year: yearFilter.trim() || undefined,
          limit: PAGE_SIZE,
          skip: page * PAGE_SIZE,
          include_deleted: includeDeleted,
        });
        setStudents(data.students);
        setTotal(data.total);
      } catch (err) {
        showToast(err instanceof ApiError ? err.message : 'تعذر تحميل الطلاب', 'danger');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      search,
      page,
      gradeFilter,
      classroomFilter,
      statusFilter,
      yearFilter,
      includeDeleted,
      showToast,
    ],
  );

  useEffect(() => {
    loadGrades();
  }, [loadGrades]);

  useEffect(() => {
    loadClassroomsForFilter(gradeFilter);
  }, [gradeFilter, loadClassroomsForFilter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!formOpen || formMode !== 'create' || form.parent_mode !== 'existing') {
      return;
    }
    const q = parentSearch.trim();
    if (q.length < 2) {
      setParentHits([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setSearchingParents(true);
      try {
        const data = await listParents({ search: q, limit: 12, skip: 0 });
        if (!cancelled) setParentHits(data.parents);
      } catch {
        if (!cancelled) setParentHits([]);
      } finally {
        if (!cancelled) setSearchingParents(false);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [parentSearch, formOpen, formMode, form.parent_mode]);

  const onCopy = async (value: string) => {
    try {
      await copyText(value);
      showToast('تم النسخ', 'success');
    } catch {
      showToast(value, 'info');
    }
  };

  const resetFilters = () => {
    setPage(0);
    setStatusFilter('all');
    setGradeFilter(null);
    setClassroomFilter(null);
    setYearFilter(CURRENT_YEAR);
    setIncludeDeleted(false);
    setSearch('');
  };

  const openCreate = () => {
    if (grades.length === 0) {
      showToast('أضف صفًا دراسيًا أولاً', 'info');
      return;
    }
    setFormMode('create');
    setEditing(null);
    const gradeId = gradeFilter ?? grades[0]?.id ?? null;
    setForm({
      ...emptyForm,
      grade_id: gradeId,
      classroom_id: classroomFilter,
      academic_year: yearFilter || CURRENT_YEAR,
    });
    setParentSearch('');
    setParentHits([]);
    setFormError('');
    setFormOpen(true);
    loadFormClassrooms(gradeId);
  };

  const openEdit = (student: SchoolStudent) => {
    if (student.deleted_at) return;
    setFormMode('edit');
    setEditing(student);
    setForm({
      ...emptyForm,
      name: student.name,
      academic_year: student.academic_year,
      grade_id: student.grade_id,
      classroom_id: student.classroom_id,
      birth_date: student.birth_date?.slice(0, 10) || '',
      gender: student.gender,
      phone: student.phone || '',
      national_id: student.national_id || '',
      address: student.address || '',
      seat_number: student.seat_number || '',
      notes: student.notes || '',
      status: student.status,
    });
    setFormError('');
    setFormOpen(true);
  };

  const openDetail = async (student: SchoolStudent) => {
    setDetail(student);
    setDetailParents([]);
    setDetailOpen(true);
    try {
      const data = await getStudent(student.id);
      setDetail(data.student);
      setDetailParents(data.parents);
      setSchoolLoginCode(data.school?.login_code || '');
      setQrBump((n) => n + 1);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'تعذر تحميل التفاصيل', 'danger');
    }
  };

  const onSave = async () => {
    const name = form.name.trim();
    if (!name) {
      setFormError('اسم الطالب مطلوب');
      return;
    }

    if (formMode === 'create') {
      if (!form.academic_year.trim()) {
        setFormError('العام الدراسي مطلوب');
        return;
      }
      if (!form.grade_id || !form.classroom_id) {
        setFormError('اختر الصف والفصل');
        return;
      }
      if (form.parent_mode === 'existing') {
        if (!form.parent_id) {
          setFormError('اختر ولي أمر موجود');
          return;
        }
      } else if (!form.parent_name.trim()) {
        setFormError('اسم ولي الأمر مطلوب');
        return;
      } else if (!form.parent_phone.trim()) {
        setFormError('هاتف ولي الأمر مطلوب');
        return;
      }
    }

    setSaving(true);
    setFormError('');
    try {
      if (formMode === 'create') {
        const parent =
          form.parent_mode === 'existing'
            ? {
                parent_id: form.parent_id!,
                relation: form.parent_relation,
              }
            : {
                name: form.parent_name.trim(),
                phone: form.parent_phone.trim(),
                email: form.parent_email.trim() || undefined,
                relation: form.parent_relation,
              };

        const res = await createStudent({
          name,
          academic_year: form.academic_year.trim(),
          grade_id: form.grade_id!,
          classroom_id: form.classroom_id!,
          birth_date: form.birth_date.trim() || null,
          gender: form.gender,
          phone: form.phone.trim() || undefined,
          national_id: form.national_id.trim() || null,
          address: form.address.trim() || null,
          seat_number: form.seat_number.trim() || null,
          notes: form.notes.trim() || null,
          status: form.status,
          parent,
        });
        setFormOpen(false);
        setAccessCodes(res.access);
        setAccessStudent(res.student);
        setAccessOpen(true);
        showToast('تم تسجيل الطالب', 'success');
      } else if (editing) {
        await updateStudent(editing.id, {
          name,
          birth_date: form.birth_date.trim() || null,
          gender: form.gender,
          phone: form.phone.trim() || null,
          national_id: form.national_id.trim() || null,
          address: form.address.trim() || null,
          seat_number: form.seat_number.trim() || null,
          notes: form.notes.trim() || null,
          status: form.status,
        });
        setFormOpen(false);
        showToast('تم تحديث بيانات الطالب', 'success');
        if (detail?.id === editing.id) openDetail(editing);
      }
      load({ soft: true });
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'فشل الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteStudent(deleteTarget.id);
      showToast('تم أرشفة الطالب', 'success');
      setDeleteTarget(null);
      if (detail?.id === deleteTarget.id) setDetailOpen(false);
      load({ soft: true });
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'فشل الأرشفة', 'danger');
    } finally {
      setDeleting(false);
    }
  };

  const changeStatus = async (status: StudentStatus) => {
    if (!detail) return;
    setActionBusy(true);
    try {
      await updateStudentStatus(detail.id, status);
      showToast(`تم تحديث الحالة إلى ${STATUS_LABELS[status]}`, 'success');
      openDetail(detail);
      load({ soft: true });
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'فشل تحديث الحالة', 'danger');
    } finally {
      setActionBusy(false);
    }
  };

  const onTransfer = async () => {
    if (!detail || !transferForm.grade_id || !transferForm.classroom_id) {
      showToast('اختر الصف والفصل', 'info');
      return;
    }
    setActionBusy(true);
    try {
      await transferStudent(detail.id, {
        grade_id: transferForm.grade_id,
        classroom_id: transferForm.classroom_id,
        academic_year: transferForm.academic_year.trim() || undefined,
      });
      showToast('تم نقل الطالب', 'success');
      setTransferOpen(false);
      openDetail(detail);
      load({ soft: true });
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'فشل النقل', 'danger');
    } finally {
      setActionBusy(false);
    }
  };

  const onRegenLogin = async () => {
    if (!detail) return;
    setActionBusy(true);
    try {
      const res = await regenerateStudentLoginCode(detail.id);
      showToast('تم تجديد كود الدخول', 'success');
      setDetail((d) => (d ? { ...d, login_code: res.login_code } : d));
      load({ soft: true });
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'فشل تجديد الكود', 'danger');
    } finally {
      setActionBusy(false);
    }
  };

  const onRegenQr = async () => {
    if (!detail) return;
    setActionBusy(true);
    try {
      const res = await regenerateStudentQr(detail.id);
      showToast('تم تجديد QR', 'success');
      setDetail((d) =>
        d
          ? {
              ...d,
              qr_token: res.qr_token,
              qr_payload: res.qr_payload,
            }
          : d,
      );
      setQrBump((n) => n + 1);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'فشل تجديد QR', 'danger');
    } finally {
      setActionBusy(false);
    }
  };

  const listHeader = (
    <View style={styles.headerBlock}>
      <PageHeader
        title="إدارة الطلاب"
        subtitle={`${total} طالب`}
        actions={<Button label="طالب جديد" icon="Plus" onPress={openCreate} />}
      />

      <View style={styles.toolbar}>
        <Input
          value={search}
          onChangeText={(v) => {
            setPage(0);
            setSearch(v);
          }}
          placeholder="بحث بالاسم أو الكود..."
          icon="Search"
        />
        <SegmentControl
          value={statusFilter}
          options={STATUS_FILTER_OPTIONS}
          onChange={(v) => {
            setPage(0);
            setStatusFilter(v);
          }}
        />

        <View style={styles.toolbarLinks}>
          <Pressable
            onPress={() => setMoreFilters((v) => !v)}
            style={styles.moreFiltersBtn}
          >
            <Text style={styles.moreFiltersText}>
              {moreFilters ? 'إخفاء الفلاتر' : 'فلاتر الصف والفصل'}
              {activeFiltersCount > 0 && !moreFilters
                ? ` (${activeFiltersCount})`
                : ''}
            </Text>
            <Icon
              name={moreFilters ? 'ChevronUp' : 'ChevronDown'}
              size={16}
              color={colors.primary}
            />
          </Pressable>
          {activeFiltersCount > 0 ? (
            <Pressable onPress={resetFilters}>
              <Text style={styles.resetText}>مسح</Text>
            </Pressable>
          ) : null}
        </View>

        {moreFilters ? (
          <View style={styles.moreFiltersPanel}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.pillsRow}
            >
              <Pressable
                onPress={() => {
                  setPage(0);
                  setGradeFilter(null);
                  setClassroomFilter(null);
                }}
                style={[styles.pill, gradeFilter == null && styles.pillOn]}
              >
                <Text
                  style={[styles.pillText, gradeFilter == null && styles.pillTextOn]}
                >
                  كل الصفوف
                </Text>
              </Pressable>
              {grades.map((g) => {
                const on = gradeFilter === g.id;
                return (
                  <Pressable
                    key={g.id}
                    onPress={() => {
                      setPage(0);
                      setGradeFilter(g.id);
                      setClassroomFilter(null);
                    }}
                    style={[styles.pill, on && styles.pillOn]}
                  >
                    <Text style={[styles.pillText, on && styles.pillTextOn]}>
                      {g.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {gradeFilter ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.pillsRow}
              >
                <Pressable
                  onPress={() => {
                    setPage(0);
                    setClassroomFilter(null);
                  }}
                  style={[styles.pill, classroomFilter == null && styles.pillOn]}
                >
                  <Text
                    style={[
                      styles.pillText,
                      classroomFilter == null && styles.pillTextOn,
                    ]}
                  >
                    كل الفصول
                  </Text>
                </Pressable>
                {filteredClassrooms.map((c) => {
                  const on = classroomFilter === c.id;
                  return (
                    <Pressable
                      key={c.id}
                      onPress={() => {
                        setPage(0);
                        setClassroomFilter(c.id);
                      }}
                      style={[styles.pill, on && styles.pillOn]}
                    >
                      <Text style={[styles.pillText, on && styles.pillTextOn]}>
                        {c.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            ) : null}

            <Input
              label="العام الدراسي"
              value={yearFilter}
              onChangeText={(v) => {
                setPage(0);
                setYearFilter(v);
              }}
              placeholder={CURRENT_YEAR}
            />
            <Pressable
              onPress={() => {
                setPage(0);
                setIncludeDeleted((v) => !v);
              }}
            >
              <Text
                style={[styles.deletedText, includeDeleted && styles.deletedTextOn]}
              >
                {includeDeleted ? 'إخفاء المحذوفين' : 'إظهار المحذوفين'}
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : null}
    </View>
  );

  return (
    <View style={styles.root} {...rtlProps}>
      <FlatList
        data={loading ? [] : students}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <StudentRow student={item} onOpen={() => openDetail(item)} />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={[
          styles.content,
          isMobile && styles.contentMobile,
          students.length === 0 && !loading ? styles.contentEmpty : null,
        ]}
        ListHeaderComponent={listHeader}
        ListFooterComponent={
          !loading && students.length > 0 ? (
            <View style={styles.pagination}>
              <Button
                label="التالي"
                variant="outline"
                size="sm"
                disabled={page + 1 >= totalPages}
                onPress={() => setPage(page + 1)}
              />
              <Text style={styles.pageText}>
                {page + 1} / {totalPages}
              </Text>
              <Button
                label="السابق"
                variant="outline"
                size="sm"
                disabled={page <= 0}
                onPress={() => setPage(Math.max(0, page - 1))}
              />
            </View>
          ) : null
        }
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              icon="GraduationCap"
              title="لا يوجد طلاب"
              description="سجّل طالبًا جديدًا مع ولي أمره وأكواد الدخول"
              actionLabel="طالب جديد"
              onAction={openCreate}
            />
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load({ soft: true });
            }}
            tintColor={colors.primary}
          />
        }
      />

      <AppModal
        visible={formOpen}
        title={formMode === 'create' ? 'تسجيل طالب' : 'تعديل بيانات الطالب'}
        description={
          formMode === 'create'
            ? '٣ خطوات: بيانات الطالب → الصف والفصل → ولي الأمر'
            : 'تعديل البيانات الشخصية فقط (بدون تغيير أكواد الدخول).'
        }
        confirmLabel={saving ? 'جارٍ الحفظ...' : 'حفظ'}
        onConfirm={() => {
          if (!saving) onSave();
        }}
        onClose={() => {
          if (!saving) setFormOpen(false);
        }}
      >
        <ScrollView style={styles.formScroll} contentContainerStyle={styles.form}>
          <Text style={styles.sectionTitle}>
            {formMode === 'create' ? '١) بيانات الطالب' : 'بيانات الطالب'}
          </Text>
          <Input
            label="الاسم"
            value={form.name}
            onChangeText={(name) => setForm((f) => ({ ...f, name }))}
            placeholder="أحمد محمد"
          />
          <FormLabel>النوع</FormLabel>
          <ChipSelect
            options={GENDER_OPTIONS}
            value={form.gender}
            onChange={(next) =>
              setForm((f) => ({
                ...f,
                gender: typeof next === 'string' ? next : null,
              }))
            }
          />
          <DateField
            label="تاريخ الميلاد"
            value={form.birth_date}
            onChange={(birth_date) => setForm((f) => ({ ...f, birth_date }))}
            clearable
            placeholder="اختر تاريخ الميلاد"
            maximumDate={toISODate(new Date())}
          />
          <Input
            label="هاتف الطالب"
            value={form.phone}
            onChangeText={(phone) => setForm((f) => ({ ...f, phone }))}
            placeholder="01000000001"
            keyboardType="phone-pad"
          />
          <Input
            label="الرقم القومي"
            value={form.national_id}
            onChangeText={(national_id) => setForm((f) => ({ ...f, national_id }))}
            placeholder="اختياري"
          />
          <Input
            label="العنوان"
            value={form.address}
            onChangeText={(address) => setForm((f) => ({ ...f, address }))}
            placeholder="اختياري"
          />
          <Input
            label="رقم الجلوس"
            value={form.seat_number}
            onChangeText={(seat_number) => setForm((f) => ({ ...f, seat_number }))}
            placeholder="اختياري"
          />
          <Input
            label="ملاحظات"
            value={form.notes}
            onChangeText={(notes) => setForm((f) => ({ ...f, notes }))}
            placeholder="اختياري"
          />

          {formMode === 'create' ? (
            <>
              <Text style={styles.sectionTitle}>٢) التسجيل الدراسي</Text>
              <Input
                label="العام الدراسي"
                value={form.academic_year}
                onChangeText={(academic_year) =>
                  setForm((f) => ({ ...f, academic_year }))
                }
                placeholder={CURRENT_YEAR}
              />
              <FormLabel>الصف</FormLabel>
              <ChipSelect
                required
                options={grades.map((g) => ({ id: g.id, label: g.name }))}
                value={form.grade_id}
                onChange={(next) => {
                  const grade_id = typeof next === 'number' ? next : null;
                  setForm((f) => ({ ...f, grade_id, classroom_id: null }));
                  loadFormClassrooms(grade_id);
                }}
              />
              <FormLabel>الفصل</FormLabel>
              <ChipSelect
                required
                options={formClassrooms.map((c) => ({ id: c.id, label: c.name }))}
                value={form.classroom_id}
                onChange={(next) =>
                  setForm((f) => ({
                    ...f,
                    classroom_id: typeof next === 'number' ? next : null,
                  }))
                }
                emptyHint={form.grade_id ? 'لا فصول لهذا الصف' : 'اختر الصف أولاً'}
              />
            </>
          ) : (
            <>
              <FormLabel>الحالة</FormLabel>
              <ChipSelect
                options={(Object.keys(STATUS_LABELS) as StudentStatus[]).map((id) => ({
                  id,
                  label: STATUS_LABELS[id],
                }))}
                value={form.status}
                onChange={(next) =>
                  setForm((f) => ({
                    ...f,
                    status:
                      typeof next === 'string' ? (next as StudentStatus) : f.status,
                  }))
                }
              />
            </>
          )}

          {formMode === 'create' ? (
            <>
              <Text style={styles.sectionTitle}>٣) ولي الأمر</Text>
              <SegmentControl
                value={form.parent_mode}
                options={[
                  { key: 'new', label: 'ولي جديد' },
                  { key: 'existing', label: 'موجود' },
                ]}
                onChange={(parent_mode) =>
                  setForm((f) => ({
                    ...f,
                    parent_mode,
                    parent_id: null,
                  }))
                }
              />
              <FormLabel>صلة القرابة</FormLabel>
              <ChipSelect
                options={RELATION_OPTIONS}
                value={form.parent_relation}
                onChange={(next) =>
                  setForm((f) => ({
                    ...f,
                    parent_relation:
                      typeof next === 'string'
                        ? (next as ParentRelation)
                        : f.parent_relation,
                  }))
                }
              />
              {form.parent_mode === 'existing' ? (
                <>
                  <Input
                    label="بحث عن ولي أمر"
                    value={parentSearch}
                    onChangeText={setParentSearch}
                    placeholder="اسم أو هاتف..."
                  />
                  {searchingParents ? (
                    <Text style={styles.hint}>جارٍ البحث...</Text>
                  ) : null}
                  <View style={styles.parentHits}>
                    {parentHits.map((p) => {
                      const selected = form.parent_id === p.id;
                      return (
                        <Pressable
                          key={p.id}
                          onPress={() => setForm((f) => ({ ...f, parent_id: p.id }))}
                          style={[styles.parentHit, selected && styles.parentHitOn]}
                        >
                          <Text style={styles.parentHitName}>{p.name}</Text>
                          <Text style={styles.parentHitMeta}>
                            {p.phone || 'بدون هاتف'} · {p.students_count} أبناء
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </>
              ) : (
                <>
                  <Input
                    label="اسم ولي الأمر"
                    value={form.parent_name}
                    onChangeText={(parent_name) =>
                      setForm((f) => ({ ...f, parent_name }))
                    }
                    placeholder="محمد علي"
                  />
                  <Input
                    label="هاتف ولي الأمر"
                    value={form.parent_phone}
                    onChangeText={(parent_phone) =>
                      setForm((f) => ({ ...f, parent_phone }))
                    }
                    placeholder="01000000099"
                    keyboardType="phone-pad"
                  />
                  <Input
                    label="البريد"
                    value={form.parent_email}
                    onChangeText={(parent_email) =>
                      setForm((f) => ({ ...f, parent_email }))
                    }
                    placeholder="اختياري"
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </>
              )}
            </>
          ) : null}

          <FormError message={formError} />
        </ScrollView>
      </AppModal>

      <AppModal
        visible={accessOpen}
        title="أكواد الدخول"
        description="احفظ هذه الأكواد الآن — تُستخدم مع كود المدرسة في بوابة الدخول."
        confirmLabel="تم"
        cancelLabel="إغلاق"
        onConfirm={() => setAccessOpen(false)}
        onClose={() => setAccessOpen(false)}
      >
        {accessCodes && accessStudent ? (
          <View style={styles.accessBox}>
            <Text style={styles.accessStudent}>{accessStudent.name}</Text>
            <CodeRow
              label="كود المدرسة"
              value={accessCodes.school_login_code}
              onCopy={onCopy}
            />
            <CodeRow
              label="كود الطالب"
              value={accessCodes.student_login_code}
              onCopy={onCopy}
            />
            <CodeRow
              label="كود ولي الأمر"
              value={accessCodes.parent_login_code}
              onCopy={onCopy}
            />
            <Badge
              label={
                accessCodes.parent_created
                  ? 'تم إنشاء ولي أمر جديد'
                  : 'تم ربط ولي أمر موجود'
              }
              tone={accessCodes.parent_created ? 'success' : 'info'}
            />
            {accessStudent.qr_payload ? (
              <>
                <Text style={styles.sectionTitle}>QR الحضور</Text>
                <StudentQrCode
                  key={`access-qr-${accessStudent.id}-${qrBump}`}
                  value={accessStudent.qr_payload}
                  size={200}
                />
              </>
            ) : null}
            <Button
              label="فتح ملف الطالب"
              variant="outline"
              size="sm"
              onPress={() => {
                setAccessOpen(false);
                openDetail(accessStudent);
              }}
            />
          </View>
        ) : null}
      </AppModal>

      <AppModal
        visible={detailOpen && !!detail}
        title={detail?.name || 'تفاصيل الطالب'}
        description={
          detail
            ? `${detail.grade_name} · ${detail.classroom_name} · ${detail.academic_year}`
            : undefined
        }
        cancelLabel="إغلاق"
        onClose={() => setDetailOpen(false)}
      >
        {detail ? (
          <ScrollView style={styles.formScroll} contentContainerStyle={styles.form}>
            <View style={styles.detailBadges}>
              <Badge
                label={STATUS_LABELS[detail.status]}
                tone={STATUS_TONE[detail.status]}
              />
              <Badge label={`كود ${detail.login_code}`} tone="info" />
            </View>

            <CodeRow
              label="كود المدرسة"
              value={schoolLoginCode || '—'}
              onCopy={onCopy}
            />
            <CodeRow
              label="كود دخول الطالب"
              value={detail.login_code}
              onCopy={onCopy}
            />

            {detail.qr_payload ? (
              <>
                <Text style={styles.sectionTitle}>QR الحضور</Text>
                <StudentQrCode
                  key={`detail-qr-${detail.id}-${qrBump}`}
                  value={detail.qr_payload}
                  size={200}
                />
              </>
            ) : null}

            <Text style={styles.sectionTitle}>أولياء الأمور</Text>
            {detailParents.length === 0 ? (
              <Text style={styles.hint}>لا يوجد أولياء مرتبطون</Text>
            ) : (
              detailParents.map((p) => (
                <View key={p.id} style={styles.parentHit}>
                  <Text style={styles.parentHitName}>
                    {p.name}
                    {p.is_primary ? ' · أساسي' : ''}
                  </Text>
                  <Text style={styles.parentHitMeta}>
                    {RELATION_LABELS[p.relation] || p.relation} · {p.phone || '—'} · كود{' '}
                    {p.login_code}
                  </Text>
                </View>
              ))
            )}

            <Text style={styles.sectionTitle}>إجراءات</Text>
            <View style={styles.actionsGrid}>
              <Button
                label="تعديل"
                variant="outline"
                size="sm"
                onPress={() => {
                  setDetailOpen(false);
                  openEdit(detail);
                }}
              />
              <Button
                label="نقل فصل"
                variant="outline"
                size="sm"
                disabled={actionBusy}
                onPress={() => {
                  setTransferForm({
                    grade_id: detail.grade_id,
                    classroom_id: detail.classroom_id,
                    academic_year: detail.academic_year,
                  });
                  loadTransferClassrooms(detail.grade_id);
                  setTransferOpen(true);
                }}
              />
              {detail.status !== 'active' ? (
                <Button
                  label="تفعيل"
                  size="sm"
                  disabled={actionBusy}
                  onPress={() => changeStatus('active')}
                />
              ) : (
                <Button
                  label="إيقاف"
                  variant="secondary"
                  size="sm"
                  disabled={actionBusy}
                  onPress={() => changeStatus('suspended')}
                />
              )}
              <Button
                label="تجديد كود"
                variant="outline"
                size="sm"
                disabled={actionBusy}
                onPress={onRegenLogin}
              />
              <Button
                label="تجديد QR"
                variant="outline"
                size="sm"
                disabled={actionBusy}
                onPress={onRegenQr}
              />
              <Button
                label="أرشفة"
                variant="danger"
                size="sm"
                disabled={actionBusy}
                onPress={() => {
                  setDetailOpen(false);
                  setDeleteTarget(detail);
                }}
              />
            </View>
          </ScrollView>
        ) : null}
      </AppModal>

      <AppModal
        visible={transferOpen}
        title="نقل الطالب"
        description="تغيير الصف/الفصل أو العام الدراسي"
        confirmLabel={actionBusy ? 'جارٍ...' : 'نقل'}
        onConfirm={() => {
          if (!actionBusy) onTransfer();
        }}
        onClose={() => {
          if (!actionBusy) setTransferOpen(false);
        }}
      >
        <View style={styles.form}>
          <Input
            label="العام الدراسي"
            value={transferForm.academic_year}
            onChangeText={(academic_year) =>
              setTransferForm((f) => ({ ...f, academic_year }))
            }
            placeholder={CURRENT_YEAR}
          />
          <FormLabel>الصف</FormLabel>
          <ChipSelect
            required
            options={grades.map((g) => ({ id: g.id, label: g.name }))}
            value={transferForm.grade_id}
            onChange={(next) => {
              const grade_id = typeof next === 'number' ? next : null;
              setTransferForm((f) => ({
                ...f,
                grade_id,
                classroom_id: null,
              }));
              loadTransferClassrooms(grade_id);
            }}
          />
          <FormLabel>الفصل</FormLabel>
          <ChipSelect
            required
            options={transferClassrooms.map((c) => ({
              id: c.id,
              label: c.name,
            }))}
            value={transferForm.classroom_id}
            onChange={(next) =>
              setTransferForm((f) => ({
                ...f,
                classroom_id: typeof next === 'number' ? next : null,
              }))
            }
            emptyHint="اختر الصف أولاً"
          />
        </View>
      </AppModal>

      <AppModal
        visible={!!deleteTarget}
        title="أرشفة الطالب؟"
        description={
          deleteTarget
            ? `«${deleteTarget.name}» سيُحوَّل إلى مؤرشف (حذف منطقي).`
            : undefined
        }
        confirmLabel={deleting ? 'جارٍ...' : 'أرشفة'}
        danger
        onConfirm={() => {
          if (!deleting) onDelete();
        }}
        onClose={() => {
          if (!deleting) setDeleteTarget(null);
        }}
      />
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
  toolbar: {
    gap: spacing.md,
  },
  toolbarLinks: {
    flexDirection: rowRtl,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  moreFiltersBtn: {
    flexDirection: rowRtl,
    alignItems: 'center',
    gap: 6,
  },
  moreFiltersText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.primary,
  },
  moreFiltersPanel: {
    gap: spacing.md,
    paddingTop: spacing.sm,
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
  deletedText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'right',
  },
  deletedTextOn: {
    color: colors.primary,
  },
  resetText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'right',
  },
  loader: {
    marginVertical: spacing.lg,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 2,
  },
  studentRow: {
    flexDirection: rowRtl,
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
    writingDirection: 'rtl',
  },
  studentRowMuted: {
    opacity: 0.5,
  },
  studentRowPressed: {
    opacity: 0.72,
  },
  studentMain: {
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
  studentClass: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'right',
  },
  studentCode: {
    fontFamily: fonts.medium,
    color: colors.textMuted,
  },
  studentTrailing: {
    flexDirection: rowRtl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusText: {
    fontFamily: fonts.medium,
    fontSize: 12,
  },
  statusActive: {
    color: colors.success,
  },
  statusSuspended: {
    color: colors.warning,
  },
  statusArchived: {
    color: colors.textMuted,
  },
  pagination: {
    flexDirection: rowRtl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    marginTop: spacing['2xl'],
    marginBottom: spacing.lg,
  },
  pageText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.textSecondary,
    minWidth: 48,
    textAlign: 'center',
  },
  formScroll: { maxHeight: 420 },
  form: { gap: spacing.md, paddingBottom: spacing.sm },
  sectionTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: colors.text,
    textAlign: 'right',
    marginTop: spacing.sm,
  },
  hint: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'right',
  },
  parentHits: { gap: spacing.sm },
  parentHit: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    backgroundColor: colors.background,
    gap: 2,
  },
  parentHitOn: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  parentHitName: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: colors.text,
    textAlign: 'right',
  },
  parentHitMeta: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'right',
  },
  accessBox: { gap: spacing.md },
  accessStudent: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.text,
    textAlign: 'right',
  },
  codeRow: {
    flexDirection: rowRtl,
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.background,
  },
  codeTextWrap: { flex: 1, minWidth: 0, gap: 2 },
  codeLabel: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'right',
  },
  codeValue: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
    color: colors.text,
    textAlign: 'right',
    letterSpacing: 1,
  },
  copyHint: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.primary,
  },
  detailBadges: {
    flexDirection: rowRtl,
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  actionsGrid: {
    flexDirection: rowRtl,
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
