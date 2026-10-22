import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { colors, fonts, radii, spacing } from '@/theme/tokens';
import { Icon } from './Icon';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  icon?: string;
  disabled?: boolean;
  style?: ViewStyle;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  disabled,
  style,
}: ButtonProps) {
  const tone = variantStyles[variant];
  const sizing = sizeStyles[size];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: tone.bg,
          borderColor: tone.border,
          opacity: disabled ? 0.5 : pressed ? 0.88 : 1,
          paddingHorizontal: sizing.px,
          paddingVertical: sizing.py,
        },
        style,
      ]}
    >
      <View style={styles.row}>
        {icon ? <Icon name={icon} size={sizing.icon} color={tone.text} /> : null}
        <Text style={[styles.label, { color: tone.text, fontSize: sizing.font }]}>{label}</Text>
      </View>
    </Pressable>
  );
}

const variantStyles = {
  primary: { bg: colors.primary, border: colors.primary, text: colors.onBrand },
  secondary: { bg: colors.secondary, border: colors.secondary, text: colors.onBrand },
  outline: { bg: colors.surface, border: colors.border, text: colors.text },
  ghost: { bg: 'transparent', border: 'transparent', text: colors.textSecondary },
  danger: { bg: colors.dangerSoft, border: colors.dangerSoft, text: colors.danger },
};

const sizeStyles = {
  sm: { px: 12, py: 8, font: 13, icon: 14 },
  md: { px: 16, py: 10, font: 14, icon: 16 },
  lg: { px: 20, py: 12, font: 15, icon: 18 },
};

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.md,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.sm,
  },
  label: {
    fontFamily: fonts.semiBold,
  },
});
