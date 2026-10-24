import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '@/auth/AuthContext';
import { colors } from '@/theme/tokens';

export default function Index() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!user) return <Redirect href={"/login" as never} />;
  if (user.role === 'admin') return <Redirect href={"/(admin)" as never} />;
  if (user.role === 'student') return <Redirect href={"/(student)" as never} />;
  if (user.role === 'parent') return <Redirect href={"/(parent)" as never} />;
  if (user.role === 'teacher') return <Redirect href={"/teacher" as never} />;
  if (user.role === 'school_admin') return <Redirect href={"/(dashboard)" as never} />;
  return <Redirect href={"/login" as never} />;
}
