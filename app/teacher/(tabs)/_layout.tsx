import { Tabs } from 'expo-router';
import { TeacherTabBar } from '@/components/teacher/TeacherTabBar';

export default function TeacherTabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TeacherTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" options={{ title: 'الرئيسية' }} />
      <Tabs.Screen name="classes" options={{ title: 'صفوفي' }} />
      <Tabs.Screen name="lessons" options={{ title: 'الدروس' }} />
      <Tabs.Screen name="exams" options={{ title: 'الاختبارات' }} />
      <Tabs.Screen name="tasks" options={{ title: 'الواجبات' }} />
    </Tabs>
  );
}
