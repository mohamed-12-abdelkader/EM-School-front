import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { Icon } from '@/components/ui';
import { rowRtl } from './ui';
import { studentTheme as t } from './theme';

const TAB_META: Record<string, { label: string; icon: string }> = {
  index: { label: 'الرئيسية', icon: 'LayoutDashboard' },
  study: { label: 'دراستي', icon: 'BookOpen' },
  chats: { label: 'المحادثات', icon: 'MessagesSquare' },
  ai: { label: 'مساعد AI', icon: 'Bot' },
  account: { label: 'حسابي', icon: 'UserCheck' },
};

export function StudentTabBar(props: {
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
            backgroundColor: focused ? t.brandSoft : 'transparent',
            scale: focused ? 1 : 0.96,
          }}
          transition={{ type: 'timing', duration: 200 }}
          style={styles.iconWrap}
        >
          <Icon
            name={meta.icon}
            size={focused ? 22 : 20}
            color={focused ? t.brand : t.inkMute}
            strokeWidth={focused ? 2.2 : 1.8}
          />
        </MotiView>
        <Text style={[styles.label, focused && styles.labelActive]}>
          {meta.label}
        </Text>
      </Pressable>
    );
  });

  if (Platform.OS === 'ios') {
    return (
      <BlurView intensity={55} tint="light" style={barStyle}>
        {tabs}
      </BlurView>
    );
  }

  return <View style={barStyle}>{tabs}</View>;
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: Platform.OS === 'ios' ? 'rgba(255,255,255,0.72)' : t.card,
    borderTopWidth: 1,
    borderTopColor: t.line,
    paddingTop: 8,
    paddingHorizontal: 4,
    overflow: 'hidden',
    ...t.shadow.float,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
    minHeight: 54,
    justifyContent: 'center',
  },
  iconWrap: {
    width: 44,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  label: {
    fontFamily: t.fonts.medium,
    fontSize: 10,
    color: t.inkMute,
  },
  labelActive: {
    color: t.brand,
    fontFamily: t.fonts.bold,
  },
});
