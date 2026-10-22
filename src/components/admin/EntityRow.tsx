import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/components/ui';
import { colors, fonts, radii, spacing } from '@/theme/tokens';
import { StatusDot } from './StatusDot';
import type { EntityStatus } from './types';

interface EntityRowProps {
  title: string;
  subtitle?: string;
  meta?: string;
  badge?: string;
  leading?: ReactNode;
  status: EntityStatus;
  onPress?: () => void;
  onToggleActive?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

export function EntityRow({
  title,
  subtitle,
  meta,
  badge,
  leading,
  status,
  onPress,
  onToggleActive,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
}: EntityRowProps) {
  const deleted = status === 'deleted';

  return (
    <View style={[styles.row, deleted && styles.rowDeleted]}>
      {leading ? <View style={styles.leading}>{leading}</View> : null}

      <Pressable
        onPress={onPress}
        disabled={deleted || !onPress}
        style={({ pressed }) => [
          styles.main,
          pressed && !deleted ? styles.mainPressed : null,
        ]}
      >
        <View style={styles.titleLine}>
          <StatusDot status={status} />
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {badge ? <Text style={styles.badge}>{badge}</Text> : null}
        </View>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
        {meta ? (
          <Text style={styles.meta} numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
      </Pressable>

      {!deleted ? (
        <View style={styles.actions}>
          {onMoveUp ? (
            <Pressable hitSlop={8} onPress={onMoveUp} style={styles.iconBtn}>
              <Icon name="ChevronUp" size={17} color={colors.textSecondary} />
            </Pressable>
          ) : null}
          {onMoveDown ? (
            <Pressable hitSlop={8} onPress={onMoveDown} style={styles.iconBtn}>
              <Icon name="ChevronDown" size={17} color={colors.textSecondary} />
            </Pressable>
          ) : null}
          {onToggleActive ? (
            <Pressable hitSlop={8} onPress={onToggleActive} style={styles.iconBtn}>
              <Icon
                name={status === 'active' ? 'Eye' : 'EyeOff'}
                size={17}
                color={colors.textSecondary}
              />
            </Pressable>
          ) : null}
          {onEdit ? (
            <Pressable hitSlop={8} onPress={onEdit} style={styles.iconBtn}>
              <Icon name="Pencil" size={17} color={colors.primary} />
            </Pressable>
          ) : null}
          {onDelete ? (
            <Pressable hitSlop={8} onPress={onDelete} style={styles.iconBtn}>
              <Icon name="Trash2" size={17} color={colors.danger} />
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  rowDeleted: {
    opacity: 0.55,
  },
  leading: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  main: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  mainPressed: {
    opacity: 0.85,
  },
  titleLine: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    flexShrink: 1,
    fontFamily: fonts.semiBold,
    fontSize: 16,
    color: colors.text,
    textAlign: 'right',
  },
  badge: {
    fontFamily: fonts.semiBold,
    fontSize: 11,
    color: colors.primaryDark,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.sm,
    overflow: 'hidden',
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'right',
  },
  meta: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.primaryDark,
    textAlign: 'right',
  },
  actions: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 2,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
