import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar, Icon } from '@/components/ui';
import { formatTime, rowRtl } from '@/components/student/ui';
import { studentTheme as t } from '@/components/student/theme';
import {
  ensureThreadForTeacher,
  getConversationMessages,
  getConversations,
  getTeacher,
  sendChatMessage,
} from '@/services/studentPortal';
import type { ChatMessage, ChatThread } from '@/types/studentPortal';

export default function ChatThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [threadId, setThreadId] = useState(String(id));
  const [thread, setThread] = useState<ChatThread | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const listRef = useRef<FlatList>(null);

  const load = useCallback(async () => {
    try {
      let activeId = String(id);
      if (activeId.startsWith('pending-')) {
        const teacherId = activeId.replace(/^pending-/, '');
        const ensured = await ensureThreadForTeacher(teacherId);
        activeId = ensured.id;
        setThreadId(activeId);
        if (activeId !== String(id)) {
          router.replace(`/(student)/chat/${activeId}` as never);
        }
      }
      const [threads, msgs] = await Promise.all([
        getConversations(),
        getConversationMessages(activeId),
      ]);
      setThread(threads.find((x) => x.id === activeId) ?? null);
      setMessages(msgs);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تحميل المحادثة');
    }
  }, [id, router]);

  useEffect(() => {
    load();
    const timer = setInterval(load, 3500);
    return () => clearInterval(timer);
  }, [load]);

  const teacher = thread ? getTeacher(thread.teacherId) : null;
  const displayName = teacher?.name || thread?.teacherName || 'المدرس';

  const onSend = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await sendChatMessage(threadId, text.trim());
      setText('');
      await load();
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر الإرسال');
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <LinearGradient
          colors={[...t.heroAccent]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={[styles.headerRow, { flexDirection: rowRtl as 'row' }]}>
            <Pressable
              onPress={() => router.back()}
              style={styles.backBtn}
              hitSlop={8}
              accessibilityLabel="رجوع"
            >
              <Icon name="ChevronRight" size={22} color="#fff" />
            </Pressable>
            <Avatar
              name={displayName}
              size={44}
              color={teacher?.avatarColor || t.brandDeep}
            />
            <View style={styles.headerText}>
              <Text style={styles.title} numberOfLines={1}>
                {displayName}
              </Text>
              <Text style={styles.sub}>متصل · رسائل مباشرة</Text>
            </View>
          </View>
        </LinearGradient>

        {error ? (
          <View style={styles.errorBanner}>
            <Icon name="AlertCircle" size={14} color={t.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
        >
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={styles.list}
            onContentSizeChange={() =>
              listRef.current?.scrollToEnd({ animated: false })
            }
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <View style={styles.emptyIcon}>
                  <Icon name="MessageSquare" size={28} color={t.brand} />
                </View>
                <Text style={styles.emptyTitle}>ابدأ المحادثة مع {displayName}</Text>
                <Text style={styles.emptySub}>
                  رسالتك تصل مباشرة إلى لوحة المدرس ويمكنه الرد فوراً
                </Text>
              </View>
            }
            renderItem={({ item, index }) => {
              const mine = item.from === 'student';
              const prev = messages[index - 1];
              const showDay =
                !prev ||
                new Date(item.at).toDateString() !==
                  new Date(prev.at).toDateString();
              return (
                <View>
                  {showDay ? (
                    <Text style={styles.dayChip}>
                      {new Date(item.at).toLocaleDateString('ar-EG', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                      })}
                    </Text>
                  ) : null}
                  <View
                    style={[
                      styles.bubbleRow,
                      { flexDirection: rowRtl as 'row' },
                      mine ? styles.bubbleRowMine : styles.bubbleRowTheirs,
                    ]}
                  >
                    <View
                      style={[styles.bubble, mine ? styles.mine : styles.theirs]}
                    >
                      <Text
                        style={[styles.bubbleText, mine && styles.mineText]}
                      >
                        {item.text}
                      </Text>
                      <Text
                        style={[styles.time, mine && styles.mineTime]}
                      >
                        {formatTime(String(item.at))}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            }}
          />

          <SafeAreaView edges={['bottom']} style={styles.composerSafe}>
            <View style={[styles.composer, { flexDirection: rowRtl as 'row' }]}>
              <TextInput
                style={styles.input}
                value={text}
                onChangeText={setText}
                placeholder="اكتب رسالتك للمدرس..."
                placeholderTextColor={t.inkMute}
                textAlign="right"
                multiline
                maxLength={4000}
              />
              <Pressable
                onPress={onSend}
                disabled={!text.trim() || sending}
                style={({ pressed }) => [
                  styles.sendBtn,
                  (!text.trim() || sending) && styles.sendBtnDisabled,
                  pressed && text.trim() && { opacity: 0.9 },
                ]}
                accessibilityLabel="إرسال"
              >
                <Icon name="Send" size={18} color="#fff" />
              </Pressable>
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: t.canvas },
  safe: { flex: 1 },
  flex: { flex: 1 },
  header: {
    paddingHorizontal: t.space.md,
    paddingBottom: t.space.md,
    paddingTop: t.space.xs,
  },
  headerRow: {
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1, gap: 2 },
  title: {
    fontFamily: t.fonts.bold,
    fontSize: 17,
    color: '#fff',
    textAlign: 'right',
  },
  sub: {
    fontFamily: t.fonts.regular,
    fontSize: 12,
    color: 'rgba(255,255,255,0.82)',
    textAlign: 'right',
  },
  errorBanner: {
    flexDirection: rowRtl,
    alignItems: 'center',
    gap: 8,
    backgroundColor: t.dangerSoft,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  errorText: {
    flex: 1,
    fontFamily: t.fonts.medium,
    fontSize: 12,
    color: t.danger,
    textAlign: 'right',
  },
  list: {
    paddingHorizontal: t.space.lg,
    paddingVertical: t.space.md,
    flexGrow: 1,
    gap: 2,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 28,
    gap: 10,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: t.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  emptyTitle: {
    fontFamily: t.fonts.bold,
    fontSize: 16,
    color: t.ink,
    textAlign: 'center',
  },
  emptySub: {
    fontFamily: t.fonts.regular,
    fontSize: 13,
    color: t.inkSoft,
    textAlign: 'center',
    lineHeight: 20,
  },
  dayChip: {
    alignSelf: 'center',
    fontFamily: t.fonts.medium,
    fontSize: 11,
    color: t.inkMute,
    backgroundColor: t.cardMuted,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: t.radius.full,
    overflow: 'hidden',
    marginVertical: 12,
  },
  bubbleRow: {
    marginVertical: 3,
  },
  bubbleRowMine: { justifyContent: 'flex-start' },
  bubbleRowTheirs: { justifyContent: 'flex-end' },
  bubble: {
    maxWidth: '82%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 4,
  },
  mine: {
    backgroundColor: t.brand,
    borderBottomStartRadius: 6,
  },
  theirs: {
    backgroundColor: t.card,
    borderWidth: 1,
    borderColor: t.line,
    borderBottomEndRadius: 6,
    ...t.shadow.card,
  },
  bubbleText: {
    fontFamily: t.fonts.regular,
    fontSize: 15,
    color: t.ink,
    textAlign: 'right',
    lineHeight: 22,
  },
  mineText: { color: '#fff' },
  time: {
    fontFamily: t.fonts.medium,
    fontSize: 10,
    color: t.inkMute,
    textAlign: 'left',
    fontVariant: ['tabular-nums'],
  },
  mineTime: { color: 'rgba(255,255,255,0.72)' },
  composerSafe: {
    backgroundColor: t.card,
    borderTopWidth: 1,
    borderTopColor: t.line,
  },
  composer: {
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: t.space.md,
    paddingVertical: 10,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 44,
    borderWidth: 1,
    borderColor: t.line,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'web' ? 12 : 10,
    fontFamily: t.fonts.regular,
    fontSize: 14,
    color: t.ink,
    backgroundColor: t.cardMuted,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: t.brand,
    alignItems: 'center',
    justifyContent: 'center',
    ...t.shadow.float,
  },
  sendBtnDisabled: {
    backgroundColor: t.inkMute,
    opacity: 0.55,
    shadowOpacity: 0,
    elevation: 0,
  },
});
