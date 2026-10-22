import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Badge, EmptyState, Button } from '@/components/ui';
import {
  LoadingBlock,
  ListRow,
  StudentScreen,
  formatShortDate,
  formatTime,
} from '@/components/student/ui';
import {
  getStudentNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/services/studentPortal';
import type { StudentNotification } from '@/types/studentPortal';
import { colors, fonts } from '@/theme/tokens';

export default function NotificationsScreen() {
  const router = useRouter();
  const [list, setList] = useState<StudentNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setList(await getStudentNotifications());
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <StudentScreen
      title="الإشعارات"
      onBack
      right={
        <Pressable
          onPress={async () => {
            setList(await markAllNotificationsRead());
          }}
        >
          <Text style={styles.mark}>قراءة الكل</Text>
        </Pressable>
      }
    >
      {loading ? (
        <LoadingBlock />
      ) : list.length === 0 ? (
        <EmptyState icon="Bell" title="لا إشعارات" />
      ) : (
        list.map((n) => (
          <ListRow
            key={n.id}
            title={n.title}
            meta={`${n.body} · ${formatShortDate(n.at)} ${formatTime(n.at)}`}
            onPress={async () => {
              await markNotificationRead(n.id);
              if (n.href?.startsWith('/')) {
                router.push(`/(student)${n.href}` as never);
              } else {
                load();
              }
            }}
            right={
              <Badge
                label={n.read ? 'مقروء' : 'جديد'}
                tone={n.read ? 'neutral' : 'primary'}
              />
            }
          />
        ))
      )}
      <Button label="تحديث" variant="outline" onPress={load} />
    </StudentScreen>
  );
}

const styles = StyleSheet.create({
  mark: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.primary,
  },
});
