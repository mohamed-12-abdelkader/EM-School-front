import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { Icon } from '@/components/ui';
import { rowRtl } from './ui';
import { teacherTheme as t } from './theme';

const TAB_META: Record<string, { label: string; icon: string }> = {
  index: { label: 'الرئيسية', icon: 'Home' },
  classes: { label: 'صفوفي', icon: 'Users' },
  lessons: { label: 'الدروس', icon: 'BookOpen' },
  exams: { label: 'اختبارات', icon: 'ClipboardList' },
  tasks: { label: 'واجبات', icon: 'FileText' },
};

export function TeacherTabBar(props: {
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

  const barInner = (
    <View style={[styles.inner, { flexDirection: rowRtl as 'row' }]}>{renderTabs()}</View>
  );

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      {Platform.OS === 'web' ? (
        <View style={[styles.bar, styles.barSolid]}>{barInner}</View>
      ) : (
        <BlurView intensity={80} tint="light" style={styles.bar}>
          {barInner}
        </BlurView>
      )}
    </View>
  );

  function renderTabs() {
    return state.routes.map((route, index: number) => {
      const meta = TAB_META[route.name] ?? { label: route.name, icon: 'Menu' };
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
              scale: focused ? 1 : 0.97,
            }}
            transition={{ type: 'timing', duration: 180 }}
            style={styles.iconWrap}
          >
            <Icon
              name={meta.icon}
              size={focused ? 21 : 19}
              color={focused ? t.brand : t.inkMute}
              strokeWidth={focused ? 2.3 : 1.7}
            />
          </MotiView>
          <Text style={[styles.label, focused && styles.labelActive]} numberOfLines={1}>
            {meta.label}
          </Text>
        </Pressable>
      );
    });
  }
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    start: 14,
    end: 14,
    bottom: 0,
  },
  bar: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(226,232,240,0.95)',
    overflow: 'hidden',
    ...t.shadow.float,
  },
  barSolid: {
    backgroundColor: 'rgba(255,255,255,0.97)',
  },
  inner: {
    paddingTop: 8,
    paddingBottom: 6,
    paddingHorizontal: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  iconWrap: {
    width: 46,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: t.fonts.medium,
    fontSize: 10,
    color: t.inkMute,
    writingDirection: 'rtl',
  },
  labelActive: {
    color: t.brandDeep,
    fontFamily: t.fonts.bold,
  },
});
