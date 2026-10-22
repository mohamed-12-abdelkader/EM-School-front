import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, spacing } from '@/theme/tokens';
import { useBreakpoint } from '@/hooks/useBreakpoint';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: string[];
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, breadcrumbs, actions }: PageHeaderProps) {
  const { isMobile } = useBreakpoint();

  return (
    <View style={[styles.wrap, isMobile && styles.wrapMobile]}>
      <View style={styles.textBlock}>
        {breadcrumbs?.length ? (
          <Text style={styles.crumbs}>{breadcrumbs.join(' / ')}</Text>
        ) : null}
        <Text style={[styles.title, isMobile && styles.titleMobile]}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {actions ? <View style={[styles.actions, isMobile && styles.actionsMobile]}>{actions}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.lg,
    marginBottom: spacing.md,
    flexWrap: 'wrap',
  },
  wrapMobile: {
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  textBlock: {
    flex: 1,
    minWidth: 180,
    gap: 4,
  },
  crumbs: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'right',
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 28,
    color: colors.text,
    textAlign: 'right',
  },
  titleMobile: {
    fontSize: 22,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'right',
  },
  actions: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: spacing.sm,
    alignItems: 'center',
  },
  actionsMobile: {
    width: '100%',
    justifyContent: 'flex-start',
  },
});
