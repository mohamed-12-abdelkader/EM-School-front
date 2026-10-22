import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, fonts, radii, shadows, spacing } from '@/theme/tokens';
import { academicYears, schoolName } from '@/navigation/navConfig';
import { Avatar, Icon, Input, useToast } from '@/components/ui';
import { notifications } from '@/data/mock';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useAuth } from '@/auth/AuthContext';

interface HeaderProps {
  onToggleSidebar: () => void;
  onOpenMobileNav: () => void;
}

export function Header({ onToggleSidebar, onOpenMobileNav }: HeaderProps) {
  const { isMobile, isCompact } = useBreakpoint();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const displayName = user?.name || 'مستخدم';
  const [year, setYear] = useState(academicYears[0]);
  const [yearOpen, setYearOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const unread = notifications.filter((n) => n.unread).length;

  const onLogout = async () => {
    await logout();
    showToast('تم تسجيل الخروج', 'info');
    router.replace('/login' as never);
  };

  return (
    <View style={[styles.header, isMobile && styles.headerMobile]}>
      <View style={styles.right}>
        <Pressable
          onPress={isCompact ? onOpenMobileNav : onToggleSidebar}
          style={styles.iconBtn}
          hitSlop={8}
        >
          <Icon name="Menu" size={20} color={colors.text} />
        </Pressable>

        {isMobile ? (
          <View style={styles.mobileBrand}>
            <Text style={styles.mobileSchool} numberOfLines={1}>
              {schoolName}
            </Text>
            <Text style={styles.mobileYear}>{year}</Text>
          </View>
        ) : (
          <View style={styles.searchWrap}>
            <Input placeholder="بحث شامل في النظام..." icon="Search" />
          </View>
        )}
      </View>

      <View style={styles.left}>
        {isMobile ? (
          <Pressable onPress={() => setSearchOpen((v) => !v)} style={styles.iconBtn}>
            <Icon name="Search" size={18} color={colors.text} />
          </Pressable>
        ) : null}

        {!isMobile ? (
          <View>
            <Pressable onPress={() => setYearOpen((v) => !v)} style={styles.yearBtn}>
              <Icon name="CalendarRange" size={16} color={colors.primary} />
              <Text style={styles.yearText}>{year}</Text>
              <Icon name="ChevronDown" size={14} color={colors.textSecondary} />
            </Pressable>
            {yearOpen ? (
              <View style={styles.dropdown}>
                {academicYears.map((item) => (
                  <Pressable
                    key={item}
                    onPress={() => {
                      setYear(item);
                      setYearOpen(false);
                    }}
                    style={styles.dropdownItem}
                  >
                    <Text style={styles.dropdownText}>{item}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}

        <Pressable style={styles.iconBtn} onPress={() => router.push('/notifications')}>
          <Icon name="Bell" size={18} color={colors.text} />
          {unread > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unread}</Text>
            </View>
          ) : null}
        </Pressable>

        {!isMobile ? (
          <Pressable style={[styles.iconBtn, styles.quick]} onPress={() => router.push('/students/create')}>
            <Icon name="Plus" size={16} color={colors.onBrand} />
          </Pressable>
        ) : null}

        <View>
          <Pressable onPress={() => setProfileOpen((v) => !v)} style={styles.profile}>
            <Avatar name={displayName} color={colors.primary} size={isMobile ? 34 : 36} />
            {!isMobile ? (
              <View>
                <Text style={styles.userName}>{displayName}</Text>
                <Text style={styles.userRole}>إدارة المدرسة</Text>
              </View>
            ) : null}
          </Pressable>
          {profileOpen ? (
            <View style={[styles.dropdown, styles.profileMenu]}>
              <Text style={styles.menuTitle}>{schoolName}</Text>
              <Text style={styles.dropdownText}>{user?.email}</Text>
              <View style={styles.divider} />
              <Pressable onPress={() => { setProfileOpen(false); router.push('/settings'); }}>
                <Text style={styles.dropdownText}>الإعدادات</Text>
              </Pressable>
              <Pressable onPress={onLogout}>
                <Text style={[styles.dropdownText, { color: colors.danger }]}>تسجيل الخروج</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>

      {isMobile && searchOpen ? (
        <View style={styles.mobileSearch}>
          <Input placeholder="ابحث عن طالب، مدرس، فاتورة..." icon="Search" autoFocus />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: 72,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    zIndex: 20,
    flexWrap: 'wrap',
  },
  headerMobile: {
    minHeight: 60,
    paddingHorizontal: spacing.md,
  },
  right: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    minWidth: 0,
  },
  left: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.sm,
  },
  mobileBrand: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  mobileSchool: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.text,
    textAlign: 'right',
  },
  mobileYear: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.primary,
    textAlign: 'right',
  },
  searchWrap: {
    flex: 1,
    maxWidth: 420,
  },
  mobileSearch: {
    width: '100%',
    paddingTop: spacing.sm,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  quick: {
    backgroundColor: colors.secondary,
    borderColor: colors.secondary,
  },
  badge: {
    position: 'absolute',
    top: -4,
    left: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: colors.onBrand,
    fontSize: 10,
    fontFamily: fonts.bold,
  },
  yearBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    height: 40,
    backgroundColor: colors.primarySoft,
  },
  yearText: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: colors.text,
  },
  dropdown: {
    position: 'absolute',
    top: 48,
    right: 0,
    minWidth: 180,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    ...shadows.md,
    zIndex: 50,
  },
  profileMenu: {
    left: 0,
    right: undefined,
    minWidth: 220,
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radii.sm,
  },
  dropdownText: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.text,
    textAlign: 'right',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  profile: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: 4,
  },
  userName: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: colors.text,
    textAlign: 'right',
  },
  userRole: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'right',
  },
  menuTitle: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.text,
    textAlign: 'right',
    paddingHorizontal: 8,
    paddingTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 6,
  },
});
