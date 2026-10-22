import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, EmptyState, Icon } from '@/components/ui';
import { formatTime, rowRtl } from '@/components/student/ui';
import {
  getConversationMessages,
  getConversations,
  getTeacher,
  sendChatMessage,
} from '@/services/studentPortal';
import type { ChatMessage, ChatThread } from '@/types/studentPortal';
import { colors, fonts, radii, spacing } from '@/theme/tokens';
import { useRouter } from 'expo-router';
import { Pressable } from 'react-native';

export default function ChatThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [thread, setThread] = useState<ChatThread | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);

  const load = useCallback(async () => {
    const [threads, msgs] = await Promise.all([
      getConversations(),
      getConversationMessages(String(id)),
    ]);
    setThread(threads.find((t) => t.id === id) ?? null);
    setMessages(msgs);
  }, [id]);

  useEffect(() => {
    load();
    const t = setInterval(load, 2000);
    return () => clearInterval(t);
  }, [load]);

  const teacher = thread ? getTeacher(thread.teacherId) : null;

  const onSend = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    await sendChatMessage(String(id), text.trim());
    setText('');
    await load();
    setSending(false);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Icon name="ChevronRight" size={22} color={colors.text} />
        </Pressable>
        <View style={styles.headerMain}>
          <Text style={styles.title}>{teacher?.name || 'محادثة'}</Text>
          <Text style={styles.sub}>محادثة تجريبية محلية</Text>
        </View>
        <View style={styles.back} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState
              icon="MessageSquare"
              title="ابدأ المحادثة"
              description="أرسل رسالة تجريبية للمدرس"
            />
          }
          renderItem={({ item }) => (
            <View
              style={[
                styles.bubble,
                item.from === 'student' ? styles.mine : styles.theirs,
              ]}
            >
              <Text
                style={[
                  styles.bubbleText,
                  item.from === 'student' && styles.mineText,
                ]}
              >
                {item.text}
              </Text>
              <Text
                style={[
                  styles.time,
                  item.from === 'student' && styles.mineTime,
                ]}
              >
                {formatTime(item.at)}
                {item.from === 'student'
                  ? item.read
                    ? ' · مقروءة'
                    : ' · مرسلة'
                  : ''}
              </Text>
            </View>
          )}
        />
        <View style={styles.composer}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="اكتب رسالة..."
            placeholderTextColor={colors.textMuted}
            textAlign="right"
          />
          <Button
            label="إرسال"
            size="sm"
            disabled={!text.trim() || sending}
            onPress={onSend}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  header: {
    flexDirection: rowRtl,
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  back: { width: 40, alignItems: 'center' },
  headerMain: { flex: 1 },
  title: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
  },
  sub: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
  },
  list: { padding: spacing.lg, flexGrow: 1 },
  bubble: {
    maxWidth: '85%',
    borderRadius: radii.lg,
    padding: spacing.md,
    marginVertical: 4,
    gap: 4,
  },
  mine: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
  },
  theirs: {
    alignSelf: 'flex-end',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bubbleText: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.text,
    textAlign: 'right',
    lineHeight: 20,
  },
  mineText: { color: colors.onBrand },
  time: {
    fontFamily: fonts.regular,
    fontSize: 10,
    color: colors.textMuted,
    textAlign: 'left',
  },
  mineTime: { color: colors.onBrandMuted },
  composer: {
    flexDirection: rowRtl,
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.background,
    minHeight: 42,
  },
});
