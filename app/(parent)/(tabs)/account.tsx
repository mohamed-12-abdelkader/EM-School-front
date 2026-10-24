import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Avatar, Icon } from '@/components/ui';
import { useAuth } from '@/auth/AuthContext';
import { useParentChild } from '@/components/parent/ParentChildContext';
import { parentTheme as t } from '@/components/parent/theme';
import { relationLabel } from '@/services/parentPortal';
import { rowRtl } from '@/components/parent/ui';

export default function ParentAccountTab() {
  const { user, parentMeta, logout } = useAuth();
  const { children, dashboard } = useParentChild();
  const router = useRouter();

  const onLogout = async () => {
    await logout();
    router.replace('/login' as never);
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>حسابي</Text>

          <View style={styles.profile}>
            <Avatar name={user?.name || 'P'} size={72} />
            <Text style={styles.name}>{user?.name || 'ولي أمر'}</Text>
            <Text style={styles.meta}>
              {dashboard?.school?.name || parentMeta?.school.name || 'المدرسة'}
            </Text>
            {user?.phone ? <Text style={styles.phone}>{user.phone}</Text> : null}
          </View>

          <Text style={styles.section}>الأبناء المرتبطون</Text>
          <View style={styles.list}>
            {children.length === 0 ? (
              <Text style={styles.empty}>لا يوجد أبناء مرتبطون بهذا الحساب.</Text>
            ) : (
              children.map((child) => (
                <View
                  key={child.id}
                  style={[styles.childRow, { flexDirection: rowRtl as 'row' }]}
                >
                  <Avatar name={child.name} size={44} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.childName}>{child.name}</Text>
                    <Text style={styles.childMeta}>
                      {[
                        relationLabel[child.relation] || child.relation,
                        child.gradeName,
                        child.classroomName,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>

          <Pressable
            onPress={() => router.push('/(parent)/opinions' as never)}
            style={[styles.action, { flexDirection: rowRtl as 'row' }]}
          >
            <View style={styles.actionIcon}>
              <Icon name="MessageSquareQuote" size={18} color={t.guardian} />
            </View>
            <Text style={styles.actionText}>آراء المعلّمين</Text>
            <Icon name="ChevronLeft" size={18} color={t.inkMute} />
          </Pressable>

          <Pressable onPress={onLogout} style={styles.logout}>
            <Text style={styles.logoutText}>تسجيل الخروج</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: t.canvas },
  safe: { flex: 1 },
  content: { padding: 16, gap: 14, paddingBottom: 110 },
  title: {
    fontFamily: t.fonts.bold,
    fontSize: 24,
    color: t.ink,
    textAlign: 'right',
  },
  profile: {
    backgroundColor: t.card,
    borderRadius: t.radius.xl,
    borderWidth: 1,
    borderColor: t.line,
    padding: 22,
    alignItems: 'center',
    gap: 8,
    ...t.shadow.card,
  },
  name: {
    fontFamily: t.fonts.bold,
    fontSize: 20,
    color: t.ink,
    marginTop: 6,
  },
  meta: {
    fontFamily: t.fonts.regular,
    fontSize: 14,
    color: t.inkSoft,
  },
  phone: {
    fontFamily: t.fonts.medium,
    fontSize: 13,
    color: t.inkMute,
    fontVariant: ['tabular-nums'],
  },
  section: {
    fontFamily: t.fonts.bold,
    fontSize: 16,
    color: t.ink,
    textAlign: 'right',
    marginTop: 8,
  },
  list: { gap: 8 },
  empty: {
    fontFamily: t.fonts.regular,
    fontSize: 13,
    color: t.inkMute,
    textAlign: 'right',
  },
  childRow: {
    backgroundColor: t.card,
    borderRadius: t.radius.lg,
    borderWidth: 1,
    borderColor: t.line,
    padding: 12,
    alignItems: 'center',
    gap: 12,
    ...t.shadow.card,
  },
  childName: {
    fontFamily: t.fonts.semiBold,
    fontSize: 15,
    color: t.ink,
    textAlign: 'right',
  },
  childMeta: {
    fontFamily: t.fonts.regular,
    fontSize: 12,
    color: t.inkMute,
    textAlign: 'right',
    marginTop: 2,
  },
  action: {
    backgroundColor: t.card,
    borderRadius: t.radius.lg,
    borderWidth: 1,
    borderColor: t.line,
    padding: 14,
    alignItems: 'center',
    gap: 12,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: t.guardianSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    flex: 1,
    fontFamily: t.fonts.semiBold,
    fontSize: 14,
    color: t.ink,
    textAlign: 'right',
  },
  logout: {
    marginTop: 8,
    backgroundColor: t.dangerSoft,
    borderRadius: t.radius.lg,
    paddingVertical: 14,
    alignItems: 'center',
  },
  logoutText: {
    fontFamily: t.fonts.semiBold,
    fontSize: 15,
    color: t.danger,
  },
});
