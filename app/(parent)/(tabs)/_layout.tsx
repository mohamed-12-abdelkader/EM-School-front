import { Tabs } from 'expo-router';
import { ParentTabBar } from '@/components/parent/ParentTabBar';
import { parentTheme as t } from '@/components/parent/theme';

export default function ParentTabsLayout() {
  return (
    <Tabs
      tabBar={(props) => (
        <ParentTabBar {...(props as object as Parameters<typeof ParentTabBar>[0])} />
      )}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: t.canvas },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'الرئيسية' }} />
      <Tabs.Screen name="attendance" options={{ title: 'الحضور' }} />
      <Tabs.Screen name="grades" options={{ title: 'الدرجات' }} />
      <Tabs.Screen name="materials" options={{ title: 'المواد' }} />
      <Tabs.Screen name="account" options={{ title: 'حسابي' }} />
    </Tabs>
  );
}
