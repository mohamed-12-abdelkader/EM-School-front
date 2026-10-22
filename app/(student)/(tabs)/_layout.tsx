import { Tabs } from 'expo-router';
import { StudentTabBar } from '@/components/student/StudentTabBar';
import { colors } from '@/theme/tokens';

export default function StudentTabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <StudentTabBar {...(props as object as Parameters<typeof StudentTabBar>[0])} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'الرئيسية' }} />
      <Tabs.Screen name="study" options={{ title: 'دراستي' }} />
      <Tabs.Screen name="chats" options={{ title: 'المحادثات' }} />
      <Tabs.Screen name="ai" options={{ title: 'مساعد AI' }} />
      <Tabs.Screen name="account" options={{ title: 'حسابي' }} />
    </Tabs>
  );
}
