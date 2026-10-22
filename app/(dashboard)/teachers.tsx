import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppModal, Avatar, Input, useToast } from '@/components/ui';
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
  createTeacher,
  deleteTeacher,
  listTeachers,
  updateTeacher,
} from '@/api/teachers';
import { listSubjects } from '@/api/subjects';
import { ApiError } from '@/api/client';
import type { SchoolTeacher } from '@/types/teachers';
import type { SchoolSubject } from '@/types/subjects';
import { colors, spacing } from '@/theme/tokens';

const PAGE_SIZE = 20;

type FormMode = 'create' | 'edit';

const emptyForm = {
  name: '',
  email: '',
  password: '',
  confirm_password: '',
  subject_id: null as number | null,
  is_active: true,
};

function subjectLabel(s: SchoolSubject) {
  return s.code ? `${s.name} (${s.code})` : s.name;
}

export default function SchoolTeachersPage() {
  const { showToast } = useToast();

  const [teachers, setTeachers] = useState<SchoolTeacher[]>([]);
  const [subjects, setSubjects] = useState<SchoolSubject[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [subjectFilter, setSubjectFilter] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all');
  const [saving, setSaving] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>('create');
  const [editing, setEditing] = useState<SchoolTeacher | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<SchoolTeacher | null>(null);
  const [deleting, setDeleting] = useState(false);

  const isActiveParam = activeFilterToParam(activeFilter);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const loadSubjects = useCallback(async () => {
    try {
      const data = await listSubjects({ limit: 200, skip: 0, is_active: true });
      setSubjects(data.subjects);
    } catch {
      // non-blocking
    }
  }, []);

  const load = useCallback(
    async (opts?: { soft?: boolean }) => {
      if (!opts?.soft) setLoading(true);
      try {
        const data = await listTeachers({
          subject_id: subjectFilter ?? undefined,
          search: search.trim() || undefined,
          limit: PAGE_SIZE,
          skip: page * PAGE_SIZE,
          is_active: isActiveParam,
          include_deleted: includeDeleted,
        });
        setTeachers(data.teachers);
        setTotal(data.total);
      } catch (err) {
        showToast(err instanceof ApiError ? err.message : 'تعذر تحميل المدرسين', 'danger');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [search, page, includeDeleted, isActiveParam, subjectFilter, showToast],
  );

  useEffect(() => {
    loadSubjects();
  }, [loadSubjects]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    if (subjects.length === 0) {
      showToast('أضف مادة دراسية أولاً', 'info');
      return;
    }
    setFormMode('create');
    setEditing(null);
    setForm({
      ...emptyForm,
      subject_id: subjectFilter ?? subjects[0]?.id ?? null,
    });
    setFormError('');
    setFormOpen(true);
  };

  const openEdit = (teacher: SchoolTeacher) => {
    if (teacher.deleted_at) return;
    setFormMode('edit');
    setEditing(teacher);
    setForm({
      name: teacher.name,
      email: teacher.email,
      password: '',
      confirm_password: '',
      subject_id: teacher.subject_id,
      is_active: teacher.is_active,
    });
    setFormError('');
    setFormOpen(true);
  };

  const validatePasswords = (required: boolean) => {
    const pwd = form.password;
    const confirm = form.confirm_password;
    if (!required && !pwd && !confirm) return null;
    if (required && !pwd) return 'كلمة المرور مطلوبة';
    if (pwd.length > 0 && pwd.length < 6) return 'كلمة المرور 6 أحرف على الأقل';
    if (pwd !== confirm) return 'تأكيد كلمة المرور غير متطابق';
    return null;
  };

  const onSave = async () => {
    const name = form.name.trim();
    const email = form.email.trim();
    if (!name) {
      setFormError('اسم المدرس مطلوب');
      return;
    }
    if (!email) {
      setFormError('البريد الإلكتروني مطلوب');
      return;
    }
    if (!form.subject_id) {
      setFormError('اختر المادة');
      return;
    }

    const pwdErr = validatePasswords(formMode === 'create');
    if (pwdErr) {
      setFormError(pwdErr);
      return;
    }

    setSaving(true);
    setFormError('');
    try {
      if (formMode === 'create') {
        await createTeacher({
          name,
          email,
          password: form.password,
          confirm_password: form.confirm_password,
          subject_id: form.subject_id,
        });
        showToast('تم إنشاء حساب المدرس', 'success');
      } else if (editing) {
        const body: Parameters<typeof updateTeacher>[1] = {
          name,
          email,
          subject_id: form.subject_id,
          is_active: form.is_active,
        };
        if (form.password.trim()) {
          body.password = form.password;
          body.confirm_password = form.confirm_password;
        }
        await updateTeacher(editing.id, body);
        showToast('تم تحديث بيانات المدرس', 'success');
      }
      setFormOpen(false);
      load({ soft: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setFormError('البريد مستخدم مسبقاً');
      } else if (err instanceof ApiError && err.status === 404) {
        setFormError('المادة غير موجودة في مدرستك');
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
      await deleteTeacher(deleteTarget.id);
      showToast('تم تعطيل المدرس', 'success');
      setDeleteTarget(null);
      load({ soft: true });
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'فشل الحذف', 'danger');
    } finally {
      setDeleting(false);
    }
  };

  const toggleActive = async (teacher: SchoolTeacher) => {
    if (teacher.deleted_at) return;
    try {
      await updateTeacher(teacher.id, { is_active: !teacher.is_active });
      load({ soft: true });
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'فشل التحديث', 'danger');
    }
  };

  return (
    <>
      <AdminListLayout
        title="إدارة المدرسين"
        total={total}
        page={page}
        totalPages={totalPages}
        createLabel="مدرس جديد"
        onCreate={openCreate}
        search={search}
        onSearchChange={(v) => {
          setPage(0);
          setSearch(v);
        }}
        searchPlaceholder="بحث بالاسم أو الإيميل أو المادة..."
        activeFilter={activeFilter}
        onActiveFilterChange={(v) => {
          setPage(0);
          setActiveFilter(v);
        }}
        pills={subjects.map((s) => ({ id: s.id, label: s.name }))}
        pillValue={subjectFilter}
        onPillChange={(id) => {
          setPage(0);
          setSubjectFilter(id);
        }}
        pillsAllLabel="كل المواد"
        includeDeleted={includeDeleted}
        onToggleDeleted={() => {
          setPage(0);
          setIncludeDeleted((v) => !v);
        }}
        deletedLabel="إظهار المحذوفين"
        deletedLabelActive="إخفاء المحذوفين"
        loading={loading}
        refreshing={refreshing}
        onRefresh={() => {
          setRefreshing(true);
          load({ soft: true });
        }}
        data={teachers}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <EntityRow
            title={item.name}
            subtitle={item.email}
            meta={
              item.subject_code
                ? `${item.subject_name} · ${item.subject_code}`
                : item.subject_name
            }
            leading={<Avatar name={item.name} color={colors.primary} size={44} />}
            status={entityStatus(item)}
            onPress={() => openEdit(item)}
            onEdit={() => openEdit(item)}
            onToggleActive={() => toggleActive(item)}
            onDelete={() => setDeleteTarget(item)}
          />
        )}
        emptyTitle="لا يوجد مدرسون"
        emptyDescription={
          subjects.length === 0
            ? 'أضف مواداً دراسية أولاً ثم أنشئ حسابات المدرسين'
            : 'أنشئ حساب مدرس مربوطاً بمادة'
        }
        emptyIcon="Users"
        emptyActionLabel={subjects.length === 0 ? undefined : 'مدرس جديد'}
        onEmptyAction={subjects.length === 0 ? undefined : openCreate}
        onPageChange={setPage}
      />

      <AppModal
        visible={formOpen}
        title={formMode === 'create' ? 'مدرس جديد' : 'تعديل المدرس'}
        description={
          formMode === 'create'
            ? 'يُنشأ حساب teacher يمكنه تسجيل الدخول بالإيميل وكلمة المرور.'
            : 'اترك كلمة المرور فارغة إن لم تتغير.'
        }
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
            placeholder="أ. محمد"
          />
          <Input
            label="البريد الإلكتروني"
            value={form.email}
            onChangeText={(email) => setForm((f) => ({ ...f, email }))}
            placeholder="teacher@school.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <FormLabel>المادة</FormLabel>
          <ChipSelect
            required
            options={subjects.map((s) => ({ id: s.id, label: subjectLabel(s) }))}
            value={form.subject_id}
            onChange={(next) =>
              setForm((f) => ({
                ...f,
                subject_id: typeof next === 'number' ? next : null,
              }))
            }
            emptyHint="لا توجد مواد — أضفها من صفحة المواد"
          />
          <Input
            label={formMode === 'create' ? 'كلمة المرور' : 'كلمة مرور جديدة'}
            value={form.password}
            onChangeText={(password) => setForm((f) => ({ ...f, password }))}
            placeholder={formMode === 'edit' ? 'اختياري' : '6 أحرف على الأقل'}
            secureTextEntry
          />
          <Input
            label="تأكيد كلمة المرور"
            value={form.confirm_password}
            onChangeText={(confirm_password) =>
              setForm((f) => ({ ...f, confirm_password }))
            }
            placeholder={formMode === 'edit' ? 'اختياري' : 'أعد الإدخال'}
            secureTextEntry
          />
          {formMode === 'edit' ? (
            <FormSwitch
              label="الحساب مفعّل"
              value={form.is_active}
              onChange={(is_active) => setForm((f) => ({ ...f, is_active }))}
            />
          ) : null}
          <FormError message={formError} />
        </View>
      </AppModal>

      <AppModal
        visible={!!deleteTarget}
        title="تعطيل المدرس؟"
        description={
          deleteTarget
            ? `«${deleteTarget.name}» — حذف منطقي (تعطيل).`
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
    </>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.md },
});
