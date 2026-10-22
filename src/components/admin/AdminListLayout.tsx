import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type ListRenderItem,
} from 'react-native';
import { Button, Card, EmptyState, Input, PageHeader } from '@/components/ui';
import { colors, fonts, spacing } from '@/theme/tokens';
import { SegmentControl } from './SegmentControl';
import { FilterPills, type FilterPill } from './FilterPills';
import type { ActiveFilter } from './types';

const ACTIVE_OPTIONS: { key: ActiveFilter; label: string }[] = [
  { key: 'all', label: 'الكل' },
  { key: 'active', label: 'مفعّل' },
  { key: 'inactive', label: 'معطّل' },
];

interface AdminListLayoutProps<T> {
  title: string;
  total: number;
  page: number;
  totalPages: number;
  createLabel: string;
  onCreate: () => void;
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  activeFilter?: ActiveFilter;
  onActiveFilterChange?: (value: ActiveFilter) => void;
  statusFilter?: ReactNode;
  pills?: FilterPill[];
  pillValue?: number | null;
  onPillChange?: (id: number | null) => void;
  pillsAllLabel?: string;
  includeDeleted?: boolean;
  onToggleDeleted?: () => void;
  deletedLabel?: string;
  deletedLabelActive?: string;
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  data: T[];
  keyExtractor: (item: T) => string;
  renderItem: ListRenderItem<T>;
  emptyTitle: string;
  emptyDescription: string;
  emptyIcon?: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  onPageChange: (page: number) => void;
  filterExtra?: ReactNode;
}

export function AdminListLayout<T>({
  title,
  total,
  page,
  totalPages,
  createLabel,
  onCreate,
  search,
  onSearchChange,
  searchPlaceholder = 'بحث...',
  activeFilter,
  onActiveFilterChange,
  statusFilter,
  pills,
  pillValue = null,
  onPillChange,
  pillsAllLabel,
  includeDeleted = false,
  onToggleDeleted,
  deletedLabel = 'إظهار المحذوف',
  deletedLabelActive = 'إخفاء المحذوف',
  loading,
  refreshing,
  onRefresh,
  data,
  keyExtractor,
  renderItem,
  emptyTitle,
  emptyDescription,
  emptyIcon = 'Search',
  emptyActionLabel,
  onEmptyAction,
  onPageChange,
  filterExtra,
}: AdminListLayoutProps<T>) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const header = (
    <View style={styles.header}>
      <PageHeader
        title={title}
        subtitle={`${total} نتيجة · صفحة ${page + 1} من ${totalPages}`}
        actions={<Button label={createLabel} icon="Plus" onPress={onCreate} />}
      />

      <Card style={styles.filterCard}>
        <Input
          value={search}
          onChangeText={onSearchChange}
          placeholder={searchPlaceholder}
          icon="Search"
        />
        {statusFilter
          ? statusFilter
          : activeFilter != null && onActiveFilterChange
            ? (
                <SegmentControl
                  value={activeFilter}
                  options={ACTIVE_OPTIONS}
                  onChange={onActiveFilterChange}
                />
              )
            : null}
        {pills && onPillChange ? (
          <FilterPills
            items={pills}
            value={pillValue}
            onChange={onPillChange}
            allLabel={pillsAllLabel}
          />
        ) : null}
        {filterExtra}
        {onToggleDeleted ? (
          <Pressable onPress={onToggleDeleted} style={styles.deletedLink}>
            <Text
              style={[styles.deletedText, includeDeleted && styles.deletedTextOn]}
            >
              {includeDeleted ? deletedLabelActive : deletedLabel}
            </Text>
          </Pressable>
        ) : null}
      </Card>

      {loading ? <ActivityIndicator color={colors.primary} style={styles.loader} /> : null}
    </View>
  );

  const footer =
    !loading && data.length > 0 ? (
      <View style={styles.pagination}>
        <Button
          label="السابق"
          variant="outline"
          size="sm"
          disabled={page <= 0}
          onPress={() => onPageChange(Math.max(0, page - 1))}
        />
        <Text style={styles.pageText}>
          {page + 1} / {totalPages}
        </Text>
        <Button
          label="التالي"
          variant="outline"
          size="sm"
          disabled={page + 1 >= totalPages}
          onPress={() => onPageChange(page + 1)}
        />
      </View>
    ) : null;

  return (
    <View style={styles.root}>
      <FlatList
        data={loading ? [] : data}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={[
          styles.content,
          isMobile && styles.contentMobile,
          data.length === 0 && !loading ? styles.contentEmpty : null,
        ]}
        ListHeaderComponent={header}
        ListFooterComponent={footer}
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              icon={emptyIcon}
              title={emptyTitle}
              description={emptyDescription}
              actionLabel={emptyActionLabel}
              onAction={onEmptyAction}
            />
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
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
  header: {
    paddingTop: spacing.xl,
    gap: spacing.md,
  },
  filterCard: {
    gap: spacing.md,
    padding: spacing.lg,
  },
  deletedLink: {
    alignSelf: 'flex-end',
  },
  deletedText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.textMuted,
  },
  deletedTextOn: {
    color: colors.primary,
  },
  loader: {
    marginVertical: spacing.xl,
  },
  separator: {
    height: spacing.sm,
  },
  pagination: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
  },
  pageText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.textSecondary,
    minWidth: 48,
    textAlign: 'center',
  },
});

export type AdminListRenderItem<T> = ListRenderItem<T>;
