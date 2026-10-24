import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { Icon } from '@/components/ui';
import { rowRtl } from '@/components/student/ui';
import { parentTheme as t } from './theme';

const TAB_META: Record<string, { label: string; icon: string }> = {
  index: { label: 'الرئيسية', icon: 'Home' },
  attendance: { label: 'الحضور', icon: 'CalendarCheck' },
  grades: { label: 'الدرجات', icon: 'GraduationCap' },
  materials: { label: 'المواد', icon: 'BookOpen' },
  account: { label: 'حسابي', icon: 'UserCheck' },
};

export function ParentTabBar(props: {
  state: {
    index: number;
    routes: Array<{ key: string; name: string; params?: object }>;
  };
  descriptors: Record<string, { options: { tabBarAccessibilityLabel?: string } }>;
  navigation: {
    emit: (event: object) => { defaultPrevented?: boolean };
    navigate: (name: string, params?: object) => void;
  };
}) {
  const { state, descriptors, navigation } = props;
  const insets = useSafeAreaInsets();

  const barStyle = [
    styles.bar,
    {
      paddingBottom: Math.max(insets.bottom, 10),
      flexDirection: rowRtl as 'row' | 'row-reverse',
    },
  ];

  const tabs = state.routes.map((route, index: number) => {
    const meta = TAB_META[route.name] ?? {
      label: route.name,
      icon: 'Menu',
    };
    const focused = state.index === index;
    const { options } = descriptors[route.key];

    return (
      <Pressable
        key={route.key}
        accessibilityRole="button"
        accessibilityState={focused ? { selected: true } : {}}
        accessibilityLabel={options.tabBarAccessibilityLabel}
        onPress={() => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event?.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        }}
        style={styles.tab}
      >
        <MotiView
          animate={{
            backgroundColor: focused ? t.guardianSoft : 'transparent',
            scale: focused ? 1 : 0.96,
          }}
          transition={{ type: 'timing', duration: 200 }}
          style={styles.iconWrap}
        >
          <Icon
            name={meta.icon}
            size={focused ? 22 : 20}
            color={focused ? t.guardian : t.inkMute}
            strokeWidth={focused ? 2.2 : 1.8}
          />
        </MotiView>
        <Text style={[styles.label, focused && styles.labelActive]}>{meta.label}</Text>
      </Pressable>
    );
  });

  if (Platform.OS === 'web') {
    return <View style={barStyle}>{tabs}</View>;
  }

  return (
    <BlurView intensity={48} tint="light" style={barStyle}>
      {tabs}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 8,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: t.line,
    backgroundColor: Platform.OS === 'web' ? 'rgba(255,255,255,0.94)' : 'transparent',
    paddingTop: 8,
    paddingHorizontal: 6,
    overflow: 'hidden',
    ...t.shadow.float,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  iconWrap: {
    width: 40,
    height: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: t.fonts.medium,
    fontSize: 11,
    color: t.inkMute,
  },
  labelActive: {
    fontFamily: t.fonts.semiBold,
    color: t.guardianDeep,
  },
});
