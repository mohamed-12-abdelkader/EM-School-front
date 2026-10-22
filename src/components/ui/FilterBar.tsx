import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radii, spacing } from '@/theme/tokens';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { Input } from './Input';
import { Icon } from './Icon';

interface FilterOption {
  label: string;
  value: string;
}

interface FilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  filters?: { key: string; label: string; options: FilterOption[]; value: string; onChange: (v: string) => void }[];
  trailing?: ReactNode;
}

export function FilterBar({
  search,
  onSearchChange,
  searchPlaceholder = 'بحث...',
  filters = [],
  trailing,
}: FilterBarProps) {
  const { isMobile } = useBreakpoint();
  return (
    <View style={styles.wrap}>
      <View style={[styles.search, isMobile && styles.searchMobile]}>
        <Input
          value={search}
          onChangeText={onSearchChange}
          placeholder={searchPlaceholder}
          icon="Search"
        />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        {filters.map((filter) => (
          <View key={filter.key} style={styles.filterGroup}>
            <Text style={styles.filterLabel}>{filter.label}</Text>
            <View style={styles.chips}>
              {filter.options.map((opt) => {
                const active = filter.value === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => filter.onChange(opt.value)}
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
        <View style={styles.iconBtn}>
          <Icon name="Filter" size={16} color={colors.textSecondary} />
        </View>
        {trailing}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  search: {
    maxWidth: 420,
    alignSelf: 'stretch',
  },
  searchMobile: {
    maxWidth: '100%',
  },
  filters: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-end',
    gap: spacing.md,
  },
  filterGroup: {
    gap: 6,
  },
  filterLabel: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'right',
  },
  chips: {
    flexDirection: 'row-reverse',
    gap: 6,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  chipText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.primary,
    fontFamily: fonts.semiBold,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
});
