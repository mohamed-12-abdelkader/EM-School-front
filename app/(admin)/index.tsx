import { useCallback, useEffect, useState } from 'react';
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
import { useRouter } from 'expo-router';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  AppModal,
  useToast,
} from '@/components/ui';
import { deleteSchool, listSchools } from '@/api/schools';
import { ApiError } from '@/api/client';
import type { School } from '@/types/auth';
import { colors, fonts, radii, spacing } from '@/theme/tokens';
import { formatDate } from '@/utils/format';
import { Icon } from '@/components/ui/Icon';

const PAGE_SIZE = 10;

export default function AdminSchoolsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [schools, setSchools] = useState<School[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<School | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(
    async (opts?: { soft?: boolean }) => {
      if (!opts?.soft) setLoading(true);
      try {
        const data = await listSchools({
          search: search.trim() || undefined,
          limit: PAGE_SIZE,
          skip: page * PAGE_SIZE,
          include_deleted: includeDeleted,
        });
        setSchools(data.schools);
        setTotal(data.total);
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : 'تعذر تحميل المدارس';
        showToast(msg, 'danger');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [search, page, includeDeleted, showToast],
  );

  useEffect(() => {
    load();
  }, [load]);

  const onDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteSchool(deleteTarget.id);
      showToast('تم تعطيل المدرسة بنجاح', 'success');
      setDeleteTarget(null);
      load({ soft: true });
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'فشل الحذف', 'danger');
    } finally {
      setDeleting(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, isMobile && styles.contentMobile]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load({ soft: true });
          }}
        />
      }
    >
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>إدارة المدارس</Text>
          <Text style={styles.subtitle}>إنشاء وعرض وتعديل وتعطيل حسابات المدارس</Text>
        </View>
        <Button
          label="إضافة مدرسة"
          icon="Plus"
          onPress={() => router.push('/(admin)/schools/create' as never)}
        />
      </View>

      <View style={styles.stats}>
        <Card style={styles.statCard}>
          <Text style={styles.statLabel}>إجمالي النتائج</Text>
          <Text style={styles.statValue}>{total}</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statLabel}>الصفحة</Text>
          <Text style={styles.statValue}>
            {page + 1} / {totalPages}
          </Text>
        </Card>
      </View>

      <Card>
        <View style={styles.filters}>
          <View style={{ flex: 1, minWidth: 200 }}>
            <Input
              value={search}
              onChangeText={(v) => {
                setPage(0);
                setSearch(v);
              }}
              placeholder="بحث بالاسم أو الإيميل..."
              icon="Search"
            />
          </View>
          <Pressable
            onPress={() => {
              setPage(0);
              setIncludeDeleted((v) => !v);
            }}
            style={[styles.toggle, includeDeleted && styles.toggleOn]}
          >
            <Text style={[styles.toggleText, includeDeleted && styles.toggleTextOn]}>
              {includeDeleted ? 'إخفاء المحذوفة' : 'إظهار المحذوفة'}
            </Text>
          </Pressable>
          <Button label="تحديث" variant="outline" icon="Download" onPress={() => load()} />
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 40 }} />
        ) : schools.length === 0 ? (
          <EmptyState
            title="لا توجد مدارس"
            description="أضف مدرسة جديدة أو عدّل معايير البحث"
            actionLabel="إضافة مدرسة"
            onAction={() => router.push('/(admin)/schools/create' as never)}
          />
        ) : (
          <View style={styles.list}>
            {schools.map((school) => (
              <View key={school.id} style={styles.row}>
                <View style={styles.rowMain}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{school.name.slice(0, 1)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.schoolName}>{school.name}</Text>
                    <Text style={styles.schoolMeta}>{school.email}</Text>
                    <Text style={styles.schoolMeta}>
                      أُنشئت {formatDate(school.created_at)} · ID {school.id}
                    </Text>
                  </View>
                </View>

                <View style={styles.rowSide}>
                  <Badge
                    label={
                      school.deleted_at
                        ? 'محذوفة'
                        : school.is_active
                          ? 'مفعّلة'
                          : 'معطّلة'
                    }
                    tone={
                      school.deleted_at
                        ? 'danger'
                        : school.is_active
                          ? 'success'
                          : 'warning'
                    }
                  />
                  <View style={styles.rowActions}>
                    <Pressable
                      style={styles.iconBtn}
                      onPress={() => router.push(`/(admin)/schools/${school.id}` as never)}
                    >
                      <Icon name="FileText" size={16} color={colors.primary} />
                    </Pressable>
                    {!school.deleted_at ? (
                      <Pressable
                        style={[styles.iconBtn, styles.dangerBtn]}
                        onPress={() => setDeleteTarget(school)}
                      >
                        <Icon name="AlertCircle" size={16} color={colors.danger} />
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={styles.pagination}>
          <Button
            label="التالي"
            variant="outline"
            size="sm"
            disabled={page + 1 >= totalPages}
            onPress={() => setPage((p) => p + 1)}
          />
          <Text style={styles.pageText}>
            {page + 1} من {totalPages}
          </Text>
          <Button
            label="السابق"
            variant="outline"
            size="sm"
            disabled={page <= 0}
            onPress={() => setPage((p) => Math.max(0, p - 1))}
          />
        </View>
      </Card>

      <AppModal
        visible={!!deleteTarget}
        title="تعطيل المدرسة؟"
        description={
          deleteTarget
            ? `سيتم تعطيل «${deleteTarget.name}» ولن يتمكن حساب إدارتها من الدخول. البيانات المرتبطة لن تُحذف.`
            : undefined
        }
        confirmLabel={deleting ? 'جارٍ التعطيل...' : 'تأكيد التعطيل'}
        danger
        onClose={() => setDeleteTarget(null)}
        onConfirm={deleting ? undefined : onDelete}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing['2xl'], paddingBottom: spacing['4xl'], gap: spacing.lg },
  contentMobile: { padding: spacing.md },
  header: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  title: { fontFamily: fonts.bold, fontSize: 26, color: colors.text, textAlign: 'right' },
  subtitle: { fontFamily: fonts.regular, fontSize: 13, color: colors.textSecondary, textAlign: 'right' },
  stats: { flexDirection: 'row-reverse', gap: spacing.md, flexWrap: 'wrap' },
  statCard: { flex: 1, minWidth: 140 },
  statLabel: { fontFamily: fonts.medium, fontSize: 12, color: colors.textMuted, textAlign: 'right' },
  statValue: { fontFamily: fonts.bold, fontSize: 22, color: colors.text, textAlign: 'right', marginTop: 4 },
  filters: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  toggle: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  toggleOn: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  toggleText: { fontFamily: fonts.medium, fontSize: 13, color: colors.textSecondary },
  toggleTextOn: { color: colors.primaryDark, fontFamily: fonts.semiBold },
  list: { gap: spacing.sm },
  row: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    padding: spacing.lg,
    backgroundColor: colors.background,
    gap: spacing.md,
  },
  rowMain: { flexDirection: 'row-reverse', gap: spacing.md, alignItems: 'center' },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: fonts.bold, color: colors.primary, fontSize: 16 },
  schoolName: { fontFamily: fonts.bold, fontSize: 15, color: colors.text, textAlign: 'right' },
  schoolMeta: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, textAlign: 'right' },
  rowSide: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowActions: { flexDirection: 'row-reverse', gap: spacing.sm },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerBtn: { backgroundColor: colors.dangerSoft },
  pagination: {
    marginTop: spacing.xl,
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.lg,
  },
  pageText: { fontFamily: fonts.medium, fontSize: 13, color: colors.textSecondary },
});
