import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, spacing } from '@/theme/tokens';
import { Button, Card, MetricCard, PageHeader } from '@/components/ui';
import type { MetricCardData } from '@/types';
import { useBreakpoint } from '@/hooks/useBreakpoint';

interface ModulePageProps {
  title: string;
  subtitle: string;
  breadcrumbs?: string[];
  metrics?: MetricCardData[];
  primaryAction?: { label: string; icon?: string; onPress?: () => void };
  secondaryAction?: { label: string; icon?: string; onPress?: () => void };
  children: ReactNode;
}

export function ModulePage({
  title,
  subtitle,
  breadcrumbs,
  metrics = [],
  primaryAction,
  secondaryAction,
  children,
}: ModulePageProps) {
  const { isMobile } = useBreakpoint();

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, isMobile && styles.contentMobile]}
      showsVerticalScrollIndicator={false}
    >
      <PageHeader
        title={title}
        subtitle={isMobile ? undefined : subtitle}
        breadcrumbs={isMobile ? undefined : breadcrumbs}
        actions={
          <>
            {!isMobile && secondaryAction ? (
              <Button
                label={secondaryAction.label}
                icon={secondaryAction.icon}
                variant="outline"
                onPress={secondaryAction.onPress}
              />
            ) : null}
            {primaryAction ? (
              <Button
                label={isMobile ? primaryAction.label.replace('إضافة ', '+ ') : primaryAction.label}
                icon={primaryAction.icon ?? 'Plus'}
                size={isMobile ? 'sm' : 'md'}
                onPress={primaryAction.onPress}
              />
            ) : null}
          </>
        }
      />

      {isMobile && subtitle ? <Text style={styles.mobileSubtitle}>{subtitle}</Text> : null}

      {metrics.length ? (
        <View style={[styles.metrics, isMobile && styles.metricsMobile]}>
          {metrics.map((metric) => (
            <View key={metric.id} style={[styles.metricItem, isMobile && styles.metricItemMobile]}>
              <MetricCard data={metric} compact={isMobile} />
            </View>
          ))}
        </View>
      ) : null}

      <Card style={isMobile ? styles.cardMobile : undefined}>{children}</Card>
    </ScrollView>
  );
}

export function SectionTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <View style={styles.sectionHead}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {hint ? <Text style={styles.sectionHint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing['2xl'],
    paddingBottom: spacing['4xl'],
    gap: spacing.lg,
  },
  contentMobile: {
    padding: spacing.md,
    paddingBottom: 100,
    gap: spacing.md,
  },
  mobileSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'right',
    marginTop: -4,
    lineHeight: 20,
  },
  metrics: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },
  metricsMobile: {
    gap: spacing.sm,
  },
  metricItem: {
    flexGrow: 1,
    flexBasis: 200,
  },
  metricItemMobile: {
    flexBasis: '47%',
    maxWidth: '48.5%',
  },
  cardMobile: {
    padding: spacing.md,
  },
  sectionHead: {
    marginBottom: spacing.md,
    gap: 4,
  },
  sectionTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
    color: colors.text,
    textAlign: 'right',
  },
  sectionHint: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'right',
  },
});
