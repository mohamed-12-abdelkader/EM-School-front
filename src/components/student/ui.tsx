import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MotiView } from 'moti';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '@/components/ui';
import { studentTheme as t } from './theme';

const rtlProps =
  Platform.OS === 'web' ? ({ dir: 'rtl' } as Record<string, string>) : {};
export const rowRtl = Platform.OS === 'web' ? 'row' : 'row-reverse';

export function StudentScreen({
  title,
  subtitle,
  children,
  scroll = true,
  onBack,
  right,
  padded = true,
  hero = false,
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  scroll?: boolean;
  onBack?: boolean | (() => void);
  right?: ReactNode;
  padded?: boolean;
  /** Soft gradient header strip */
  hero?: boolean;
}) {
  const router = useRouter();
  const body = scroll ? (
    <ScrollView
      contentContainerStyle={[styles.scrollContent, padded && styles.padded]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, padded && styles.padded]}>{children}</View>
  );

  const headerInner = (
    <View style={styles.headerInner}>
      <View style={styles.headerSide}>
        {onBack ? (
          <Pressable
            onPress={() =>
              typeof onBack === 'function' ? onBack() : router.back()
            }
            style={[styles.backBtn, hero && styles.backBtnHero]}
            hitSlop={8}
          >
            <Icon
              name="ChevronRight"
              size={22}
              color={hero ? '#fff' : t.ink}
            />
          </Pressable>
        ) : null}
      </View>
      <View style={styles.headerMain}>
        {title ? (
          <Text
            style={[styles.headerTitle, hero && styles.headerTitleHero]}
            numberOfLines={1}
          >
            {title}
          </Text>
        ) : null}
        {subtitle ? (
          <Text
            style={[styles.headerSub, hero && styles.headerSubHero]}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View style={[styles.headerSide, styles.headerRight]}>{right}</View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']} {...rtlProps}>
      {title ? (
        hero ? (
          <LinearGradient
            colors={[...t.heroGradient]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerHero}
          >
            {headerInner}
          </LinearGradient>
        ) : (
          <View style={styles.header}>{headerInner}</View>
        )
      ) : null}
      {body}
    </SafeAreaView>
  );
}

export function SoftCard({
  children,
  style,
  onPress,
  padded = true,
}: {
  children: ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  padded?: boolean;
}) {
  const content = (
    <View style={[styles.card, padded && styles.cardPad, style]}>{children}</View>
  );
  if (!onPress) return content;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [pressed && { opacity: 0.92, transform: [{ scale: 0.995 }] }]}
    >
      {content}
    </Pressable>
  );
}

export function IconBadge({
  name,
  color = t.brand,
  bg,
  size = 44,
}: {
  name: string;
  color?: string;
  bg?: string;
  size?: number;
}) {
  return (
    <View
      style={[
        styles.iconBadge,
        {
          width: size,
          height: size,
          borderRadius: size * 0.32,
          backgroundColor: bg ?? `${color}18`,
        },
      ]}
    >
      <Icon name={name} size={size * 0.42} color={color} strokeWidth={2} />
    </View>
  );
}

export function SectionTitle({
  title,
  actionLabel,
  onAction,
  icon,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: string;
}) {
  return (
    <View style={styles.sectionRow}>
      <View style={styles.sectionLeft}>
        {icon ? <IconBadge name={icon} size={28} /> : null}
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} style={styles.sectionActionHit}>
          <Text style={styles.sectionAction}>{actionLabel}</Text>
          <Icon name="ChevronLeft" size={16} color={t.brand} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function ProgressBar({
  value,
  color = t.brand,
  height = 8,
}: {
  value: number;
  color?: string;
  height?: number;
}) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <View style={[styles.progressTrack, { height, borderRadius: height }]}>
      <MotiView
        from={{ width: '0%' }}
        animate={{ width: `${pct}%` }}
        transition={{ type: 'timing', duration: 700 }}
        style={[
          styles.progressFill,
          { backgroundColor: color, height, borderRadius: height },
        ]}
      />
    </View>
  );
}

export function ListRow({
  title,
  meta,
  onPress,
  left,
  right,
  style,
}: {
  title: string;
  meta?: string;
  onPress?: () => void;
  left?: ReactNode;
  right?: ReactNode;
  style?: ViewStyle;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.listRow,
        pressed && onPress ? styles.pressed : null,
        style,
      ]}
    >
      {left}
      <View style={styles.listMain}>
        <Text style={styles.listTitle} numberOfLines={2}>
          {title}
        </Text>
        {meta ? (
          <Text style={styles.listMeta} numberOfLines={2}>
            {meta}
          </Text>
        ) : null}
      </View>
      {right ??
        (onPress ? (
          <View style={styles.chevWrap}>
            <Icon name="ChevronLeft" size={18} color={t.inkMute} />
          </View>
        ) : null)}
    </Pressable>
  );
}

