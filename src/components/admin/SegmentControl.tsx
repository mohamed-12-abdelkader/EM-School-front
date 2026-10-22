import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radii, shadows } from '@/theme/tokens';

export interface SegmentOption<T extends string> {
  key: T;
  label: string;
}

interface SegmentControlProps<T extends string> {
  value: T;
  options: SegmentOption<T>[];
  onChange: (value: T) => void;
}

export function SegmentControl<T extends string>({
  value,
  options,
  onChange,
}: SegmentControlProps<T>) {
  return (
    <View style={styles.wrap}>
      {options.map((opt) => {
        const active = opt.key === value;
        return (
          <Pressable
            key={opt.key}
            onPress={() => onChange(opt.key)}
            style={[styles.item, active && styles.itemOn]}
          >
            <Text style={[styles.text, active && styles.textOn]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row-reverse',
    backgroundColor: colors.background,
    borderRadius: radii.md,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  item: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: radii.sm,
  },
  itemOn: {
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  text: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.textMuted,
  },
  textOn: {
    fontFamily: fonts.semiBold,
    color: colors.text,
  },
});
