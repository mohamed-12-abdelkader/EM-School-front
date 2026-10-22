import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { colors, fonts, radii } from '@/theme/tokens';

export interface FilterPill {
  id: number | null;
  label: string;
}

interface FilterPillsProps {
  items: FilterPill[];
  value: number | null;
  onChange: (id: number | null) => void;
  allLabel?: string;
}

export function FilterPills({
  items,
  value,
  onChange,
  allLabel = 'الكل',
}: FilterPillsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      <Pressable
        onPress={() => onChange(null)}
        style={[styles.pill, value == null && styles.pillOn]}
      >
        <Text style={[styles.text, value == null && styles.textOn]}>{allLabel}</Text>
      </Pressable>
      {items.map((item) => {
        const on = value === item.id;
        return (
          <Pressable
            key={String(item.id)}
            onPress={() => onChange(item.id)}
            style={[styles.pill, on && styles.pillOn]}
          >
            <Text style={[styles.text, on && styles.textOn]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row-reverse',
    gap: 8,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  pillOn: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  text: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.textSecondary,
  },
  textOn: {
    color: colors.primaryDark,
    fontFamily: fonts.semiBold,
  },
});
