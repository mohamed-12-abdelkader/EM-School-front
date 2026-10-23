import { ActivityIndicator, View } from 'react-native';
import { Redirect, Slot } from 'expo-router';
import { AdminShell } from '@/components/layout/AdminShell';
import { useAuth } from '@/auth/AuthContext';
import { colors } from '@/theme/tokens';

export default function AdminLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!user) return <Redirect href={"/login" as never} />;
  if (user.role === 'teacher') return <Redirect href={"/teacher" as never} />;
  if (user.role === 'student') return <Redirect href={"/(student)" as never} />;
  if (user.role === 'school_admin') return <Redirect href={"/(dashboard)" as never} />;
  if (user.role !== 'admin') return <Redirect href={"/login" as never} />;

  return (
    <AdminShell>
      <Slot />
    </AdminShell>
  );
}
