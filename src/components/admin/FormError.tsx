import { StyleSheet, Text } from 'react-native';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return <Text style={styles.error}>{message}</Text>;
}

const styles = StyleSheet.create({
  error: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.danger,
    textAlign: 'right',
    backgroundColor: colors.dangerSoft,
    padding: spacing.md,
    borderRadius: radii.md,
  },
});
