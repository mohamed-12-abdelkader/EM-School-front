import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  AppModal,
  Button,
  EmptyState,
  Icon,
  Input,
  PageHeader,
  useToast,
} from '@/components/ui';
import {
  FormError,
  FormSwitch,
  SegmentControl,
  activeFilterToParam,
  type ActiveFilter,
} from '@/components/admin';
import {
  createGrade,
  deleteGrade,
  listGrades,
  reorderGrades,
  updateGrade,
} from '@/api/grades';
import { ApiError } from '@/api/client';
import type { SchoolGrade } from '@/types/grades';
import { colors, fonts, spacing } from '@/theme/tokens';

const PAGE_SIZE = 20;

type FormMode = 'create' | 'edit';

const emptyForm = {
  name: '',
  description: '',
  position: '',
  is_active: true,
};

const rtlProps =
  Platform.OS === 'web' ? ({ dir: 'rtl' } as Record<string, string>) : {};

/** Content on the right, actions/status on the left. */
const rowRtl = Platform.OS === 'web' ? 'row' : 'row-reverse';

const ACTIVE_OPTIONS: { key: ActiveFilter; label: string }[] = [
  { key: 'all', label: 'الكل' },
  { key: 'active', label: 'مفعّل' },
  { key: 'inactive', label: 'معطّل' },
];

function GradeRow({
  grade,
  canReorder,
  isFirst,
  isLast,
  onOpen,
  onMoveUp,
  onMoveDown,
}: {
  grade: SchoolGrade;
  canReorder: boolean;
  isFirst: boolean;
  isLast: boolean;
  onOpen: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}) {
  const deleted = !!grade.deleted_at;

  return (
    <Pressable
      onPress={onOpen}
      disabled={deleted}
      style={({ pressed }) => [
        styles.row,
        deleted && styles.rowMuted,
        pressed && !deleted ? styles.rowPressed : null,
      ]}
    >
      {/* With RTL: this block sits on the RIGHT */}
      <View style={styles.rowMain}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {grade.name}
        </Text>
        <Text style={styles.rowMeta} numberOfLines={1}>
          ترتيب {grade.position + 1}
          {grade.description ? ` · ${grade.description}` : ''}
        </Text>
      </View>

      {/* Status / reorder / chevron — LEFT side */}
      <View style={styles.rowTrailing}>
        <Text
          style={[
            styles.statusText,
            grade.is_active && !deleted ? styles.statusOn : styles.statusOff,
          ]}
        >
          {deleted ? 'محذوف' : grade.is_active ? 'مفعّل' : 'معطّل'}
        </Text>

        {canReorder ? (
          <View style={styles.reorder}>
            <Pressable
              hitSlop={8}
              disabled={isFirst}
              onPress={(e) => {
                e.stopPropagation?.();
                onMoveUp?.();
              }}
              style={[styles.iconBtn, isFirst && styles.iconBtnDisabled]}
            >
              <Icon
                name="ChevronUp"
                size={16}
                color={isFirst ? colors.textMuted : colors.textSecondary}
              />
            </Pressable>
            <Pressable
              hitSlop={8}
              disabled={isLast}
              onPress={(e) => {
                e.stopPropagation?.();
                onMoveDown?.();
              }}
              style={[styles.iconBtn, isLast && styles.iconBtnDisabled]}
            >
              <Icon
                name="ChevronDown"
                size={16}
                color={isLast ? colors.textMuted : colors.textSecondary}
              />
            </Pressable>
          </View>
        ) : !deleted ? (
          <Icon name="ChevronLeft" size={18} color={colors.textMuted} />
        ) : null}
      </View>
    </Pressable>
  );
}

