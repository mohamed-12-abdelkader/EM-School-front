import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Avatar, Badge, EmptyState } from '@/components/ui';
import {
  FadeIn,
  LoadingBlock,
  SoftCard,
  StudentScreen,
  formatShortDate,
  formatTime,
  rowRtl,
} from '@/components/student/ui';
import { studentTheme as t } from '@/components/student/theme';
import { getConversations, getTeacher } from '@/services/studentPortal';
import type { ChatThread } from '@/types/studentPortal';

export default function ChatsTab() {
  const router = useRouter();
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        setLoading(true);
        const data = await getConversations();
        if (alive) {
          setThreads(data);
          setLoading(false);
        }
      })();
      return () => {
        alive = false;
      };
    }, []),
  );

  return (
    <StudentScreen title="المحادثات" subtitle="تواصل مع مدرسيك" hero>
      {loading ? (
        <LoadingBlock />
      ) : threads.length === 0 ? (
        <EmptyState
          icon="MessagesSquare"
          title="لا مدرسين مرتبطين بعد"
          description="عند نشر دروس أو جدول لموادك ستظهر محادثات مدرسيك هنا"
        />
      ) : (
        threads.map((thread, i) => {
          const teacher = getTeacher(thread.teacherId);
          return (
            <FadeIn key={thread.id} delay={i * 50}>
              <SoftCard
                onPress={() =>
                  router.push(`/(student)/chat/${thread.id}` as never)
                }
                padded={false}
              >
                <View style={styles.row}>
                  {teacher ? (
                    <Avatar
                      name={teacher.name}
                      color={teacher.avatarColor}
                      size={52}
                    />
                  ) : null}
                  <View style={styles.main}>
                    <View style={styles.top}>
                      <Text style={styles.name}>{teacher?.name || 'مدرس'}</Text>
                      <Text style={styles.time}>
                        {formatShortDate(thread.lastAt)}
                      </Text>
                    </View>
                    <View style={styles.bottom}>
                      <Text style={styles.preview} numberOfLines={1}>
                        {thread.lastMessage}
                      </Text>
                      {thread.unread > 0 ? (
                        <Badge label={String(thread.unread)} tone="primary" />
                      ) : (
                        <Text style={styles.clock}>{formatTime(thread.lastAt)}</Text>
                      )}
                    </View>
                  </View>
                </View>
              </SoftCard>
            </FadeIn>
          );
        })
      )}
      <Text style={styles.note}>
        المحادثات تجريبية ومحفوظة محلياً — ليست رسائل حقيقية على الخادم.
      </Text>
    </StudentScreen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: rowRtl,
    alignItems: 'center',
    gap: 14,
    padding: t.space.md,
  },
  main: { flex: 1, gap: 6, minWidth: 0 },
  top: {
    flexDirection: rowRtl,
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    flex: 1,
    fontFamily: t.fonts.bold,
    fontSize: 15,
    color: t.ink,
    textAlign: 'right',
  },
  time: {
    fontFamily: t.fonts.medium,
    fontSize: 11,
    color: t.inkMute,
  },
  bottom: {
    flexDirection: rowRtl,
    alignItems: 'center',
    gap: 8,
  },
  preview: {
    flex: 1,
    fontFamily: t.fonts.regular,
    fontSize: 13,
    color: t.inkSoft,
    textAlign: 'right',
  },
  clock: {
    fontFamily: t.fonts.regular,
    fontSize: 11,
    color: t.inkMute,
  },
  note: {
    fontFamily: t.fonts.regular,
    fontSize: 12,
    color: t.inkMute,
    textAlign: 'center',
    marginTop: t.space.md,
    lineHeight: 18,
  },
});
