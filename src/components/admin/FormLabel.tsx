import { StyleSheet, Text } from 'react-native';
import { colors, fonts } from '@/theme/tokens';

export function FormLabel({ children }: { children: string }) {
  return <Text style={styles.label}>{children}</Text>;
}

const styles = StyleSheet.create({
  label: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: colors.text,
    textAlign: 'right',
  },
});
