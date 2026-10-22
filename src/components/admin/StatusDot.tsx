import { StyleSheet, View } from 'react-native';
import { colors } from '@/theme/tokens';
import type { EntityStatus } from './types';

const toneMap: Record<EntityStatus, string> = {
  active: colors.success,
  inactive: colors.warning,
  deleted: colors.danger,
};

export function StatusDot({ status }: { status: EntityStatus }) {
  return <View style={[styles.dot, { backgroundColor: toneMap[status] }]} />;
}

const styles = StyleSheet.create({
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
