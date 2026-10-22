import { StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

interface StudentQrCodeProps {
  value: string;
  size?: number;
  label?: string;
}

export function StudentQrCode({
  value,
  size = 200,
  label = 'امسح للحضور',
}: StudentQrCodeProps) {
  if (!value?.trim()) return null;

  return (
    <View style={styles.wrap}>
      <View style={[styles.card, { width: size + 24, height: size + 24 }]}>
        <QRCode
          value={value}
          size={size}
          color={colors.text}
          backgroundColor={colors.surface}
          ecl="M"
        />
      </View>
      {label ? <Text style={styles.label}>{label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  card: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
