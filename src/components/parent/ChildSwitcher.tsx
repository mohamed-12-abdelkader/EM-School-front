import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MotiView } from 'moti';
import { Avatar } from '@/components/ui';
import { rowRtl } from '@/components/student/ui';
import { relationLabel } from '@/services/parentPortal';
import type { ParentChildWithStats } from '@/types/parentPortal';
import { parentTheme as t } from './theme';

export function ChildSwitcher({
  children,
  selectedId,
  onSelect,
}: {
  children: ParentChildWithStats[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (children.length <= 1) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.row, { flexDirection: rowRtl as 'row' }]}
    >
      {children.map((child) => {
        const active = child.id === selectedId;
        return (
          <Pressable key={child.id} onPress={() => onSelect(child.id)}>
            <MotiView
              animate={{
                backgroundColor: active ? t.guardianSoft : t.card,
                borderColor: active ? t.guardian : t.line,
                scale: active ? 1 : 0.98,
              }}
              transition={{ type: 'timing', duration: 180 }}
              style={styles.chip}
            >
              <Avatar name={child.name} size={36} />
              <View style={styles.meta}>
                <Text style={[styles.name, active && styles.nameOn]} numberOfLines={1}>
                  {child.name.split(' ')[0]}
                </Text>
                <Text style={styles.rel}>
                  {relationLabel[child.relation] || child.relation}
                </Text>
              </View>
            </MotiView>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: 10,
    paddingBottom: 4,
  },
  chip: {
    flexDirection: rowRtl as 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: t.radius.lg,
    borderWidth: 1.5,
    minWidth: 140,
  },
  meta: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontFamily: t.fonts.semiBold,
    fontSize: 14,
    color: t.inkSoft,
    textAlign: 'right',
  },
  nameOn: {
    color: t.guardianDeep,
  },
  rel: {
    fontFamily: t.fonts.regular,
    fontSize: 11,
    color: t.inkMute,
    textAlign: 'right',
  },
});
