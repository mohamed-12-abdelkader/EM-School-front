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
  FormSwitch,
  SegmentControl,
  activeFilterToParam,
  type ActiveFilter,
} from '@/components/admin';
import {
  createClassroom,
  deleteClassroom,
  listClassrooms,
  reorderClassrooms,
  updateClassroom,
} from '@/api/classrooms';
import { listGrades } from '@/api/grades';
import { ApiError } from '@/api/client';
import type { SchoolClassroom } from '@/types/classrooms';
import type { SchoolGrade } from '@/types/grades';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

const PAGE_SIZE = 20;

type FormMode = 'create' | 'edit';

const emptyForm = {
  grade_id: null as number | null,
  name: '',
  description: '',
  capacity: '',
  position: '',
  is_active: true,
};

const rtlProps =
  Platform.OS === 'web' ? ({ dir: 'rtl' } as Record<string, string>) : {};

const rowRtl = Platform.OS === 'web' ? 'row' : 'row-reverse';

const ACTIVE_OPTIONS: { key: ActiveFilter; label: string }[] = [
  { key: 'all', label: 'الكل' },
  { key: 'active', label: 'مفعّل' },
  { key: 'inactive', label: 'معطّل' },
];

function ClassroomRow({
  room,
  canReorder,
  isFirst,
  isLast,
  onOpen,
  onMoveUp,
  onMoveDown,
}: {
  room: SchoolClassroom;
  canReorder: boolean;
  isFirst: boolean;
  isLast: boolean;
  onOpen: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}) {
  const deleted = !!room.deleted_at;

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
      <View style={styles.rowMain}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {room.name}
        </Text>
        <Text style={styles.rowMeta} numberOfLines={1}>
          {room.grade_name}
          {room.capacity != null ? ` · سعة ${room.capacity}` : ''}
          {room.description ? ` · ${room.description}` : ''}
        </Text>
      </View>

      <View style={styles.rowTrailing}>
        <Text
          style={[
            styles.statusText,
            room.is_active && !deleted ? styles.statusOn : styles.statusOff,
          ]}
        >
          {deleted ? 'محذوف' : room.is_active ? 'مفعّل' : 'معطّل'}
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

export default function SchoolClassroomsPage() {
  const { showToast } = useToast();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [classrooms, setClassrooms] = useState<SchoolClassroom[]>([]);
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
  const [reordering, setReordering] = useState(false);
  const [moreFilters, setMoreFilters] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>('create');
  const [editing, setEditing] = useState<SchoolClassroom | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<SchoolClassroom | null>(null);
  const [hardDelete, setHardDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isActiveParam = activeFilterToParam(activeFilter);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const canReorder =
    gradeFilter != null &&
    !search.trim() &&
    activeFilter === 'all' &&
    !includeDeleted &&
    !reordering;

  const extraFiltersCount =
    (includeDeleted ? 1 : 0) + (activeFilter !== 'all' ? 1 : 0);

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
        const data = await listClassrooms({
          grade_id: gradeFilter ?? undefined,
          search: search.trim() || undefined,
          limit: PAGE_SIZE,
          skip: page * PAGE_SIZE,
          is_active: isActiveParam,
          include_deleted: includeDeleted,
        });
        setClassrooms(
          [...data.classrooms].sort((a, b) => a.position - b.position),
        );
        setTotal(data.total);
      } catch (err) {
        showToast(err instanceof ApiError ? err.message : 'تعذر تحميل الفصول', 'danger');
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
    if (grades.length === 0) {
      showToast('أضف صفاً دراسياً أولاً', 'info');
      return;
    }
    setFormMode('create');
    setEditing(null);
    setForm({
      ...emptyForm,
      grade_id: gradeFilter ?? grades[0]?.id ?? null,
      position: String(total),
    });
    setFormError('');
    setFormOpen(true);
  };

  const openEdit = (room: SchoolClassroom) => {
    if (room.deleted_at) return;
    setFormMode('edit');
    setEditing(room);
    setForm({
      grade_id: room.grade_id,
      name: room.name,
      description: room.description || '',
      capacity: room.capacity == null ? '' : String(room.capacity),
      position: String(room.position),
      is_active: room.is_active,
    });
    setFormError('');
    setFormOpen(true);
  };

  const parseOptionalInt = (raw: string, label: string) => {
    const trimmed = raw.trim();
    if (trimmed === '') return { ok: true as const, value: undefined };
    const n = Number.parseInt(trimmed, 10);
    if (Number.isNaN(n) || n < 0) {
      return { ok: false as const, error: `${label} يجب أن يكون رقماً صحيحاً ≥ 0` };
    }
    return { ok: true as const, value: n };
  };

  const onSave = async () => {
    const name = form.name.trim();
    if (!form.grade_id) {
      setFormError('اختر الصف الدراسي');
      return;
    }
    if (!name) {
      setFormError('اسم الفصل مطلوب');
      return;
    }

    const position = parseOptionalInt(form.position, 'الترتيب');
    if (!position.ok) {
      setFormError(position.error);
      return;
    }

    const capacityRaw = form.capacity.trim();
    let capacity: number | null | undefined;
    if (formMode === 'edit' && capacityRaw === '') {
      capacity = null;
    } else if (capacityRaw !== '') {
      const cap = parseOptionalInt(form.capacity, 'السعة');
      if (!cap.ok) {
        setFormError(cap.error);
        return;
      }
      capacity = cap.value;
    }

    setSaving(true);
    setFormError('');
    try {
      if (formMode === 'create') {
        await createClassroom({
          grade_id: form.grade_id,
          name,
          description: form.description.trim() || undefined,
          capacity,
          position: position.value,
          is_active: form.is_active,
        });
        showToast('تم إنشاء الفصل', 'success');
      } else if (editing) {
        await updateClassroom(editing.id, {
          grade_id: form.grade_id,
          name,
          description: form.description.trim() || null,
          capacity,
          position: position.value,
          is_active: form.is_active,
        });
        showToast('تم تحديث الفصل', 'success');
      }
      setFormOpen(false);
      load({ soft: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setFormError('اسم الفصل مكرر داخل هذا الصف');
      } else if (err instanceof ApiError && err.status === 404) {
        setFormError('الصف غير موجود في مدرستك');
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
      await deleteClassroom(deleteTarget.id, hardDelete);
      showToast(hardDelete ? 'تم الحذف النهائي' : 'تم تعطيل الفصل', 'success');
      setDeleteTarget(null);
      setHardDelete(false);
      load({ soft: true });
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'فشل الحذف', 'danger');
    } finally {
      setDeleting(false);
    }
  };

  const moveRoom = async (room: SchoolClassroom, direction: -1 | 1) => {
    if (!canReorder) return;
    const sorted = [...classrooms];
    const index = sorted.findIndex((c) => c.id === room.id);
    const swap = sorted[index + direction];
    if (!swap || index < 0) return;

    const next = [...sorted];
    next[index] = swap;
    next[index + direction] = room;
    const items = next.map((c, i) => ({ id: c.id, position: i }));

    setReordering(true);
    setClassrooms(next.map((c, i) => ({ ...c, position: i })));
    try {
      await reorderClassrooms(items);
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
        title="الفصول الدراسية"
        subtitle={`${total} فصل`}
        actions={<Button label="فصل جديد" icon="Plus" onPress={openCreate} />}
      />

      <View style={styles.toolbar}>
        <Input
          value={search}
          onChangeText={(v) => {
            setPage(0);
            setSearch(v);
          }}
          placeholder="بحث باسم الفصل..."
          icon="Search"
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillsRow}
        >
          <Pressable
            onPress={() => {
              setPage(0);
              setGradeFilter(null);
            }}
            style={[styles.pill, gradeFilter == null && styles.pillOn]}
          >
            <Text style={[styles.pillText, gradeFilter == null && styles.pillTextOn]}>
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
                }}
                style={[styles.pill, on && styles.pillOn]}
              >
                <Text style={[styles.pillText, on && styles.pillTextOn]}>{g.name}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {canReorder ? (
          <Text style={styles.reorderHint}>اختر صفاً واحداً لإعادة ترتيب فصوله ▲▼</Text>
        ) : null}

        <View style={styles.toolbarLinks}>
          <Pressable
            onPress={() => setMoreFilters((v) => !v)}
            style={styles.moreFiltersBtn}
          >
            <Text style={styles.moreFiltersText}>
              {moreFilters ? 'إخفاء المزيد' : 'المزيد من الفلاتر'}
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
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : null}
    </View>
  );

  return (
    <View style={styles.root} {...rtlProps}>
      <FlatList
        data={loading ? [] : classrooms}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item, index }) => (
          <ClassroomRow
            room={item}
            canReorder={canReorder}
            isFirst={index === 0}
            isLast={index === classrooms.length - 1}
            onOpen={() => openEdit(item)}
            onMoveUp={() => moveRoom(item, -1)}
            onMoveDown={() => moveRoom(item, 1)}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={[
          styles.content,
          isMobile && styles.contentMobile,
          classrooms.length === 0 && !loading ? styles.contentEmpty : null,
        ]}
        ListHeaderComponent={listHeader}
        ListFooterComponent={
          !loading && classrooms.length > 0 ? (
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
              icon="School"
              title="لا توجد فصول"
              description={
                grades.length === 0
                  ? 'أنشئ صفوفاً دراسية أولاً ثم أضف الفصول'
                  : 'أضف فصولاً داخل الصفوف الدراسية'
              }
              actionLabel={grades.length === 0 ? undefined : 'فصل جديد'}
              onAction={grades.length === 0 ? undefined : openCreate}
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
        title={formMode === 'create' ? 'فصل جديد' : 'تعديل الفصل'}
        description="الفصل يتبع صفاً دراسياً، والاسم فريد داخل نفس الصف."
        confirmLabel={saving ? 'جارٍ الحفظ...' : 'حفظ'}
        onConfirm={() => {
          if (!saving) onSave();
        }}
        onClose={() => {
          if (!saving) setFormOpen(false);
        }}
      >
        <View style={styles.form}>
          <FormLabel>الصف الدراسي</FormLabel>
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
            emptyHint="لا توجد صفوف مفعّلة"
          />
          <Input
            label="اسم الفصل"
            value={form.name}
            onChangeText={(name) => setForm((f) => ({ ...f, name }))}
            placeholder="1/1"
          />
          <Input
            label="الوصف"
            value={form.description}
            onChangeText={(description) => setForm((f) => ({ ...f, description }))}
            placeholder="اختياري"
          />
          <Input
            label="السعة"
            value={form.capacity}
            onChangeText={(capacity) => setForm((f) => ({ ...f, capacity }))}
            placeholder={formMode === 'edit' ? 'فارغ = بدون سعة' : 'مثل 30'}
            keyboardType="number-pad"
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
              label="حذف الفصل"
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
        title={hardDelete ? 'حذف نهائي؟' : 'حذف الفصل؟'}
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
  reorderHint: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'right',
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