export function FeedItem({
  title,
  meta,
  onPress,
  icon,
  iconColor,
  badge,
}: {
  title: string;
  meta?: string;
  onPress?: () => void;
  icon: string;
  iconColor?: string;
  badge?: ReactNode;
}) {
  return (
    <SoftCard onPress={onPress} style={styles.feedCard} padded={false}>
      <View style={styles.feedInner}>
        <IconBadge name={icon} color={iconColor ?? t.brand} size={46} />
        <View style={styles.listMain}>
          <Text style={styles.listTitle} numberOfLines={2}>
            {title}
          </Text>
          {meta ? (
            <Text style={styles.listMeta} numberOfLines={2}>
              {meta}
            </Text>
          ) : null}
        </View>
        {badge ?? (
          onPress ? (
            <Icon name="ChevronLeft" size={18} color={t.inkMute} />
          ) : null
        )}
      </View>
    </SoftCard>
  );
}

export function FadeIn({
  children,
  delay = 0,
  style,
}: {
  children: ReactNode;
  delay?: number;
  style?: ViewStyle;
}) {
  return (
    <MotiView
      from={{ opacity: 0, translateY: 10 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 380, delay }}
      style={style}
    >
      {children}
    </MotiView>
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

export function formatShortDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

export function formatTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export const DAY_NAMES = [
  'الأحد',
  'الإثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
  'السبت',
];

export const assignmentStatusLabel: Record<string, string> = {
  new: 'جديد',
  in_progress: 'جارٍ',
  submitted: 'مُسلَّم (تجريبي)',
  graded: 'مصحح',
  overdue: 'متأخر',
};

export const lectureStatusLabel: Record<string, string> = {
  upcoming: 'قادمة',
  live: 'مباشرة',
  completed: 'مكتملة',
  recorded: 'مسجلة',
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: t.canvas,
    writingDirection: 'rtl',
  },
  flex: { flex: 1 },
  padded: {
    paddingHorizontal: t.space.lg,
    paddingBottom: t.space['4xl'],
  },
  scrollContent: {
    flexGrow: 1,
    gap: t.space.lg,
    paddingTop: t.space.md,
  },
  header: {
    backgroundColor: t.card,
    borderBottomWidth: 1,
    borderBottomColor: t.line,
    paddingBottom: 4,
  },
  headerHero: {
    paddingBottom: 8,
  },
  headerInner: {
    flexDirection: rowRtl,
    alignItems: 'center',
    paddingHorizontal: t.space.md,
    paddingVertical: t.space.sm,
    gap: t.space.sm,
  },
  headerSide: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRight: {
    alignItems: 'flex-start',
  },
  headerMain: {
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    fontFamily: t.fonts.bold,
    fontSize: 17,
    color: t.ink,
    textAlign: 'center',
  },
  headerTitleHero: {
    color: '#fff',
  },
  headerSub: {
    fontFamily: t.fonts.regular,
    fontSize: 12,
    color: t.inkSoft,
    textAlign: 'center',
    marginTop: 2,
  },
  headerSubHero: {
    color: 'rgba(255,255,255,0.82)',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.cardMuted,
  },
  backBtnHero: {
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  card: {
    backgroundColor: t.card,
    borderRadius: t.radius.lg,
    borderWidth: 1,
    borderColor: t.line,
    ...t.shadow.card,
  },
  cardPad: {
    padding: t.space.lg,
  },
  iconBadge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionRow: {
    flexDirection: rowRtl,
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: t.space.sm,
    marginBottom: 2,
  },
  sectionLeft: {
    flexDirection: rowRtl,
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontFamily: t.fonts.bold,
    fontSize: 16,
    color: t.ink,
    textAlign: 'right',
  },
  sectionActionHit: {
    flexDirection: rowRtl,
    alignItems: 'center',
    gap: 2,
  },
  sectionAction: {
    fontFamily: t.fonts.semiBold,
    fontSize: 13,
    color: t.brand,
  },
  progressTrack: {
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
    width: '100%',
  },
  progressFill: {
    maxWidth: '100%',
  },
  listRow: {
    flexDirection: rowRtl,
    alignItems: 'center',
    gap: t.space.md,
    paddingVertical: t.space.md,
    paddingHorizontal: t.space.sm,
    backgroundColor: t.card,
    borderRadius: t.radius.md,
    borderWidth: 1,
    borderColor: t.line,
    marginBottom: 8,
    ...t.shadow.card,
  },
  pressed: { opacity: 0.78 },
  listMain: { flex: 1, minWidth: 0, gap: 3 },
  listTitle: {
    fontFamily: t.fonts.semiBold,
    fontSize: 14,
    color: t.ink,
    textAlign: 'right',
    lineHeight: 21,
  },
  listMeta: {
    fontFamily: t.fonts.regular,
    fontSize: 12,
    color: t.inkSoft,
    textAlign: 'right',
    lineHeight: 18,
  },
  chevWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: t.cardMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedCard: {
    marginBottom: 2,
  },
  feedInner: {
    flexDirection: rowRtl,
    alignItems: 'center',
    gap: t.space.md,
    padding: t.space.md,
  },
  loading: {
    paddingVertical: t.space['3xl'],
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontFamily: t.fonts.medium,
    fontSize: 13,
    color: t.inkMute,
  },
});
