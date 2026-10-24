import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Avatar, Badge, EmptyState, Icon } from '@/components/ui';
import {
  FadeIn,
  LoadingBlock,
  SoftCard,
  TeacherScreen,
  rowRtl,
} from '@/components/teacher/ui';
import { teacherTheme as t } from '@/components/teacher/theme';
import { getTeacherChats } from '@/api/teacherPortal';

type Thread = Awaited<ReturnType<typeof getTeacherChats>>['threads'][number];

function formatWhen(iso: string) {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('ar-EG', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

export default function TeacherMessagesScreen() {
  const router = useRouter();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getTeacherChats();
      setThreads(data.threads);
    } catch (err) {
      setThreads([]);
      setError(err instanceof Error ? err.message : 'تعذر تحميل الرسائل');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const unreadTotal = threads.reduce((s, x) => s + (x.unread || 0), 0);

  return (
    <TeacherScreen
      title="رسائل الطلاب"
      subtitle={
        unreadTotal > 0
          ? `${unreadTotal} غير مقروء`
          : 'تواصل مباشر مع طلابك'
      }
      onBack
    >
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading ? (
        <LoadingBlock />
      ) : threads.length === 0 ? (
        <EmptyState
          icon="MessagesSquare"
          title="لا محادثات بعد"
          description="عندما يراسلك طالب من صفحة المادة ستظهر المحادثة هنا. يمكنك أيضاً بدء محادثة من صفحة الصف."
        />
      ) : (
        <View style={styles.list}>
          {threads.map((thread, i) => (
            <FadeIn key={thread.id} delay={i * 40}>
              <SoftCard
                onPress={() =>
                  router.push(`/teacher/chat/${thread.id}` as never)
                }
              >
                <View style={[styles.row, { flexDirection: rowRtl as 'row' }]}>
                  <Avatar name={thread.studentName} size={48} color={t.brand} />
                  <View style={styles.main}>
                    <View
                      style={[styles.top, { flexDirection: rowRtl as 'row' }]}
                    >
                      <Text style={styles.name} numberOfLines={1}>
                        {thread.studentName}
                      </Text>
                      <Text style={styles.time}>
                        {formatWhen(String(thread.lastAt))}
                      </Text>
                    </View>
                    <Text style={styles.preview} numberOfLines={1}>
                      {thread.lastMessage}
                    </Text>
                    {thread.classroomName ? (
                      <Text style={styles.meta}>{thread.classroomName}</Text>
                    ) : null}
                  </View>
                  {thread.unread > 0 ? (
                    <Badge label={String(thread.unread)} tone="primary" />
                  ) : (
                    <Icon name="ChevronLeft" size={16} color={t.inkMute} />
                  )}
                </View>
              </SoftCard>
            </FadeIn>
          ))}
        </View>
      )}
    </TeacherScreen>
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
    marginBottom: 8,
  },
  list: { gap: 10 },
  row: {
    alignItems: 'center',
    gap: 12,
    padding: t.space.md,
  },
  main: { flex: 1, gap: 4, minWidth: 0 },
  top: {
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
  preview: {
    fontFamily: t.fonts.regular,
    fontSize: 13,
    color: t.inkSoft,
    textAlign: 'right',
  },
  meta: {
    fontFamily: t.fonts.medium,
    fontSize: 11,
    color: t.inkMute,
    textAlign: 'right',
  },
});
