import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { EmptyState, Icon } from '@/components/ui';
import {
  FadeIn,
  IconBadge,
  LoadingBlock,
  StudentPageShell,
  formatShortDate,
  formatTime,
  rowRtl,
} from '@/components/student/ui';
import { studentTheme as t } from '@/components/student/theme';
import {
  getStudentNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/services/studentPortal';
import type { StudentNotification } from '@/types/studentPortal';

export default function NotificationsScreen() {
  const router = useRouter();
  const [list, setList] = useState<StudentNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (soft = false) => {
    if (soft) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      setList(await getStudentNotifications());
    } catch (err) {
      setList([]);
      setError(err instanceof Error ? err.message : 'تعذر تحميل الإشعارات');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const unread = useMemo(() => list.filter((n) => !n.read).length, [list]);

  return (
    <StudentPageShell
      title="الإشعارات"
      subtitle={
        unread > 0 ? `${unread} غير مقروء` : 'كل شيء محدّث'
      }
      icon="Bell"
      refreshing={refreshing}
      onRefresh={() => load(true)}
      right={
        unread > 0 ? (
          <Pressable
            onPress={async () => {
              setList(await markAllNotificationsRead());
            }}
            style={styles.markBtn}
            hitSlop={6}
          >
            <Text style={styles.mark}>قراءة الكل</Text>
          </Pressable>
        ) : null
      }
    >
      {loading ? (
        <LoadingBlock />
      ) : error ? (
        <EmptyState
          icon="AlertCircle"
          title="تعذر التحميل"
          description={error}
          actionLabel="إعادة المحاولة"
          onAction={() => load()}
        />
      ) : list.length === 0 ? (
        <EmptyState icon="Bell" title="لا إشعارات" />
      ) : (
        <View style={styles.list}>
          {list.map((n, i) => (
            <FadeIn key={n.id} delay={i * 30}>
              <Pressable
                style={({ pressed }) => [
                  styles.card,
                  !n.read && styles.cardUnread,
                  pressed && { opacity: 0.94 },
                ]}
                onPress={async () => {
                  await markNotificationRead(n.id);
                  if (n.href?.startsWith('/')) {
                    router.push(`/(student)${n.href}` as never);
                  } else {
                    load(true);
                  }
                }}
              >
                <IconBadge
                  name={n.read ? 'Bell' : 'BellRing'}
                  color={n.read ? t.inkMute : t.brand}
                  size={44}
                />
                <View style={styles.textCol}>
                  <View style={styles.titleRow}>
                    <Text style={styles.title} numberOfLines={2}>
                      {n.title}
                    </Text>
                    {!n.read ? <View style={styles.dot} /> : null}
                  </View>
                  <Text style={styles.body} numberOfLines={2}>
                    {n.body}
                  </Text>
                  <Text style={styles.meta}>
                    {formatShortDate(n.at)} · {formatTime(n.at)}
                  </Text>
                </View>
                <Icon name="ChevronLeft" size={16} color={t.inkMute} />
              </Pressable>
            </FadeIn>
          ))}
        </View>
      )}
    </StudentPageShell>
  );
}

const styles = StyleSheet.create({
  markBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: t.radius.full,
    backgroundColor: t.brandSoft,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  mark: {
    fontFamily: t.fonts.semiBold,
    fontSize: 12,
    color: t.brandDeep,
  },
  list: { gap: 10 },
  card: {
    flexDirection: rowRtl,
    alignItems: 'center',
    gap: 12,
    backgroundColor: t.card,
    borderRadius: t.radius.xl,
    borderWidth: 1,
    borderColor: t.line,
    padding: t.space.md,
    ...t.shadow.card,
  },
  cardUnread: {
    borderColor: '#C7D2FE',
    backgroundColor: '#F8FAFF',
  },
  textCol: { flex: 1, gap: 4, minWidth: 0 },
  titleRow: {
    flexDirection: rowRtl,
    alignItems: 'center',
    gap: 8,
  },
  title: {
    flex: 1,
    fontFamily: t.fonts.bold,
    fontSize: 14,
    color: t.ink,
    textAlign: 'right',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: t.brand,
  },
  body: {
    fontFamily: t.fonts.regular,
    fontSize: 12,
    color: t.inkSoft,
    textAlign: 'right',
    lineHeight: 18,
  },
  meta: {
    fontFamily: t.fonts.medium,
    fontSize: 11,
    color: t.inkMute,
    textAlign: 'right',
  },
});
