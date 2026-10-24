import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Avatar, Badge, EmptyState } from '@/components/ui';
import {
  FadeIn,
  LoadingBlock,
  SoftCard,
  StudentPageShell,
  formatShortDate,
  formatTime,
  rowRtl,
} from '@/components/student/ui';
import { studentTheme as t } from '@/components/student/theme';
import {
  ensureThreadForTeacher,
  getConversations,
  getTeacher,
} from '@/services/studentPortal';
import type { ChatThread } from '@/types/studentPortal';

export default function ChatsTab() {
  const router = useRouter();
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        setLoading(true);
        setError('');
        try {
          const data = await getConversations();
          if (alive) setThreads(data);
        } catch (err) {
          if (alive) {
            setThreads([]);
            setError(
              err instanceof Error ? err.message : 'تعذر تحميل المحادثات',
            );
          }
        } finally {
          if (alive) setLoading(false);
        }
      })();
      return () => {
        alive = false;
      };
    }, []),
  );

  const openThread = async (thread: ChatThread) => {
    try {
      let id = thread.id;
      if (id.startsWith('pending-')) {
        const ensured = await ensureThreadForTeacher(thread.teacherId);
        id = ensured.id;
      }
      router.push(`/(student)/chat/${id}` as never);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر فتح المحادثة');
    }
  };

  return (
    <StudentPageShell
      title="المحادثات"
      subtitle="تواصل مع مدرسيك"
      icon="MessagesSquare"
      onBack={false}
    >
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading ? (
        <LoadingBlock />
      ) : threads.length === 0 ? (
        <EmptyState
          icon="MessagesSquare"
          title="لا مدرسين مرتبطين بعد"
          description="عند نشر دروس أو جدول لموادك ستظهر محادثات مدرسيك هنا"
        />
      ) : (
        <View style={styles.list}>
          {threads.map((thread, i) => {
            const teacher = getTeacher(thread.teacherId);
            return (
              <FadeIn key={thread.id} delay={i * 50}>
                <SoftCard onPress={() => openThread(thread)} padded={false}>
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
                        <Text style={styles.name}>
                          {teacher?.name || thread.teacherName || 'مدرس'}
                        </Text>
                        <Text style={styles.time}>
                          {formatShortDate(thread.lastAt)}
                        </Text>
                      </View>
                      <View style={styles.bottom}>
                        <Text style={styles.preview} numberOfLines={1}>
                          {thread.lastMessage}
                        </Text>
                        {thread.unread > 0 ? (
                          <Badge
                            label={String(thread.unread)}
                            tone="primary"
                          />
                        ) : (
                          <Text style={styles.clock}>
                            {formatTime(thread.lastAt)}
                          </Text>
                        )}
                      </View>
                    </View>
                  </View>
                </SoftCard>
              </FadeIn>
            );
          })}
        </View>
      )}
      <Text style={styles.note}>
        الرسائل تصل مباشرة إلى لوحة المدرس ويمكنه الرد منها.
      </Text>
    </StudentPageShell>
  );
}

const styles = StyleSheet.create({
  error: {
    fontFamily: t.fonts.medium,
    fontSize: 12,
    color: t.danger,
    textAlign: 'center',
    backgroundColor: t.dangerSoft,
    padding: 10,
    borderRadius: t.radius.md,
  },
  list: { gap: 10 },
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
