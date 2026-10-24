import { ActivityIndicator, View } from 'react-native';
import { Redirect, Slot } from 'expo-router';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { useAuth } from '@/auth/AuthContext';
import { colors } from '@/theme/tokens';

export default function DashboardLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!user) return <Redirect href={"/login" as never} />;
  if (user.role === 'admin') return <Redirect href={"/(admin)" as never} />;
  if (user.role === 'student') return <Redirect href={"/(student)" as never} />;
  if (user.role === 'parent') return <Redirect href={"/(parent)" as never} />;
  if (user.role === 'teacher') return <Redirect href={"/teacher" as never} />;
  if (user.role !== 'school_admin') return <Redirect href={"/login" as never} />;

  return (
    <DashboardShell>
      <Slot />
    </DashboardShell>
  );
}
