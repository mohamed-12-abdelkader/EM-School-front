import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, shadows, spacing } from '@/theme/tokens';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { Icon } from '@/components/ui';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { MobileTabBar } from './MobileTabBar';

const SIDEBAR_EXPANDED = 300;
const SIDEBAR_COLLAPSED = 80;

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { isCompact, isMobile } = useBreakpoint();
  const { width } = useWindowDimensions();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const sidebarWidth = collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED;
  const drawerWidth = Math.min(340, Math.max(300, width * 0.9));
  const slideX = useRef(new Animated.Value(drawerWidth)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!mobileOpen) return;
    slideX.setValue(drawerWidth);
    fade.setValue(0);
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.spring(slideX, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 3,
        speed: 16,
      }),
    ]).start();
  }, [mobileOpen, drawerWidth, fade, slideX]);

  const closeDrawer = () => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(slideX, {
        toValue: drawerWidth,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) setMobileOpen(false);
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.root}>
        <View style={[styles.main, !isCompact && { marginRight: sidebarWidth }]}>
          <Header
            onToggleSidebar={() => setCollapsed((v) => !v)}
            onOpenMobileNav={() => setMobileOpen(true)}
          />
          <View style={[styles.content, isMobile && styles.contentMobile]}>{children}</View>
          {isMobile ? <MobileTabBar onOpenMore={() => setMobileOpen(true)} /> : null}
        </View>

        {!isCompact ? (
          <View nativeID="em-sidebar-right" style={[styles.sidebarDock, { width: sidebarWidth }]}>
            <Sidebar collapsed={collapsed} />
          </View>
        ) : null}

        <Modal
          visible={isCompact && mobileOpen}
          animationType="none"
          transparent
          onRequestClose={closeDrawer}
        >
          <View style={styles.mobileOverlay}>
            <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: fade }]}>
              <Pressable style={StyleSheet.absoluteFill} onPress={closeDrawer} />
            </Animated.View>

            <Animated.View
              nativeID="em-drawer-right"
              style={[
                styles.mobileSidebar,
                {
                  width: drawerWidth,
                  transform: [{ translateX: slideX }],
                },
              ]}
            >
              <SafeAreaView style={styles.drawerSafe} edges={['top', 'bottom']}>
                <View style={styles.drawerHead}>
                  <Pressable onPress={closeDrawer} style={styles.closeBtn} hitSlop={10}>
                    <Icon name="X" size={18} color="#E2E8F0" />
                  </Pressable>
                  <View style={styles.drawerHeadText}>
                    <Text style={styles.drawerTitle}>القائمة الرئيسية</Text>
                    <Text style={styles.drawerSubtitle}>تنقّل بين أقسام النظام</Text>
                  </View>
                </View>
                <Sidebar forceExpanded variant="drawer" onNavigate={closeDrawer} />
              </SafeAreaView>
            </Animated.View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  root: {
    flex: 1,
    backgroundColor: colors.background,
    minHeight: '100%',
    width: '100%',
    position: 'relative',
  },
  main: {
    flex: 1,
    minWidth: 0,
  },
  content: {
    flex: 1,
  },
  contentMobile: {
    paddingBottom: 8,
  },
  sidebarDock: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    height: '100%',
    zIndex: 40,
    overflow: 'hidden',
  },
  mobileOverlay: {
    flex: 1,
  },
  backdrop: {
    backgroundColor: 'rgba(15, 23, 42, 0.58)',
  },
  mobileSidebar: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    height: '100%',
    backgroundColor: colors.sidebar,
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
    overflow: 'hidden',
    zIndex: 50,
    ...shadows.md,
  },
  drawerSafe: {
    flex: 1,
    backgroundColor: colors.sidebar,
  },
  drawerHead: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  drawerHeadText: {
    flex: 1,
    gap: 2,
  },
  drawerTitle: {
    color: '#F8FAFC',
    fontFamily: fonts.bold,
    fontSize: 18,
    textAlign: 'right',
  },
  drawerSubtitle: {
    color: '#94A3B8',
    fontFamily: fonts.regular,
    fontSize: 12,
    textAlign: 'right',
  },
  closeBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.sidebarMuted,
    borderWidth: 1,
    borderColor: colors.sidebarBorder,
  },
});

