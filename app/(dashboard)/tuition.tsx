import { useCallback, useEffect, useState } from 'react';
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
  Button,
  DateField,
  EmptyState,
  Input,
  PageHeader,
  useToast,
} from '@/components/ui';
import {
  ChipSelect,
  FormError,
  FormLabel,
  FormSwitch,
  SegmentControl,
  activeFilterToParam,
  type ActiveFilter,
} from '@/components/admin';
import {
  assignFeeStructure,
  createFeeCategory,
  createFeeStructure,
  deleteFeeStructure,
  listFeeCategories,
  listFeeStructures,
  updateFeeStructure,
} from '@/api/fees';
import { listGrades } from '@/api/grades';
import { listStudents } from '@/api/students';
import { ApiError } from '@/api/client';
import type { AssignmentScope, FeeCategory, FeeStructure } from '@/types/fees';
import type { SchoolGrade } from '@/types/grades';
import type { SchoolStudent } from '@/types/students';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

const PAGE_SIZE = 20;
const CURRENT_YEAR = '2025/2026';

type TabKey = 'structures' | 'categories';
type FormMode = 'create' | 'edit';

const rtlProps =
  Platform.OS === 'web' ? ({ dir: 'rtl' } as Record<string, string>) : {};
const rowRtl = Platform.OS === 'web' ? 'row' : 'row-reverse';

const TAB_OPTIONS: { key: TabKey; label: string }[] = [
  { key: 'structures', label: 'تعريفات المصروفات' },
  { key: 'categories', label: 'التصنيفات' },
];

const ACTIVE_OPTIONS: { key: ActiveFilter; label: string }[] = [
  { key: 'all', label: 'الكل' },
  { key: 'active', label: 'مفعّل' },
  { key: 'inactive', label: 'معطّل' },
];

const SCOPE_OPTIONS: { value: AssignmentScope; label: string }[] = [
  { value: 'school', label: 'كل المدرسة' },
  { value: 'grade', label: 'صف دراسي' },
  { value: 'students', label: 'طلاب محددون' },
];

const emptyStructureForm = {
  category_id: null as number | null,
  name: '',
  description: '',
  amount: '',
  academic_year: CURRENT_YEAR,
  grade_id: null as number | null,
  is_mandatory: true,
  due_date: '',
  assignment_scope: 'grade' as AssignmentScope,
  is_active: true,
};

function money(v: number | string | null | undefined) {
  const n = Number(v ?? 0);
  if (Number.isNaN(n)) return '—';
  return `${n.toLocaleString('ar-EG', { maximumFractionDigits: 2 })} ج.م`;
}

function scopeLabel(scope: string) {
  if (scope === 'school') return 'كل المدرسة';
  if (scope === 'grade') return 'حسب الصف';
  if (scope === 'students') return 'طلاب محددون';
  return scope;
}

