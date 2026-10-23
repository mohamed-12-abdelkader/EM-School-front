import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '@/components/ui';
import { teacherTheme as t } from './theme';

const rtlProps =
  Platform.OS === 'web' ? ({ dir: 'rtl' } as Record<string, string>) : {};
export const rowRtl = Platform.OS === 'web' ? 'row' : 'row-reverse';

export function FadeIn({
  children,
  delay = 0,
}: {
  children: ReactNode;
  delay?: number;
}) {
  return (
    <MotiView
      from={{ opacity: 0, translateY: 10 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 280, delay }}
    >
      {children}
    </MotiView>
  );
}

export function SoftCard({
  children,
  style,
  onPress,
}: {
  children: ReactNode;
  style?: object;
  onPress?: () => void;
}) {
  const body = <View style={[styles.card, style]}>{children}</View>;
  if (!onPress) return body;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }]}>
      {body}
    </Pressable>
  );
}

export function SectionTitle({
  title,
  action,
}: {
  title: string;
  action?: ReactNode;
}) {
  return (
    <View style={[styles.sectionRow, { flexDirection: rowRtl as 'row' }]}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action}
    </View>
  );
}

export function LoadingBlock() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={t.brand} size="large" />
      <Text style={styles.loadingText}>جارٍ التحميل...</Text>
    </View>
  );
}

export function EmptyBlock({
  icon = 'FolderOpen',
  title,
  subtitle,
  action,
}: {
  icon?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Icon name={icon} size={28} color={t.brand} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle ? <Text style={styles.emptySub}>{subtitle}</Text> : null}
      {action ? <View style={{ marginTop: 14 }}>{action}</View> : null}
    </View>
  );
}

export function StatPill({
  label,
  value,
  icon,
  color = t.brand,
}: {
  label: string;
  value: string | number;
  icon: string;
  color?: string;
}) {
  return (
    <View style={[styles.stat, { borderColor: `${color}33` }]}>
      <View style={[styles.statIcon, { backgroundColor: `${color}18` }]}>
        <Icon name={icon} size={18} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export function TeacherScreen({
  title,
  subtitle,
  children,
  scroll = true,
  onBack,
  right,
  hero = false,
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  scroll?: boolean;
  onBack?: boolean | (() => void);
  right?: ReactNode;
  hero?: boolean;
}) {
  const router = useRouter();

  const handleBack = () => {
    if (typeof onBack === 'function') {
      onBack();
      return;
    }
    if (router.canGoBack()) {
      router.back();
      return;
    }
    // Direct open / refresh: no history stack → land on teacher home
    router.replace('/teacher');
  };

  const body = scroll ? (
    <ScrollView
      contentContainerStyle={styles.scroll}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={styles.flex}>{children}</View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']} {...rtlProps}>
      {title ? (
        hero ? (
          <LinearGradient colors={[...t.heroGradient]} style={styles.heroHeader}>
            <View style={[styles.headerInner, { flexDirection: rowRtl as 'row' }]}>
              <View style={styles.headerSide}>
                {onBack ? (
                  <Pressable onPress={handleBack} style={styles.backHero}>
                    <Icon name="ChevronRight" size={22} color="#fff" />
                  </Pressable>
                ) : null}
              </View>
              <View style={styles.headerMain}>
                <Text style={styles.heroTitle} numberOfLines={1}>
                  {title}
                </Text>
                {subtitle ? (
                  <Text style={styles.heroSub} numberOfLines={1}>
                    {subtitle}
                  </Text>
                ) : null}
              </View>
              <View style={styles.headerSide}>{right}</View>
            </View>
          </LinearGradient>
        ) : (
          <View style={[styles.plainHeader, { flexDirection: rowRtl as 'row' }]}>
            <View style={styles.headerSide}>
              {onBack ? (
                <Pressable onPress={handleBack} style={styles.backPlain}>
                  <Icon name="ChevronRight" size={22} color={t.ink} />
                </Pressable>
              ) : null}
            </View>
            <View style={styles.headerMain}>
              <Text style={styles.plainTitle} numberOfLines={1}>
                {title}
              </Text>
              {subtitle ? (
                <Text style={styles.plainSub} numberOfLines={1}>
                  {subtitle}
                </Text>
              ) : null}
            </View>
            <View style={styles.headerSide}>{right}</View>
          </View>
        )
      ) : null}
      {body}
    </SafeAreaView>
  );
}

export const DAY_AR = ['', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: t.canvas },
  flex: { flex: 1, padding: t.space.lg },
  scroll: { padding: t.space.lg, paddingBottom: 120, gap: 14 },
  card: {
    backgroundColor: t.card,
    borderRadius: t.radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: t.line,
    ...t.shadow.card,
  },
  sectionRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  sectionTitle: {
    fontFamily: t.fonts.bold,
    fontSize: 17,
    color: t.ink,
    writingDirection: 'rtl',
  },
  loading: { alignItems: 'center', paddingVertical: 48, gap: 10 },
  loadingText: { fontFamily: t.fonts.medium, color: t.inkMute },
  empty: {
    alignItems: 'center',
    paddingVertical: 36,
    paddingHorizontal: 20,
    backgroundColor: t.card,
    borderRadius: t.radius.lg,
    borderWidth: 1,
    borderColor: t.line,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: t.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontFamily: t.fonts.bold,
    fontSize: 16,
    color: t.ink,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  emptySub: {
    fontFamily: t.fonts.regular,
    fontSize: 13,
    color: t.inkSoft,
    textAlign: 'center',
    marginTop: 6,
    writingDirection: 'rtl',
  },
  stat: {
    flex: 1,
    minWidth: 100,
    backgroundColor: t.card,
    borderRadius: t.radius.lg,
    padding: 14,
    borderWidth: 1,
    gap: 6,
  },
  statIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontFamily: t.fonts.bold,
    fontSize: 22,
    color: t.ink,
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontFamily: t.fonts.medium,
    fontSize: 12,
    color: t.inkSoft,
    writingDirection: 'rtl',
  },
  headerInner: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  headerSide: { width: 44, alignItems: 'center' },
  headerMain: { flex: 1, alignItems: 'center' },
  heroHeader: {
    paddingBottom: 10,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  backHero: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontFamily: t.fonts.bold,
    fontSize: 18,
    color: '#fff',
    writingDirection: 'rtl',
  },
  heroSub: {
    fontFamily: t.fonts.regular,
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
    writingDirection: 'rtl',
  },
  plainHeader: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: t.line,
    backgroundColor: t.card,
  },
  backPlain: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: t.cardMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plainTitle: {
    fontFamily: t.fonts.bold,
    fontSize: 17,
    color: t.ink,
    writingDirection: 'rtl',
  },
  plainSub: {
    fontFamily: t.fonts.regular,
    fontSize: 12,
    color: t.inkSoft,
    marginTop: 2,
    writingDirection: 'rtl',
  },
});
