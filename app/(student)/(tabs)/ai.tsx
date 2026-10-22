import { useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '@/components/ui';
import { ChipSelect } from '@/components/admin';
import { IconBadge, rowRtl } from '@/components/student/ui';
import { studentTheme as t } from '@/components/student/theme';
import {
  AI_SUGGESTIONS,
  sendAiMessage,
  subjects,
} from '@/services/studentPortal';
import type { AiMessage } from '@/types/studentPortal';

export default function AiTab() {
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [text, setText] = useState('');
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);

  const send = async (raw?: string) => {
    const content = (raw ?? text).trim();
    if (!content || sending) return;
    const userMsg: AiMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: content,
      at: new Date().toISOString(),
      subjectId,
    };
    const next = [...messages, userMsg];
    setMessages(next);
    setText('');
    setSending(true);
    try {
      const reply = await sendAiMessage(content, next, subjectId);
      setMessages((m) => [...m, reply]);
    } catch {
      setMessages((m) => [
        ...m,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          text: 'تعذر إنشاء رد تجريبي. حاول مرة أخرى.',
          at: new Date().toISOString(),
        },
      ]);
    } finally {
      setSending(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[...t.heroGradient]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroStrip}
      />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <IconBadge name="Bot" color="#fff" bg="rgba(255,255,255,0.18)" size={44} />
            <View style={styles.headerText}>
              <Text style={styles.title}>مساعد المذاكرة</Text>
              <Text style={styles.sub}>ردود تجريبية محلية — ليست نموذجاً حقيقياً</Text>
            </View>
            <Pressable onPress={() => setMessages([])} style={styles.newChat}>
              <Icon name="Plus" size={18} color="#fff" />
            </Pressable>
          </View>
        </View>

        <View style={styles.chips}>
          <ChipSelect
            options={[
              { id: 'none', label: 'عام' },
              ...subjects.map((s) => ({ id: s.id, label: s.name })),
            ]}
            value={subjectId ?? 'none'}
            onChange={(next) =>
              setSubjectId(
                typeof next === 'string' && next !== 'none' ? next : null,
              )
            }
          />
        </View>

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={8}
        >
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <View style={styles.empty}>
                <View style={styles.emptyIcon}>
                  <Icon name="Sparkles" size={32} color={t.brand} />
                </View>
                <Text style={styles.emptyTitle}>اسأل أي سؤال دراسي</Text>
                <Text style={styles.emptySub}>
                  اختر مادة بالأعلى أو ابدأ باقتراح سريع
                </Text>
                <View style={styles.suggestions}>
                  {AI_SUGGESTIONS.map((s) => (
                    <Pressable
                      key={s}
                      style={styles.suggestion}
                      onPress={() => send(s)}
                    >
                      <Icon name="MessageSquare" size={16} color={t.brand} />
                      <Text style={styles.suggestionText}>{s}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            }
            renderItem={({ item }) => (
              <View
                style={[
                  styles.bubble,
                  item.role === 'user' ? styles.userBubble : styles.aiBubble,
                ]}
              >
                {item.role === 'assistant' ? (
                  <View style={styles.aiHead}>
                    <Icon name="Bot" size={14} color={t.brand} />
                    <Text style={styles.aiLabel}>المساعد</Text>
                  </View>
                ) : null}
                <Text
                  style={[
                    styles.bubbleText,
                    item.role === 'user' && styles.userText,
                  ]}
                >
                  {item.text}
                </Text>
              </View>
            )}
            ListFooterComponent={
              sending ? (
                <View style={styles.typing}>
                  <ActivityIndicator size="small" color={t.brand} />
                  <Text style={styles.typingText}>يكتب...</Text>
                </View>
              ) : null
            }
          />

          <View style={styles.composer}>
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={setText}
              placeholder="اكتب سؤالك..."
              placeholderTextColor={t.inkMute}
              multiline
              textAlign="right"
            />
            <Pressable
              onPress={() => send()}
              disabled={!text.trim() || sending}
              style={[
                styles.sendBtn,
                (!text.trim() || sending) && styles.sendDisabled,
              ]}
            >
              <Icon name="ArrowUpRight" size={20} color="#fff" />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: t.canvas },
  heroStrip: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 140,
  },
  safe: { flex: 1, backgroundColor: 'transparent' },
  flex: { flex: 1 },
  header: {
    paddingHorizontal: t.space.lg,
    paddingTop: t.space.sm,
    paddingBottom: t.space.md,
  },
  headerTop: {
    flexDirection: rowRtl,
    alignItems: 'center',
    gap: 12,
  },
  headerText: { flex: 1, gap: 2 },
  title: {
    fontFamily: t.fonts.bold,
    fontSize: 20,
    color: '#fff',
    textAlign: 'right',
  },
  sub: {
    fontFamily: t.fonts.regular,
    fontSize: 12,
    color: 'rgba(255,255,255,0.78)',
    textAlign: 'right',
  },
  newChat: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chips: {
    paddingHorizontal: t.space.lg,
    paddingVertical: t.space.sm,
    backgroundColor: t.canvas,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: 4,
  },
  list: {
    padding: t.space.lg,
    gap: t.space.sm,
    flexGrow: 1,
  },
  empty: {
    alignItems: 'center',
    gap: t.space.md,
    paddingTop: t.space.xl,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: t.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontFamily: t.fonts.bold,
    fontSize: 17,
    color: t.ink,
  },
  emptySub: {
    fontFamily: t.fonts.regular,
    fontSize: 13,
    color: t.inkSoft,
    textAlign: 'center',
  },
  suggestions: { width: '100%', gap: 10, marginTop: 8 },
  suggestion: {
    flexDirection: rowRtl,
    alignItems: 'center',
    gap: 10,
    backgroundColor: t.card,
    borderWidth: 1,
    borderColor: t.line,
    borderRadius: t.radius.lg,
    padding: t.space.md,
    ...t.shadow.card,
  },
  suggestionText: {
    flex: 1,
    fontFamily: t.fonts.medium,
    fontSize: 13,
    color: t.ink,
    textAlign: 'right',
  },
  bubble: {
    maxWidth: '88%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginVertical: 4,
  },
  userBubble: {
    alignSelf: 'flex-start',
    backgroundColor: t.brand,
    borderBottomLeftRadius: 6,
  },
  aiBubble: {
    alignSelf: 'flex-end',
    backgroundColor: t.card,
    borderWidth: 1,
    borderColor: t.line,
    borderBottomRightRadius: 6,
    ...t.shadow.card,
  },
  aiHead: {
    flexDirection: rowRtl,
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  aiLabel: {
    fontFamily: t.fonts.semiBold,
    fontSize: 11,
    color: t.brand,
  },
  bubbleText: {
    fontFamily: t.fonts.regular,
    fontSize: 14,
    color: t.ink,
    lineHeight: 22,
    textAlign: 'right',
  },
  userText: { color: '#fff' },
  typing: {
    flexDirection: rowRtl,
    alignItems: 'center',
    gap: 8,
    paddingVertical: t.space.sm,
  },
  typingText: {
    fontFamily: t.fonts.regular,
    fontSize: 12,
    color: t.inkMute,
  },
  composer: {
    flexDirection: rowRtl,
    alignItems: 'flex-end',
    gap: t.space.sm,
    padding: t.space.md,
    borderTopWidth: 1,
    borderTopColor: t.line,
    backgroundColor: t.card,
  },
  input: {
    flex: 1,
    minHeight: 46,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: t.line,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: t.fonts.regular,
    fontSize: 14,
    color: t.ink,
    backgroundColor: t.canvas,
  },
  sendBtn: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: t.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: { opacity: 0.45 },
});

