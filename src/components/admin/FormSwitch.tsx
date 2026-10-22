import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, spacing } from '@/theme/tokens';

interface FormSwitchProps {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}

export function FormSwitch({ label, value, onChange }: FormSwitchProps) {
  return (
    <Pressable onPress={() => onChange(!value)} style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.track, value && styles.trackOn]}>
        <View style={[styles.knob, value && styles.knobOn]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.text,
  },
  track: {
    width: 44,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.border,
    padding: 3,
    justifyContent: 'center',
  },
  trackOn: {
    backgroundColor: colors.primary,
  },
  knob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.surface,
    alignSelf: 'flex-start',
  },
  knobOn: {
    alignSelf: 'flex-end',
  },
});
