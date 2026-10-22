import { Pressable, StyleSheet, Text, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { colors, fonts, shadows, spacing } from '@/theme/tokens';
import { Icon } from '@/components/ui';

const tabs = [
  { label: 'الرئيسية', href: '/', icon: 'LayoutDashboard' },
  { label: 'الطلاب', href: '/students', icon: 'GraduationCap' },
  { label: 'الحضور', href: '/attendance', icon: 'ClipboardCheck' },
  { label: 'المالية', href: '/finance', icon: 'Wallet' },
  { label: 'المزيد', href: '__more__', icon: 'Menu' },
];

interface MobileTabBarProps {
  onOpenMore?: () => void;
}

export function MobileTabBar({ onOpenMore }: MobileTabBarProps) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <View style={styles.bar}>
      {tabs.map((tab) => {
        const active =
          tab.href === '/'
            ? pathname === '/' || pathname === ''
            : tab.href === '__more__'
              ? false
              : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Pressable
            key={tab.href}
            style={styles.tab}
            onPress={() => {
              if (tab.href === '__more__') {
                onOpenMore?.();
                return;
              }
              router.push(tab.href as never);
            }}
          >
            <View style={[styles.iconWrap, active && styles.iconActive]}>
              <Icon name={tab.icon} size={20} color={active ? colors.primary : colors.textMuted} />
            </View>
            <Text style={[styles.label, active && styles.labelActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row-reverse',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 6,
    paddingBottom: 8,
    paddingHorizontal: spacing.sm,
    ...shadows.sm,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    minHeight: 52,
    justifyContent: 'center',
  },
  iconWrap: {
    width: 36,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  iconActive: {
    backgroundColor: colors.primarySoft,
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.textMuted,
  },
  labelActive: {
    color: colors.primary,
    fontFamily: fonts.semiBold,
  },
});