function StructureRow({
  item,
  onOpen,
  onAssign,
}: {
  item: FeeStructure;
  onOpen: () => void;
  onAssign: () => void;
}) {
  return (
    <Pressable
      onPress={onOpen}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={styles.rowMain}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.rowMeta} numberOfLines={2}>
          {money(item.amount)}
          {item.category_name ? ` · ${item.category_name}` : ''}
          {item.grade_name ? ` · ${item.grade_name}` : ''}
          {` · ${item.academic_year}`}
          {` · ${scopeLabel(item.assignment_scope)}`}
          {item.due_date ? ` · استحقاق ${item.due_date}` : ''}
        </Text>
      </View>
      <View style={styles.rowTrailing}>
        <Text
          style={[
            styles.statusText,
            item.is_active ? styles.statusOn : styles.statusOff,
          ]}
        >
          {item.is_active ? 'مفعّل' : 'معطّل'}
        </Text>
        <Pressable
          onPress={(e) => {
            e?.stopPropagation?.();
            onAssign();
          }}
          style={styles.assignBtn}
        >
          <Text style={styles.assignBtnText}>تخصيص</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

export default function TuitionPage() {
  const { showToast } = useToast();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [tab, setTab] = useState<TabKey>('structures');
  const [yearFilter, setYearFilter] = useState(CURRENT_YEAR);
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [structures, setStructures] = useState<FeeStructure[]>([]);
  const [categories, setCategories] = useState<FeeCategory[]>([]);
  const [grades, setGrades] = useState<SchoolGrade[]>([]);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>('create');
  const [editing, setEditing] = useState<FeeStructure | null>(null);
  const [form, setForm] = useState(emptyStructureForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const [catOpen, setCatOpen] = useState(false);
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catError, setCatError] = useState('');
  const [catSaving, setCatSaving] = useState(false);

  const [assignTarget, setAssignTarget] = useState<FeeStructure | null>(null);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentHits, setStudentHits] = useState<SchoolStudent[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState('');
  const [searchingStudents, setSearchingStudents] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<FeeStructure | null>(null);
  const [deleting, setDeleting] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const loadMeta = useCallback(async () => {
    try {
      const [g, c] = await Promise.all([listGrades(), listFeeCategories()]);
      setGrades(g.grades ?? []);
      setCategories(c.categories ?? []);
    } catch {
      /* ignore meta errors on soft refresh */
    }
  }, []);

  const loadStructures = useCallback(
    async ({ soft }: { soft?: boolean } = {}) => {
      if (!soft) setLoading(true);
      try {
        const isActive = activeFilterToParam(activeFilter);
        const data = await listFeeStructures({
          academic_year: yearFilter.trim() || undefined,
          is_active: isActive,
          limit: PAGE_SIZE,
          skip: page * PAGE_SIZE,
        });
        setStructures(data.structures ?? []);
        setTotal(data.total ?? 0);
      } catch (e) {
        const msg =
          e instanceof ApiError ? e.message : 'تعذر تحميل تعريفات المصروفات';
        showToast(msg, 'danger');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [activeFilter, page, showToast, yearFilter],
  );

  const loadCategories = useCallback(
    async ({ soft }: { soft?: boolean } = {}) => {
      if (!soft) setLoading(true);
      try {
        const data = await listFeeCategories();
        setCategories(data.categories ?? []);
        setTotal(data.categories?.length ?? 0);
      } catch (e) {
        const msg = e instanceof ApiError ? e.message : 'تعذر تحميل التصنيفات';
        showToast(msg, 'danger');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [showToast],
  );

  useEffect(() => {
    loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    if (tab === 'structures') loadStructures();
    else loadCategories();
  }, [tab, loadStructures, loadCategories]);

  useEffect(() => {
    if (!assignTarget || assignTarget.assignment_scope !== 'students') return;
    const q = studentSearch.trim();
    if (q.length < 2) {
      setStudentHits([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      setSearchingStudents(true);
      try {
        const data = await listStudents({
          search: q,
          academic_year: assignTarget.academic_year || CURRENT_YEAR,
          limit: 20,
        });
        if (!cancelled) setStudentHits(data.students ?? []);
      } catch {
        if (!cancelled) setStudentHits([]);
      } finally {
        if (!cancelled) setSearchingStudents(false);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [assignTarget, studentSearch]);

  const openCreate = () => {
    setFormMode('create');
    setEditing(null);
    setForm(emptyStructureForm);
    setFormError('');
    setFormOpen(true);
  };

  const openEdit = (item: FeeStructure) => {
    setFormMode('edit');
    setEditing(item);
    setForm({
      category_id: item.category_id,
      name: item.name,
      description: item.description ?? '',
      amount: String(item.amount ?? ''),
      academic_year: item.academic_year,
      grade_id: item.grade_id,
      is_mandatory: item.is_mandatory,
      due_date: item.due_date ?? '',
      assignment_scope: item.assignment_scope,
      is_active: item.is_active,
    });
    setFormError('');
    setFormOpen(true);
  };

  const onSaveStructure = async () => {
    if (!form.name.trim()) {
      setFormError('اسم المصروف مطلوب');
      return;
    }
    const amount = Number(form.amount);
    if (!amount || amount <= 0) {
      setFormError('أدخل مبلغاً صحيحاً أكبر من صفر');
      return;
    }
    if (!form.academic_year.trim()) {
      setFormError('العام الدراسي مطلوب');
      return;
    }
    if (form.assignment_scope === 'grade' && form.grade_id == null) {
      setFormError('اختر الصف عند نطاق «صف دراسي»');
      return;
    }

    setSaving(true);
    setFormError('');
    try {
      if (formMode === 'create') {
        await createFeeStructure({
          category_id: form.category_id,
          name: form.name.trim(),
          description: form.description.trim() || null,
          amount,
          academic_year: form.academic_year.trim(),
          grade_id: form.grade_id,
          is_mandatory: form.is_mandatory,
          due_date: form.due_date.trim() || null,
          assignment_scope: form.assignment_scope,
        });
        showToast('تم إنشاء تعريف المصروف', 'success');
      } else if (editing) {
        await updateFeeStructure(editing.id, {
          name: form.name.trim(),
          description: form.description.trim() || null,
          amount,
          due_date: form.due_date.trim() || null,
          is_mandatory: form.is_mandatory,
          is_active: form.is_active,
          grade_id: form.grade_id,
          assignment_scope: form.assignment_scope,
        });
        showToast('تم تحديث تعريف المصروف', 'success');
      }
      setFormOpen(false);
      loadStructures({ soft: true });
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : 'تعذر الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const onSaveCategory = async () => {
    if (!catName.trim()) {
      setCatError('اسم التصنيف مطلوب');
      return;
    }
    setCatSaving(true);
    setCatError('');
    try {
      await createFeeCategory({
        name: catName.trim(),
        description: catDesc.trim() || null,
      });
      showToast('تم إنشاء التصنيف', 'success');
      setCatOpen(false);
      setCatName('');
      setCatDesc('');
      loadCategories({ soft: true });
      loadMeta();
    } catch (e) {
      setCatError(e instanceof ApiError ? e.message : 'تعذر الحفظ');
    } finally {
      setCatSaving(false);
    }
  };

  const onAssign = async () => {
    if (!assignTarget) return;
    if (
      assignTarget.assignment_scope === 'students' &&
      selectedStudentIds.length === 0
    ) {
      setAssignError('اختر طالباً واحداً على الأقل');
      return;
    }
    setAssigning(true);
    setAssignError('');
    try {
      const res = await assignFeeStructure({
        fee_structure_id: assignTarget.id,
        student_ids:
          assignTarget.assignment_scope === 'students'
            ? selectedStudentIds
            : undefined,
      });
      showToast(res.message || 'تم التخصيص', 'success');
      setAssignTarget(null);
      setSelectedStudentIds([]);
      setStudentSearch('');
      setStudentHits([]);
    } catch (e) {
      setAssignError(e instanceof ApiError ? e.message : 'تعذر التخصيص');
    } finally {
      setAssigning(false);
    }
  };

  const onDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteFeeStructure(deleteTarget.id);
      showToast('تم تعطيل تعريف المصروف', 'success');
      setDeleteTarget(null);
      if (formOpen) setFormOpen(false);
      loadStructures({ soft: true });
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : 'تعذر الحذف', 'danger');
    } finally {
      setDeleting(false);
    }
  };

  const toggleStudent = (id: number) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const listHeader = (
    <View style={styles.headerBlock}>
      <PageHeader
        title="المصروفات الدراسية"
        subtitle={
          tab === 'structures'
            ? `${total} تعريف`
            : `${categories.length} تصنيف`
        }
        actions={
          <Button
            label={tab === 'structures' ? 'تعريف جديد' : 'تصنيف جديد'}
            icon="Plus"
            onPress={() => {
              if (tab === 'structures') openCreate();
              else {
                setCatError('');
                setCatName('');
                setCatDesc('');
                setCatOpen(true);
              }
            }}
          />
        }
      />

      <SegmentControl value={tab} options={TAB_OPTIONS} onChange={setTab} />

      {tab === 'structures' ? (
        <View style={styles.toolbar}>
          <Input
            value={yearFilter}
            onChangeText={(v) => {
              setPage(0);
              setYearFilter(v);
            }}
            placeholder={CURRENT_YEAR}
            icon="Calendar"
          />
          <SegmentControl
            value={activeFilter}
            options={ACTIVE_OPTIONS}
            onChange={(v) => {
              setPage(0);
              setActiveFilter(v);
            }}
          />
        </View>
      ) : null}

      {loading ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : null}
    </View>
  );

  return (
    <View style={styles.root} {...rtlProps}>
      <FlatList
        data={
          loading
            ? []
            : tab === 'structures'
              ? structures
              : categories
        }
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) =>
          tab === 'structures' ? (
            <StructureRow
              item={item as FeeStructure}
              onOpen={() => openEdit(item as FeeStructure)}
              onAssign={() => {
                setAssignTarget(item as FeeStructure);
                setAssignError('');
                setSelectedStudentIds([]);
                setStudentSearch('');
                setStudentHits([]);
              }}
            />
          ) : (
            <View style={styles.row}>
              <View style={styles.rowMain}>
                <Text style={styles.rowTitle}>{(item as FeeCategory).name}</Text>
                <Text style={styles.rowMeta} numberOfLines={2}>
                  {(item as FeeCategory).description || 'بدون وصف'}
                </Text>
              </View>
              <Text
                style={[
                  styles.statusText,
                  (item as FeeCategory).is_active
                    ? styles.statusOn
                    : styles.statusOff,
                ]}
              >
                {(item as FeeCategory).is_active ? 'مفعّل' : 'معطّل'}
              </Text>
            </View>
          )
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={[
          styles.content,
          isMobile && styles.contentMobile,
          (tab === 'structures' ? structures : categories).length === 0 &&
          !loading
            ? styles.contentEmpty
            : null,
        ]}
        ListHeaderComponent={listHeader}
        ListFooterComponent={
          tab === 'structures' && !loading && structures.length > 0 ? (
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
              icon="Wallet"
              title={
                tab === 'structures'
                  ? 'لا توجد تعريفات مصروفات'
                  : 'لا توجد تصنيفات'
              }
              description={
                tab === 'structures'
                  ? 'أنشئ تعريفاً للمصروفات ثم خصّصه للطلاب أو الصف'
                  : 'أضف تصنيفات لتنظيم أنواع المصروفات'
              }
              actionLabel={tab === 'structures' ? 'تعريف جديد' : 'تصنيف جديد'}
              onAction={() => {
                if (tab === 'structures') openCreate();
                else setCatOpen(true);
              }}
            />
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              if (tab === 'structures') loadStructures({ soft: true });
              else loadCategories({ soft: true });
              loadMeta();
            }}
            tintColor={colors.primary}
          />
        }
      />

      <AppModal
        visible={formOpen}
        title={formMode === 'create' ? 'تعريف مصروف جديد' : 'تعديل التعريف'}
        description="يُستخدم التعريف لتخصيص المصروفات على الصف أو المدرسة أو طلاب محددين."
        confirmLabel={saving ? 'جارٍ الحفظ...' : 'حفظ'}
        onConfirm={() => {
          if (!saving) onSaveStructure();
        }}
        onClose={() => {
          if (!saving) setFormOpen(false);
        }}
      >
        <ScrollView style={styles.formScroll} keyboardShouldPersistTaps="handled">
          <View style={styles.form}>
            <FormLabel>الاسم</FormLabel>
            <Input
              value={form.name}
              onChangeText={(name) => setForm((f) => ({ ...f, name }))}
              placeholder="المصروفات الدراسية"
            />
            <FormLabel>المبلغ</FormLabel>
            <Input
              value={form.amount}
              onChangeText={(amount) => setForm((f) => ({ ...f, amount }))}
              placeholder="15000"
              keyboardType="decimal-pad"
            />
            <FormLabel>العام الدراسي</FormLabel>
            <Input
              value={form.academic_year}
              onChangeText={(academic_year) =>
                setForm((f) => ({ ...f, academic_year }))
              }
              placeholder={CURRENT_YEAR}
              editable={formMode === 'create'}
            />
            <FormLabel>التصنيف</FormLabel>
            <ChipSelect
              options={[
                { id: 0, label: 'بدون' },
                ...categories.map((c) => ({ id: c.id, label: c.name })),
              ]}
              value={form.category_id ?? 0}
              onChange={(next) =>
                setForm((f) => ({
                  ...f,
                  category_id:
                    typeof next === 'number' && next !== 0 ? next : null,
                }))
              }
            />
            <FormLabel>نطاق التخصيص</FormLabel>
            <ChipSelect
              required
              options={SCOPE_OPTIONS.map((s) => ({
                id: s.value,
                label: s.label,
              }))}
              value={form.assignment_scope}
              onChange={(next) => {
                if (typeof next !== 'string') return;
                setForm((f) => ({
                  ...f,
                  assignment_scope: next as AssignmentScope,
                }));
              }}
            />
            {form.assignment_scope === 'grade' || form.grade_id != null ? (
              <>
                <FormLabel>الصف</FormLabel>
                <ChipSelect
                  required
                  options={grades.map((g) => ({ id: g.id, label: g.name }))}
                  value={form.grade_id}
                  onChange={(next) =>
                    setForm((f) => ({
                      ...f,
                      grade_id: typeof next === 'number' ? next : null,
                    }))
                  }
                />
              </>
            ) : null}
            <DateField
              label="تاريخ الاستحقاق (اختياري)"
              value={form.due_date}
              onChange={(due_date) => setForm((f) => ({ ...f, due_date }))}
              clearable
              placeholder="اختر تاريخ الاستحقاق"
            />
            <FormLabel>الوصف</FormLabel>
            <Input
              value={form.description}
              onChangeText={(description) =>
                setForm((f) => ({ ...f, description }))
              }
              placeholder="اختياري"
            />
            <FormSwitch
              label="إلزامي"
              value={form.is_mandatory}
              onChange={(is_mandatory) =>
                setForm((f) => ({ ...f, is_mandatory }))
              }
            />
            {formMode === 'edit' ? (
              <FormSwitch
                label="مفعّل"
                value={form.is_active}
                onChange={(is_active) => setForm((f) => ({ ...f, is_active }))}
              />
            ) : null}
            {formMode === 'edit' && editing ? (
              <Button
                label="تعطيل التعريف"
                variant="danger"
                onPress={() => {
                  setFormOpen(false);
                  setDeleteTarget(editing);
                }}
              />
            ) : null}
            <FormError message={formError} />
          </View>
        </ScrollView>
      </AppModal>

      <AppModal
        visible={catOpen}
        title="تصنيف جديد"
        confirmLabel={catSaving ? 'جارٍ...' : 'حفظ'}
        onConfirm={() => {
          if (!catSaving) onSaveCategory();
        }}
        onClose={() => {
          if (!catSaving) setCatOpen(false);
        }}
      >
        <View style={styles.form}>
          <FormLabel>الاسم</FormLabel>
          <Input
            value={catName}
            onChangeText={setCatName}
            placeholder="رسوم دراسية"
          />
          <FormLabel>الوصف</FormLabel>
          <Input
            value={catDesc}
            onChangeText={setCatDesc}
            placeholder="اختياري"
          />
          <FormError message={catError} />
        </View>
      </AppModal>

      <AppModal
        visible={!!assignTarget}
        title="تخصيص المصروف"
        description={
          assignTarget
            ? assignTarget.assignment_scope === 'students'
              ? 'ابحث واختر الطلاب ثم أكّد التخصيص.'
              : assignTarget.assignment_scope === 'grade'
                ? `سيُطبَّق على طلاب صف «${assignTarget.grade_name || '—'}» للعام ${assignTarget.academic_year}.`
                : `سيُطبَّق على كل طلاب المدرسة للعام ${assignTarget.academic_year}.`
            : undefined
        }
        confirmLabel={assigning ? 'جارٍ...' : 'تخصيص'}
        onConfirm={() => {
          if (!assigning) onAssign();
        }}
        onClose={() => {
          if (!assigning) setAssignTarget(null);
        }}
      >
        <View style={styles.form}>
          {assignTarget ? (
            <Text style={styles.assignSummary}>
              {assignTarget.name} · {money(assignTarget.amount)}
            </Text>
          ) : null}
          {assignTarget?.assignment_scope === 'students' ? (
            <>
              <FormLabel>بحث الطلاب</FormLabel>
              <Input
                value={studentSearch}
                onChangeText={setStudentSearch}
                placeholder="اسم الطالب..."
                icon="Search"
              />
              {searchingStudents ? (
                <ActivityIndicator color={colors.primary} />
              ) : null}
              {studentHits.map((s) => {
                const on = selectedStudentIds.includes(s.id);
                return (
                  <Pressable
                    key={s.id}
                    onPress={() => toggleStudent(s.id)}
                    style={[styles.studentHit, on && styles.studentHitOn]}
                  >
                    <Text style={styles.studentHitTitle}>{s.name}</Text>
                    <Text style={styles.studentHitMeta}>
                      {s.grade_name} · {s.classroom_name}
                    </Text>
                  </Pressable>
                );
              })}
              {selectedStudentIds.length > 0 ? (
                <Text style={styles.selectedCount}>
                  محدد: {selectedStudentIds.length}
                </Text>
              ) : null}
            </>
          ) : null}
          <FormError message={assignError} />
        </View>
      </AppModal>

      <AppModal
        visible={!!deleteTarget}
        title="تعطيل التعريف؟"
        description={
          deleteTarget
            ? `سيتم إيقاف «${deleteTarget.name}» (حذف منطقي).`
            : undefined
        }
        confirmLabel={deleting ? 'جارٍ...' : 'تعطيل'}
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
  loader: {
    marginVertical: spacing.lg,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 2,
  },
  row: {
    flexDirection: rowRtl,
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
    writingDirection: 'rtl',
  },
  rowPressed: {
    opacity: 0.72,
  },
  rowMain: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  rowTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 15,
    color: colors.text,
    textAlign: 'right',
  },
  rowMeta: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'right',
  },
  rowTrailing: {
    flexDirection: rowRtl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusText: {
    fontFamily: fonts.medium,
    fontSize: 12,
  },
  statusOn: {
    color: colors.success,
  },
  statusOff: {
    color: colors.textMuted,
  },
  assignBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.md,
    backgroundColor: colors.primarySoft,
  },
  assignBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    color: colors.primaryDark,
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
  form: { gap: spacing.md },
  formScroll: { maxHeight: 420 },
  assignSummary: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: colors.text,
    textAlign: 'right',
  },
  studentHit: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    gap: 2,
  },
  studentHitOn: {
    backgroundColor: colors.primarySoft,
  },
  studentHitTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: colors.text,
    textAlign: 'right',
  },
  studentHitMeta: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'right',
  },
  selectedCount: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.primary,
    textAlign: 'right',
  },
});
