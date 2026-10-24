import { ActivityIndicator, View } from 'react-native';
import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@/auth/AuthContext';
import { ParentChildProvider } from '@/components/parent/ParentChildContext';
import { parentTheme as t } from '@/components/parent/theme';

export default function ParentRootLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={t.guardian} />
      </View>
    );
  }

  if (!user) return <Redirect href={'/login' as never} />;
  if (user.role === 'admin') return <Redirect href={'/(admin)' as never} />;
  if (user.role === 'school_admin') {
    return <Redirect href={'/(dashboard)' as never} />;
  }
  if (user.role === 'teacher') {
    return <Redirect href={'/teacher' as never} />;
  }
  if (user.role === 'student') {
    return <Redirect href={'/(student)' as never} />;
  }
  if (user.role !== 'parent') {
    return <Redirect href={'/login' as never} />;
  }

  return (
    <ParentChildProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: t.canvas },
          animation: 'slide_from_left',
        }}
      />
    </ParentChildProvider>
  );
}
