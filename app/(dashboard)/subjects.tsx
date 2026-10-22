import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppModal, Input, useToast } from '@/components/ui';
import {
  AdminListLayout,
  ChipSelect,
  EntityRow,
  FormError,
  FormLabel,
  FormSwitch,
  activeFilterToParam,
  entityStatus,
  type ActiveFilter,
} from '@/components/admin';
import {
  createSubject,
  deleteSubject,
  listSubjects,
  updateSubject,
} from '@/api/subjects';
import { listGrades } from '@/api/grades';
import { ApiError } from '@/api/client';
import type { SchoolSubject } from '@/types/subjects';
import type { SchoolGrade } from '@/types/grades';
import { spacing } from '@/theme/tokens';

const PAGE_SIZE = 20;

type FormMode = 'create' | 'edit';

const emptyForm = {
  name: '',
  code: '',
  description: '',
  grade_ids: [] as number[],
  is_active: true,
};

export default function SchoolSubjectsPage() {
  const { showToast } = useToast();

  const [subjects, setSubjects] = useState<SchoolSubject[]>([]);
  const [grades, setGrades] = useState<SchoolGrade[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [gradeFilter, setGradeFilter] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all');
  const [saving, setSaving] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>('create');
  const [editing, setEditing] = useState<SchoolSubject | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<SchoolSubject | null>(null);
  const [deleting, setDeleting] = useState(false);

  const isActiveParam = activeFilterToParam(activeFilter);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const loadGradesOptions = useCallback(async () => {
    try {
      const data = await listGrades({ limit: 200, skip: 0, is_active: true });
      setGrades([...data.grades].sort((a, b) => a.position - b.position));
    } catch {
      // non-blocking
    }
  }, []);

  const load = useCallback(
    async (opts?: { soft?: boolean }) => {
      if (!opts?.soft) setLoading(true);
      try {
        const data = await listSubjects({
          grade_id: gradeFilter ?? undefined,
          search: search.trim() || undefined,
          limit: PAGE_SIZE,
          skip: page * PAGE_SIZE,
          is_active: isActiveParam,
          include_deleted: includeDeleted,
        });
        setSubjects([...data.subjects].sort((a, b) => a.position - b.position));
        setTotal(data.total);
      } catch (err) {
        showToast(err instanceof ApiError ? err.message : 'تعذر تحميل المواد', 'danger');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [search, page, includeDeleted, isActiveParam, gradeFilter, showToast],
  );

  useEffect(() => {
    loadGradesOptions();
  }, [loadGradesOptions]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setFormMode('create');
    setEditing(null);
    setForm({
      ...emptyForm,
      grade_ids: gradeFilter != null ? [gradeFilter] : [],
    });
    setFormError('');
    setFormOpen(true);
  };

  const openEdit = (subject: SchoolSubject) => {
    if (subject.deleted_at) return;
    setFormMode('edit');
    setEditing(subject);
    setForm({
      name: subject.name,
      code: subject.code || '',
      description: subject.description || '',
      grade_ids: subject.grades.map((g) => g.id),
      is_active: subject.is_active,
    });
    setFormError('');
    setFormOpen(true);
  };

  const onSave = async () => {
    const name = form.name.trim();
    if (!name) {
      setFormError('اسم المادة مطلوب');
      return;
    }

    setSaving(true);
    setFormError('');
    try {
      if (formMode === 'create') {
        await createSubject({
          name,
          code: form.code.trim() || undefined,
          description: form.description.trim() || undefined,
          grade_ids: form.grade_ids.length ? form.grade_ids : undefined,
          is_active: form.is_active,
        });
        showToast('تم إنشاء المادة', 'success');
      } else if (editing) {
        await updateSubject(editing.id, {
          name,
          code: form.code.trim() === '' ? null : form.code.trim(),
          description: form.description.trim() || null,
          grade_ids: form.grade_ids,
          is_active: form.is_active,
        });
        showToast('تم تحديث المادة', 'success');
      }
      setFormOpen(false);
      load({ soft: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setFormError('اسم أو كود مكرر');
      } else if (err instanceof ApiError && err.status === 404) {
        setFormError('صف غير موجود في مدرستك');
      } else {
        setFormError(err instanceof ApiError ? err.message : 'فشل الحفظ');
      }
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteSubject(deleteTarget.id);
      showToast('تم حذف المادة', 'success');
      setDeleteTarget(null);
      load({ soft: true });
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'فشل الحذف', 'danger');
    } finally {
      setDeleting(false);
    }
  };

  const toggleActive = async (subject: SchoolSubject) => {
    if (subject.deleted_at) return;
    try {
      await updateSubject(subject.id, { is_active: !subject.is_active });
      load({ soft: true });
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'فشل التحديث', 'danger');
    }
  };

  return (
    <>
      <AdminListLayout
        title="المواد الدراسية"
        total={total}
        page={page}
        totalPages={totalPages}
        createLabel="مادة جديدة"
        onCreate={openCreate}
        search={search}
        onSearchChange={(v) => {
          setPage(0);
          setSearch(v);
        }}
        searchPlaceholder="بحث بالاسم أو الكود..."
        activeFilter={activeFilter}
        onActiveFilterChange={(v) => {
          setPage(0);
          setActiveFilter(v);
        }}
        pills={grades.map((g) => ({ id: g.id, label: g.name }))}
        pillValue={gradeFilter}
        onPillChange={(id) => {
          setPage(0);
          setGradeFilter(id);
        }}
        pillsAllLabel="كل الصفوف"
        includeDeleted={includeDeleted}
        onToggleDeleted={() => {
          setPage(0);
          setIncludeDeleted((v) => !v);
        }}
        deletedLabel="إظهار المحذوفة"
        deletedLabelActive="إخفاء المحذوفة"
        loading={loading}
        refreshing={refreshing}
        onRefresh={() => {
          setRefreshing(true);
          load({ soft: true });
        }}
        data={subjects}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <EntityRow
            title={item.name}
            subtitle={
              item.grades.length > 0
                ? item.grades.map((g) => g.name).join(' · ')
                : 'بدون صفوف'
            }
            meta={item.description || undefined}
            badge={item.code || undefined}
            status={entityStatus(item)}
            onPress={() => openEdit(item)}
            onEdit={() => openEdit(item)}
            onToggleActive={() => toggleActive(item)}
            onDelete={() => setDeleteTarget(item)}
          />
        )}
        emptyTitle="لا توجد مواد"
        emptyDescription="أنشئ مادة واربطها بالصفوف الدراسية"
        emptyIcon="BookOpen"
        emptyActionLabel="مادة جديدة"
        onEmptyAction={openCreate}
        onPageChange={setPage}
      />

      <AppModal
        visible={formOpen}
        title={formMode === 'create' ? 'مادة جديدة' : 'تعديل المادة'}
        confirmLabel={saving ? 'جارٍ الحفظ...' : 'حفظ'}
        onConfirm={() => {
          if (!saving) onSave();
        }}
        onClose={() => {
          if (!saving) setFormOpen(false);
        }}
      >
        <View style={styles.form}>
          <Input
            label="الاسم"
            value={form.name}
            onChangeText={(name) => setForm((f) => ({ ...f, name }))}
            placeholder="رياضيات"
          />
          <Input
            label="الكود"
            value={form.code}
            onChangeText={(code) => setForm((f) => ({ ...f, code }))}
            placeholder="MATH"
            autoCapitalize="characters"
          />
          <Input
            label="الوصف"
            value={form.description}
            onChangeText={(description) => setForm((f) => ({ ...f, description }))}
            placeholder="اختياري"
          />
          <FormLabel>الصفوف</FormLabel>
          <ChipSelect
            multiple
            options={grades.map((g) => ({ id: g.id, label: g.name }))}
            value={form.grade_ids}
            onChange={(next) =>
              setForm((f) => ({
                ...f,
                grade_ids: Array.isArray(next) ? next : [],
              }))
            }
            emptyHint="أضف صفوفاً من صفحة الصفوف أولاً"
          />
          <FormSwitch
            label="مفعّلة"
            value={form.is_active}
            onChange={(is_active) => setForm((f) => ({ ...f, is_active }))}
          />
          <FormError message={formError} />
        </View>
      </AppModal>

      <AppModal
        visible={!!deleteTarget}
        title="حذف المادة؟"
        description={
          deleteTarget ? `«${deleteTarget.name}» — حذف منطقي (تعطيل).` : undefined
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
    </>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.md },
});
