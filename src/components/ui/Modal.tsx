import type { ReactNode } from 'react';
import { Modal as RNModal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radii, shadows, spacing } from '@/theme/tokens';
import { Button } from './Button';
import { Icon } from './Icon';

interface AppModalProps {
  visible: boolean;
  title: string;
  description?: string;
  children?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  onClose: () => void;
  danger?: boolean;
}

export function AppModal({
  visible,
  title,
  description,
  children,
  confirmLabel = 'تأكيد',
  cancelLabel = 'إلغاء',
  onConfirm,
  onClose,
  danger,
}: AppModalProps) {
  return (
    <RNModal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.head}>
            <Text style={styles.title}>{title}</Text>
            <Pressable onPress={onClose} style={styles.close}>
              <Icon name="X" size={18} color={colors.textSecondary} />
            </Pressable>
          </View>
          {description ? <Text style={styles.desc}>{description}</Text> : null}
          {children}
          <View style={styles.actions}>
            <Button label={cancelLabel} variant="outline" onPress={onClose} />
            {onConfirm ? (
              <Button
                label={confirmLabel}
                variant={danger ? 'danger' : 'primary'}
                onPress={onConfirm}
              />
            ) : null}
          </View>
        </View>
      </View>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  sheet: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing['2xl'],
    gap: spacing.lg,
    ...shadows.md,
  },
  head: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.text,
    textAlign: 'right',
    flex: 1,
  },
  close: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  desc: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'right',
    lineHeight: 22,
  },
  actions: {
    flexDirection: 'row-reverse',
    gap: spacing.sm,
    justifyContent: 'flex-start',
    marginTop: spacing.sm,
  },
});
