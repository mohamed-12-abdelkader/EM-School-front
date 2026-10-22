import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar, Icon, useToast } from '@/components/ui';
import { useAuth } from '@/auth/AuthContext';
import { colors, fonts, radii, shadows, spacing } from '@/theme/tokens';

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const { showToast } = useToast();

  const onLogout = async () => {
    await logout();
    showToast('تم تسجيل الخروج', 'info');
    router.replace('/login' as never);
  };

  const nav = [{ label: 'المدارس', href: '/(admin)', icon: 'Building2' }];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.root}>
        <View style={[styles.topbar, isMobile && styles.topbarMobile]}>
          <View style={styles.brandBlock}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>EM</Text>
            </View>
            <View>
              <Text style={styles.brand}>لوحة المسؤول</Text>
              <Text style={styles.brandSub}>إدارة المدارس · Super Admin</Text>
            </View>
          </View>

          <View style={styles.topActions}>
            {!isMobile
              ? nav.map((item) => {
                  const active = true;
                  return (
                    <Pressable
                      key={item.href}
                      onPress={() => router.push('/(admin)' as never)}

                      style={[styles.navChip, active && styles.navChipActive]}
                    >
                      <Icon name={item.icon} size={16} color={active ? colors.primary : colors.textSecondary} />
                      <Text style={[styles.navChipText, active && styles.navChipTextActive]}>
                        {item.label}
                      </Text>
                    </Pressable>
                  );
                })
              : null}

            <View style={styles.userBox}>
              <Avatar name={user?.name || 'A'} color={colors.primary} size={36} />
              {!isMobile ? (
                <View>
                  <Text style={styles.userName}>{user?.name}</Text>
                  <Text style={styles.userRole}>مسؤول النظام</Text>
                </View>
              ) : null}
            </View>

            <Pressable onPress={onLogout} style={styles.logoutBtn}>
              <Icon name="X" size={16} color={colors.danger} />
              {!isMobile ? <Text style={styles.logoutText}>خروج</Text> : null}
            </Pressable>
          </View>
        </View>

        <View style={styles.content}>{children}</View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  root: { flex: 1 },
  topbar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    ...shadows.sm,
  },
  topbarMobile: {
    paddingHorizontal: spacing.md,
  },
  brandBlock: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.md,
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { color: colors.onBrand, fontFamily: fonts.bold, fontSize: 14 },
  brand: { fontFamily: fonts.bold, fontSize: 15, color: colors.text, textAlign: 'right' },
  brandSub: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted, textAlign: 'right' },
  topActions: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.sm,
  },
  navChip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.full,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  navChipActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  navChipText: { fontFamily: fonts.medium, fontSize: 13, color: colors.textSecondary },
  navChipTextActive: { color: colors.primary, fontFamily: fonts.semiBold },
  userBox: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.sm,
  },
  userName: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.text, textAlign: 'right' },
  userRole: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted, textAlign: 'right' },
  logoutBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.md,
    backgroundColor: colors.dangerSoft,
  },
  logoutText: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.danger },
  content: { flex: 1 },
});
