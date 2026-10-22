import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

export interface ChipOption<T extends string | number = number> {
  id: T;
  label: string;
}

interface ChipSelectProps<T extends string | number = number> {
  options: ChipOption<T>[];
  /** Multi-select when value is T[]; single when T | null */
  value: T | T[] | null;
  onChange: (next: T | T[] | null) => void;
  multiple?: boolean;
  /** In single mode, prevent clearing the selected chip */
  required?: boolean;
  emptyHint?: string;
}

export function ChipSelect<T extends string | number = number>({
  options,
  value,
  onChange,
  multiple = false,
  required = false,
  emptyHint,
}: ChipSelectProps<T>) {
  if (options.length === 0) {
    return emptyHint ? <Text style={styles.hint}>{emptyHint}</Text> : null;
  }

  const isSelected = (id: T) => {
    if (multiple && Array.isArray(value)) return value.includes(id);
    return value === id;
  };

  const toggle = (id: T) => {
    if (multiple) {
      const current = Array.isArray(value) ? value : [];
      onChange(
        current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
      );
      return;
    }
    if (value === id && required) return;
    onChange(value === id ? null : id);
  };

  return (
    <View style={styles.wrap}>
      {options.map((opt) => {
        const on = isSelected(opt.id);
        return (
          <Pressable
            key={String(opt.id)}
            onPress={() => toggle(opt.id)}
            style={[styles.chip, on && styles.chipOn]}
          >
            <Text style={[styles.text, on && styles.textOn]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipOn: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  text: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.textSecondary,
  },
  textOn: {
    color: colors.primaryDark,
    fontFamily: fonts.semiBold,
  },
  hint: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'right',
  },
});