export default function SchoolGradesPage() {
  const { showToast } = useToast();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [grades, setGrades] = useState<SchoolGrade[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all');
  const [saving, setSaving] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [moreFilters, setMoreFilters] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>('create');
  const [editing, setEditing] = useState<SchoolGrade | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<SchoolGrade | null>(null);
  const [hardDelete, setHardDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isActiveParam = activeFilterToParam(activeFilter);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const canReorder =
    !search.trim() && activeFilter === 'all' && !includeDeleted && !reordering;

  const extraFiltersCount =
    (includeDeleted ? 1 : 0) + (activeFilter !== 'all' ? 1 : 0);

  const load = useCallback(
    async (opts?: { soft?: boolean }) => {
      if (!opts?.soft) setLoading(true);
      try {
        const data = await listGrades({
          search: search.trim() || undefined,
          limit: PAGE_SIZE,
          skip: page * PAGE_SIZE,
          is_active: isActiveParam,
          include_deleted: includeDeleted,
        });
        setGrades([...data.grades].sort((a, b) => a.position - b.position));
        setTotal(data.total);
      } catch (err) {
        showToast(err instanceof ApiError ? err.message : 'تعذر تحميل الصفوف', 'danger');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [search, page, includeDeleted, isActiveParam, showToast],
  );

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setFormMode('create');
    setEditing(null);
    setForm({ ...emptyForm, position: String(total) });
    setFormError('');
    setFormOpen(true);
  };

  const openEdit = (grade: SchoolGrade) => {
    if (grade.deleted_at) return;
    setFormMode('edit');
    setEditing(grade);
    setForm({
      name: grade.name,
      description: grade.description || '',
      position: String(grade.position),
      is_active: grade.is_active,
    });
    setFormError('');
    setFormOpen(true);
  };

  const onSave = async () => {
    const name = form.name.trim();
    if (!name) {
      setFormError('اسم الصف مطلوب');
      return;
    }
    const positionRaw = form.position.trim();
    const position =
      positionRaw === '' ? undefined : Number.parseInt(positionRaw, 10);
    if (positionRaw !== '' && (Number.isNaN(position!) || position! < 0)) {
      setFormError('الترتيب يجب أن يكون رقماً صحيحاً ≥ 0');
      return;
    }

    setSaving(true);
    setFormError('');
    try {
      if (formMode === 'create') {
        await createGrade({
          name,
          description: form.description.trim() || undefined,
          position,
          is_active: form.is_active,
        });
        showToast('تم إنشاء الصف', 'success');
      } else if (editing) {
        await updateGrade(editing.id, {
          name,
          description: form.description.trim() || null,
          position,
          is_active: form.is_active,
        });
        showToast('تم تحديث الصف', 'success');
      }
      setFormOpen(false);
      load({ soft: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setFormError('يوجد صف بنفس الاسم');
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
      await deleteGrade(deleteTarget.id, hardDelete);
      showToast(hardDelete ? 'تم الحذف النهائي' : 'تم تعطيل الصف', 'success');
      setDeleteTarget(null);
      setHardDelete(false);
      load({ soft: true });
    } catch (err) {
      const msg =
        err instanceof ApiError && err.status === 409
          ? 'لا يمكن الحذف النهائي: الصف مرتبط ببيانات أخرى'
          : err instanceof ApiError
            ? err.message
            : 'فشل الحذف';
      showToast(msg, 'danger');
    } finally {
      setDeleting(false);
    }
  };

  const moveGrade = async (grade: SchoolGrade, direction: -1 | 1) => {
    if (!canReorder) return;
    const sorted = [...grades];
    const index = sorted.findIndex((g) => g.id === grade.id);
    const swap = sorted[index + direction];
    if (!swap || index < 0) return;

    const next = [...sorted];
    next[index] = swap;
    next[index + direction] = grade;
    const items = next.map((g, i) => ({ id: g.id, position: i }));

    setReordering(true);
    setGrades(next.map((g, i) => ({ ...g, position: i })));
    try {
      await reorderGrades(items);
      showToast('تم حفظ الترتيب', 'success');
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'فشل إعادة الترتيب', 'danger');
      load({ soft: true });
    } finally {
      setReordering(false);
    }
  };

  const resetExtraFilters = () => {
    setPage(0);
    setActiveFilter('all');
    setIncludeDeleted(false);
  };

  const listHeader = (
    <View style={styles.headerBlock}>
      <PageHeader
        title="الصفوف الدراسية"
        subtitle={`${total} صف`}
        actions={<Button label="صف جديد" icon="Plus" onPress={openCreate} />}
      />

      <View style={styles.toolbar}>
        <Input
          value={search}
          onChangeText={(v) => {
            setPage(0);
            setSearch(v);
          }}
          placeholder="بحث بالاسم أو الوصف..."
          icon="Search"
        />

        <View style={styles.toolbarLinks}>
          <Pressable
            onPress={() => setMoreFilters((v) => !v)}
            style={styles.moreFiltersBtn}
          >
            <Text style={styles.moreFiltersText}>
              {moreFilters ? 'إخفاء الفلاتر' : 'فلاتر الحالة'}
              {extraFiltersCount > 0 && !moreFilters
                ? ` (${extraFiltersCount})`
                : ''}
            </Text>
            <Icon
              name={moreFilters ? 'ChevronUp' : 'ChevronDown'}
              size={16}
              color={colors.primary}
            />
          </Pressable>
          {extraFiltersCount > 0 ? (
            <Pressable onPress={resetExtraFilters}>
              <Text style={styles.resetText}>مسح</Text>
            </Pressable>
          ) : null}
        </View>

        {moreFilters ? (
          <View style={styles.moreFiltersPanel}>
            <SegmentControl
              value={activeFilter}
              options={ACTIVE_OPTIONS}
              onChange={(v) => {
                setPage(0);
                setActiveFilter(v);
              }}
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
                {includeDeleted ? 'إخفاء المحذوفة' : 'إظهار المحذوفة'}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {canReorder ? (
          <Text style={styles.reorderHint}>يمكنك إعادة الترتيب بـ ▲▼</Text>
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
        data={loading ? [] : grades}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item, index }) => (
          <GradeRow
            grade={item}
            canReorder={canReorder}
            isFirst={index === 0}
            isLast={index === grades.length - 1}
            onOpen={() => openEdit(item)}
            onMoveUp={() => moveGrade(item, -1)}
            onMoveDown={() => moveGrade(item, 1)}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={[
          styles.content,
          isMobile && styles.contentMobile,
          grades.length === 0 && !loading ? styles.contentEmpty : null,
        ]}
        ListHeaderComponent={listHeader}
        ListFooterComponent={
          !loading && grades.length > 0 ? (
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
              icon="Layers"
              title="لا توجد صفوف"
              description="أنشئ صفوفاً دراسية لتنظيم الفصول والمواد"
              actionLabel="صف جديد"
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
        title={formMode === 'create' ? 'صف جديد' : 'تعديل الصف'}
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
            placeholder="أولى ثانوي"
          />
          <Input
            label="الوصف"
            value={form.description}
            onChangeText={(description) => setForm((f) => ({ ...f, description }))}
            placeholder="اختياري"
          />
          <Input
            label="الترتيب"
            value={form.position}
            onChangeText={(position) => setForm((f) => ({ ...f, position }))}
            placeholder="تلقائي إن تُرك فارغاً"
            keyboardType="number-pad"
          />
          <FormSwitch
            label="مفعّل"
            value={form.is_active}
            onChange={(is_active) => setForm((f) => ({ ...f, is_active }))}
          />
          {formMode === 'edit' && editing ? (
            <Button
              label="حذف الصف"
              variant="danger"
              size="sm"
              onPress={() => {
                setFormOpen(false);
                setHardDelete(false);
                setDeleteTarget(editing);
              }}
            />
          ) : null}
          <FormError message={formError} />
        </View>
      </AppModal>

      <AppModal
        visible={!!deleteTarget}
        title={hardDelete ? 'حذف نهائي؟' : 'حذف الصف؟'}
        description={
          deleteTarget
            ? hardDelete
              ? `حذف نهائي لـ «${deleteTarget.name}».`
              : `حذف منطقي لـ «${deleteTarget.name}».`
            : undefined
        }
        confirmLabel={deleting ? 'جارٍ...' : hardDelete ? 'حذف نهائي' : 'تعطيل'}
        danger
        onConfirm={() => {
          if (!deleting) onDelete();
        }}
        onClose={() => {
          if (deleting) return;
          setDeleteTarget(null);
          setHardDelete(false);
        }}
      >
        <FormSwitch
          label="حذف نهائي (hard)"
          value={hardDelete}
          onChange={setHardDelete}
        />
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
  reorderHint: {
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
    marginVertical: 2,
  },
  row: {
    flexDirection: rowRtl,
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
    writingDirection: 'rtl',
  },
  rowMuted: {
    opacity: 0.5,
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
  reorder: {
    flexDirection: rowRtl,
    gap: 2,
  },
  iconBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnDisabled: {
    opacity: 0.35,
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
});
