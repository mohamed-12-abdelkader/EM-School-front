import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radii, spacing } from '@/theme/tokens';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { EmptyState } from './EmptyState';
import { Badge, statusTone } from './Badge';

export interface ColumnDef<T> {
  key: string;
  label: string;
  width?: number;
  flex?: number;
  render?: (row: T) => ReactNode;
  getValue?: (row: T) => string | number;
  /** Prefer this column as the card title on mobile */
  primary?: boolean;
  /** Hide this column from mobile card body (still used in desktop table) */
  hideOnMobile?: boolean;
}

interface DataTableProps<T extends { id: string }> {
  columns: ColumnDef<T>[];
  data: T[];
  onRowPress?: (row: T) => void;
  selectedIds?: string[];
  onToggleSelect?: (id: string) => void;
  emptyTitle?: string;
}

function cellText<T>(col: ColumnDef<T>, row: T): string {
  return String(col.getValue?.(row) ?? (row as Record<string, unknown>)[col.key] ?? '—');
}

export function DataTable<T extends { id: string }>({
  columns,
  data,
  onRowPress,
  selectedIds,
  onToggleSelect,
  emptyTitle = 'لا توجد بيانات للعرض',
}: DataTableProps<T>) {
  const { isMobile } = useBreakpoint();

  if (!data.length) {
    return <EmptyState title={emptyTitle} description="جرّب تعديل الفلاتر أو إضافة سجل جديد." />;
  }

  if (isMobile) {
    const primaryCol = columns.find((c) => c.primary) ?? columns[0];
    const statusCol = columns.find((c) => c.key === 'c5' || c.key === 'status' || c.label.includes('الحالة'));
    const detailCols = columns.filter(
      (c) => c !== primaryCol && c !== statusCol && !c.hideOnMobile,
    );

    return (
      <View style={styles.cards}>
        {data.map((row) => {
          const selected = selectedIds?.includes(row.id);
          const statusValue = statusCol ? cellText(statusCol, row) : null;
          return (
            <Pressable
              key={row.id}
              onPress={() => onRowPress?.(row)}
              style={[styles.card, selected && styles.selected]}
            >
              <View style={styles.cardHead}>
                <View style={styles.cardTitleWrap}>
                  {onToggleSelect ? (
                    <Pressable
                      onPress={() => onToggleSelect(row.id)}
                      style={[styles.check, selected && styles.checkOn]}
                    >
                      {selected ? <Text style={styles.checkMark}>✓</Text> : null}
                    </Pressable>
                  ) : null}
                  <View style={{ flex: 1 }}>
                    {primaryCol.render ? (
                      primaryCol.render(row)
                    ) : (
                      <Text style={styles.cardTitle} numberOfLines={2}>
                        {cellText(primaryCol, row)}
                      </Text>
                    )}
                  </View>
                </View>
                {statusValue ? <Badge label={statusValue} tone={statusTone(statusValue)} /> : null}
              </View>

              <View style={styles.cardBody}>
                {detailCols.slice(0, 4).map((col) => (
                  <View key={col.key} style={styles.cardField}>
                    <Text style={styles.fieldLabel}>{col.label}</Text>
                    {col.render ? (
                      col.render(row)
                    ) : (
                      <Text style={styles.fieldValue} numberOfLines={2}>
                        {cellText(col, row)}
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            </Pressable>
          );
        })}
      </View>
    );
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={styles.table}>
        <View style={styles.header}>
          {onToggleSelect ? <View style={styles.checkCol} /> : null}
          {columns.map((col) => (
            <View
              key={col.key}
              style={[styles.cell, col.width ? { width: col.width } : { flex: col.flex ?? 1, minWidth: 120 }]}
            >
              <Text style={styles.headerText}>{col.label}</Text>
            </View>
          ))}
        </View>
        {data.map((row, index) => {
          const selected = selectedIds?.includes(row.id);
          return (
            <Pressable
              key={row.id}
              onPress={() => onRowPress?.(row)}
              style={[styles.row, index % 2 === 1 && styles.alt, selected && styles.selected]}
            >
              {onToggleSelect ? (
                <Pressable
                  onPress={() => onToggleSelect(row.id)}
                  style={[styles.check, selected && styles.checkOn]}
                >
                  {selected ? <Text style={styles.checkMark}>✓</Text> : null}
                </Pressable>
              ) : null}
              {columns.map((col) => (
                <View
                  key={col.key}
                  style={[
                    styles.cell,
                    col.width ? { width: col.width } : { flex: col.flex ?? 1, minWidth: 120 },
                  ]}
                >
                  {col.render ? (
                    col.render(row)
                  ) : (
                    <Text style={styles.cellText} numberOfLines={1}>
                      {cellText(col, row)}
                    </Text>
                  )}
                </View>
              ))}
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  cards: {
    gap: spacing.md,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardHead: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  cardTitleWrap: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  cardTitle: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.text,
    textAlign: 'right',
  },
  cardBody: {
    gap: spacing.sm,
  },
  cardField: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  fieldLabel: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'right',
    minWidth: 88,
  },
  fieldValue: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: colors.text,
    textAlign: 'left',
    flex: 1,
  },
  table: {
    minWidth: '100%',
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row-reverse',
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surface,
  },
  alt: {
    backgroundColor: '#FCFDFE',
  },
  selected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  cell: {
    paddingHorizontal: spacing.sm,
    justifyContent: 'center',
  },
  headerText: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'right',
  },
  cellText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.text,
    textAlign: 'right',
  },
  checkCol: {
    width: 36,
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkMark: {
    color: '#fff',
    fontSize: 12,
    fontFamily: fonts.bold,
  },
});
