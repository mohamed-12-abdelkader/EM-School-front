import { ActivityIndicator, View } from 'react-native';
import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@/auth/AuthContext';
import { colors } from '@/theme/tokens';

export default function StudentRootLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!user) return <Redirect href={'/login' as never} />;
  if (user.role === 'admin') return <Redirect href={'/(admin)' as never} />;
  if (user.role === 'school_admin') {
    return <Redirect href={'/(dashboard)' as never} />;
  }
  if (user.role !== 'student') {
    return <Redirect href={'/login' as never} />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_left',
      }}
    />
  );
}
