import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { colors, fonts, radii, spacing } from '@/theme/tokens';
import { currentUser, navGroups, schoolName } from '@/navigation/navConfig';
import { Avatar, Icon } from '@/components/ui';
import { useBreakpoint } from '@/hooks/useBreakpoint';

interface SidebarProps {
  collapsed?: boolean;
  forceExpanded?: boolean;
  onNavigate?: () => void;
  variant?: 'desktop' | 'drawer';
}

export function Sidebar({
  collapsed,
  forceExpanded,
  onNavigate,
  variant = 'desktop',
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { isDesktop } = useBreakpoint();
  const isDrawer = variant === 'drawer' || forceExpanded;
  const showLabels = isDrawer || (!collapsed && isDesktop);
  const [query, setQuery] = useState('');
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(navGroups.map((g, i) => [g.title, i < 2])),
  );

  const activeHref = useMemo(() => {
    if (pathname === '/' || pathname === '') return '/';
    return pathname;
  }, [pathname]);

  const filteredGroups = useMemo(() => {
    const q = query.trim();
    if (!q) return navGroups;
    return navGroups
      .map((group) => ({
        ...group,
        items: group.items.filter(
          (item) => item.label.includes(q) || group.title.includes(q),
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [query]);

  return (
    <View
      style={[
        styles.sidebar,
        showLabels ? styles.expanded : styles.collapsed,
        isDrawer && styles.drawerSidebar,
      ]}
    >
      <View style={styles.brand}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>EM</Text>
        </View>
        {showLabels ? (
          <View style={styles.brandText}>
            <Text style={styles.brandTitle} numberOfLines={1}>
              {schoolName}
            </Text>
            <Text style={styles.brandSub}>لوحة الإدارة المدرسية</Text>
          </View>
        ) : null}
      </View>

      {showLabels ? (
        <View style={styles.searchBox}>
          <View style={styles.searchField}>
            <Icon name="Search" size={16} color={colors.sidebarTextMuted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="بحث في القائمة..."
              placeholderTextColor={colors.sidebarTextMuted}
              style={styles.searchInput}
            />
          </View>
        </View>
      ) : null}

      <ScrollView
        style={styles.nav}
        contentContainerStyle={styles.navContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredGroups.map((group) => {
          const open = query ? true : (openGroups[group.title] ?? true);
          return (
            <View key={group.title} style={styles.group}>
              {showLabels ? (
                <Pressable
                  onPress={() =>
                    setOpenGroups((prev) => ({ ...prev, [group.title]: !prev[group.title] }))
                  }
                  style={styles.groupHeader}
                >
                  <Text style={styles.groupTitle}>{group.title}</Text>
                  <View style={styles.groupChevron}>
                    <Icon
                      name={open ? 'ChevronDown' : 'ChevronLeft'}
                      size={14}
                      color={colors.sidebarTextMuted}
                    />
                  </View>
                </Pressable>
              ) : null}

              {(showLabels ? open : true) &&
                group.items.map((item) => {
                  const active =
                    item.href === '/'
                      ? activeHref === '/'
                      : activeHref === item.href || activeHref.startsWith(`${item.href}/`);
                  return (
                    <Pressable
                      key={item.href}
                      onPress={() => {
                        router.push(item.href as never);
                        onNavigate?.();
                      }}
                      style={({ pressed }) => [
                        styles.item,
                        active && styles.itemActive,
                        !showLabels && styles.itemIconOnly,
                        pressed && !active && styles.itemPressed,
                      ]}
                    >
                      {active ? <View style={styles.activeBar} /> : null}
                      <View style={[styles.iconWrap, active && styles.iconWrapActive]}>
                        <Icon
                          name={item.icon}
                          size={17}
                          color={active ? '#FFFFFF' : colors.sidebarTextMuted}
                        />
                      </View>
                      {showLabels ? (
                        <Text
                          style={[styles.itemLabel, active && styles.itemLabelActive]}
                          numberOfLines={1}
                        >
                          {item.label}
                        </Text>
                      ) : null}
                    </Pressable>
                  );
                })}
            </View>
          );
        })}
      </ScrollView>

      {showLabels ? (
        <View style={styles.footer}>
          <Avatar name={currentUser.name} color={colors.primary} size={40} />
          <View style={styles.footerText}>
            <Text style={styles.footerName} numberOfLines={1}>
              {currentUser.name}
            </Text>
            <Text style={styles.footerRole} numberOfLines={1}>
              {currentUser.role}
            </Text>
          </View>
          <Pressable
            style={styles.settingsBtn}
            onPress={() => {
              router.push('/settings');
              onNavigate?.();
            }}
          >
            <Icon name="Settings" size={16} color={colors.sidebarText} />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    backgroundColor: colors.sidebar,
    borderLeftWidth: 1,
    borderLeftColor: colors.sidebarBorder,
    height: '100%',
  },
  drawerSidebar: {
    borderLeftWidth: 0,
    flex: 1,
  },
  expanded: {
    width: '100%',
  },
  collapsed: {
    width: '100%',
  },
  brand: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.sidebarBorder,
    marginBottom: spacing.sm,
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: colors.onBrand,
    fontFamily: fonts.bold,
    fontSize: 16,
  },
  brandText: {
    flex: 1,
    minWidth: 0,
  },
  brandTitle: {
    color: colors.sidebarText,
    fontFamily: fonts.bold,
    fontSize: 15,
    textAlign: 'right',
  },
  brandSub: {
    color: colors.sidebarTextMuted,
    fontFamily: fonts.regular,
    fontSize: 11,
    textAlign: 'right',
    marginTop: 2,
  },
  searchBox: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  searchField: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.sidebarMuted,
    borderWidth: 1,
    borderColor: colors.sidebarBorder,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    minHeight: 44,
  },
  searchInput: {
    flex: 1,
    color: colors.sidebarText,
    fontFamily: fonts.regular,
    fontSize: 13,
    textAlign: 'right',
    writingDirection: 'rtl',
    paddingVertical: spacing.sm,
  },
  nav: {
    flex: 1,
  },
  navContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing['2xl'],
    gap: 2,
  },
  group: {
    marginBottom: spacing.md,
  },
  groupHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    marginBottom: 4,
  },
  groupTitle: {
    color: '#7C8AA5',
    fontFamily: fonts.semiBold,
    fontSize: 11,
    textAlign: 'right',
    letterSpacing: 0.3,
  },
  groupChevron: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: colors.sidebarMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  item: {
    position: 'relative',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderRadius: radii.lg,
    marginBottom: 3,
    minHeight: 46,
    overflow: 'hidden',
  },
  itemIconOnly: {
    justifyContent: 'center',
    paddingHorizontal: 0,
  },
  itemPressed: {
    backgroundColor: 'rgba(148, 163, 184, 0.10)',
  },
  itemActive: {
    backgroundColor: colors.sidebarActive,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.35)',
  },
  activeBar: {
    position: 'absolute',
    right: 0,
    top: 10,
    bottom: 10,
    width: 3,
    borderRadius: 3,
    backgroundColor: colors.secondary,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(148, 163, 184, 0.12)',
  },
  iconWrapActive: {
    backgroundColor: colors.primary,
  },
  itemLabel: {
    flex: 1,
    color: colors.sidebarText,
    fontFamily: fonts.medium,
    fontSize: 13.5,
    textAlign: 'right',
  },
  itemLabelActive: {
    color: '#FFFFFF',
    fontFamily: fonts.semiBold,
  },
  footer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.md,
    margin: spacing.md,
    padding: spacing.md,
    borderRadius: radii.xl,
    backgroundColor: colors.sidebarMuted,
    borderWidth: 1,
    borderColor: colors.sidebarBorder,
  },
  footerText: {
    flex: 1,
    minWidth: 0,
  },
  footerName: {
    color: '#F8FAFC',
    fontFamily: fonts.semiBold,
    fontSize: 13,
    textAlign: 'right',
  },
  footerRole: {
    color: colors.sidebarTextMuted,
    fontFamily: fonts.regular,
    fontSize: 11,
    textAlign: 'right',
  },
  settingsBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.18)',
  },
});
