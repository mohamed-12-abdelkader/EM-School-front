import { useCallback, useState } from 'react';
import {
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { EmptyState, Icon } from '@/components/ui';
import { parentTheme as t } from '@/components/parent/theme';
import {
  EmptyHint,
  FadeIn,
  LoadingBlock,
  formatShortDate,
  rowRtl,
} from '@/components/parent/ui';
import { StudentPageShell } from '@/components/student/ui';
import { getParentChildMaterial } from '@/services/parentPortal';
import type {
  ParentMaterialAttachment,
  ParentMaterialDetail,
} from '@/types/parentPortal';
import { displayTitle } from '@/utils/displayTitle';

function youtubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1) || null;
    if (u.hostname.includes('youtube.com')) {
      return u.searchParams.get('v') || u.pathname.split('/embed/')[1] || null;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function attachMeta(a: ParentMaterialAttachment) {
  const url = a.fileUrl || '';
  if (a.kind === 'pdf' || /\.pdf/i.test(`${a.filename || ''} ${url}`)) {
    return { icon: 'FileText', label: 'PDF', color: t.danger, soft: t.dangerSoft };
  }
  if (youtubeId(url) || a.kind === 'video') {
    return { icon: 'CirclePlay', label: 'فيديو', color: t.sky, soft: t.skySoft };
  }
  return { icon: 'ArrowUpRight', label: 'رابط', color: t.brand, soft: t.brandSoft };
}

async function openUrl(url: string) {
  if (!url) return;
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }
  await Linking.openURL(url);
}

export default function ParentMaterialDetailScreen() {
  const { childId, subjectId } = useLocalSearchParams<{
    childId: string;
    subjectId: string;
  }>();
  const [data, setData] = useState<ParentMaterialDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [playingId, setPlayingId] = useState<string | null>(null);

  const load = useCallback(
    async (soft = false) => {
      if (!childId || !subjectId) return;
      if (soft) setRefreshing(true);
      else setLoading(true);
      setError('');
      try {
        setData(await getParentChildMaterial(String(childId), String(subjectId)));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'تعذر تحميل المادة');
        if (!soft) setData(null);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [childId, subjectId],
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const material = data?.material;

  if (loading) {
    return (
      <StudentPageShell title="المادة" icon="BookOpen">
        <LoadingBlock label="جارٍ تحميل محتوى المادة..." />
      </StudentPageShell>
    );
  }

  if (!material) {
    return (
      <StudentPageShell title="المادة" icon="BookOpen">
        <EmptyState
          icon="BookOpen"
          title="المادة غير موجودة"
          description={error || 'لا دروس منشورة لهذه المادة'}
          actionLabel="إعادة المحاولة"
          onAction={() => load()}
        />
      </StudentPageShell>
    );
  }

  return (
    <StudentPageShell
      title={material.name}
      subtitle={`المعلّم ${material.teacherName} · ${data?.lessons.length || 0} درس`}
      icon="BookOpen"
      refreshing={refreshing}
      onRefresh={() => load(true)}
    >
      <FadeIn>
        <View style={[styles.hero, { flexDirection: rowRtl as 'row' }]}>
          <View style={styles.heroIcon}>
            <Icon name="BookOpen" size={22} color={t.guardian} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>{material.name}</Text>
            <Text style={styles.heroMeta}>
              المادة: {material.subjectName} · المعلّم: {material.teacherName}
            </Text>
          </View>
        </View>
      </FadeIn>

      {!data?.lessons.length ? (
        <EmptyHint title="لا دروس بعد" body="لم ينشر المعلّم دروساً داخل هذه المادة بعد." />
      ) : (
        <View style={styles.lessons}>
          {data.lessons.map((lesson, i) => (
            <FadeIn key={lesson.id} delay={Math.min(i, 8) * 40} style={styles.lessonCard}>
              <View style={[styles.lessonHead, { flexDirection: rowRtl as 'row' }]}>
                <View style={styles.lessonBadge}>
                  <Icon name="Presentation" size={16} color={t.guardian} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.lessonTitle}>
                    {displayTitle(lesson.title, 'درس')}
                  </Text>
                  <Text style={styles.lessonDate}>
                    {formatShortDate(lesson.createdAt)}
                    {lesson.attachments.length
                      ? ` · ${lesson.attachments.length} مرفق`
                      : ''}
                  </Text>
                </View>
              </View>

              {lesson.description ? (
                <Text style={styles.lessonDesc}>{lesson.description}</Text>
              ) : null}

              {lesson.attachments.length === 0 ? (
                <Text style={styles.noAtt}>لا مرفقات لهذا الدرس</Text>
              ) : (
                <View style={styles.attList}>
                  {lesson.attachments.map((att) => {
                    const meta = attachMeta(att);
                    const yt = youtubeId(att.fileUrl);
                    const isPlaying = playingId === att.id;
                    const canInline =
                      Platform.OS === 'web' &&
                      (Boolean(yt) ||
                        att.kind === 'video' ||
                        /\.(mp4|webm|ogg|mov)(\?|$)/i.test(att.fileUrl));

                    return (
                      <View key={att.id} style={styles.attCard}>
                        <Pressable
                          onPress={() => {
                            if (canInline) {
                              setPlayingId((cur) => (cur === att.id ? null : att.id));
                              return;
                            }
                            void openUrl(att.fileUrl);
                          }}
                          style={[styles.attRow, { flexDirection: rowRtl as 'row' }]}
                        >
                          <View style={[styles.attIcon, { backgroundColor: meta.soft }]}>
                            <Icon name={meta.icon} size={18} color={meta.color} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.attTitle} numberOfLines={2}>
                              {displayTitle(att.title, meta.label)}
                            </Text>
                            <Text style={styles.attMeta}>
                              {meta.label}
                              {att.filename ? ` · ${att.filename}` : ''}
                            </Text>
                          </View>
                          <Text style={[styles.attCta, { color: meta.color }]}>
                            {canInline ? (isPlaying ? 'إخفاء' : 'تشغيل') : 'فتح'}
                          </Text>
                        </Pressable>

                        {isPlaying && Platform.OS === 'web' ? (
                          <View style={styles.player}>
                            {yt ? (
                              <iframe
                                title={att.title}
                                src={`https://www.youtube.com/embed/${yt}?autoplay=1`}
                                style={styles.iframe as object}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              />
                            ) : (
                              // eslint-disable-next-line jsx-a11y/media-has-caption
                              <video
                                key={att.fileUrl}
                                src={att.fileUrl}
                                controls
                                autoPlay
                                style={styles.video as object}
                              />
                            )}
                          </View>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              )}
            </FadeIn>
          ))}
        </View>
      )}
    </StudentPageShell>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    gap: 12,
    backgroundColor: t.guardianSoft,
    borderRadius: t.radius.xl,
    padding: 14,
    borderWidth: 1,
    borderColor: '#99F6E4',
    marginBottom: 8,
  },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: t.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontFamily: t.fonts.bold,
    fontSize: 18,
    color: t.ink,
    textAlign: 'right',
  },
  heroMeta: {
    fontFamily: t.fonts.regular,
    fontSize: 12,
    color: t.inkSoft,
    textAlign: 'right',
    marginTop: 4,
  },
  lessons: { gap: 12, marginTop: 8 },
  lessonCard: {
    backgroundColor: t.card,
    borderRadius: t.radius.lg,
    borderWidth: 1,
    borderColor: t.line,
    padding: 14,
    gap: 10,
    ...t.shadow.card,
  },
  lessonHead: { alignItems: 'center', gap: 10 },
  lessonBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: t.guardianSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lessonTitle: {
    fontFamily: t.fonts.semiBold,
    fontSize: 15,
    color: t.ink,
    textAlign: 'right',
  },
  lessonDate: {
    fontFamily: t.fonts.regular,
    fontSize: 12,
    color: t.inkMute,
    textAlign: 'right',
    marginTop: 2,
  },
  lessonDesc: {
    fontFamily: t.fonts.regular,
    fontSize: 13,
    color: t.inkSoft,
    textAlign: 'right',
    lineHeight: 20,
  },
  noAtt: {
    fontFamily: t.fonts.regular,
    fontSize: 12,
    color: t.inkMute,
    textAlign: 'right',
  },
  attList: { gap: 8 },
  attCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: t.line,
    overflow: 'hidden',
    backgroundColor: t.cardMuted,
  },
  attRow: {
    alignItems: 'center',
    gap: 10,
    padding: 10,
  },
  attIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attTitle: {
    fontFamily: t.fonts.semiBold,
    fontSize: 13,
    color: t.ink,
    textAlign: 'right',
  },
  attMeta: {
    fontFamily: t.fonts.regular,
    fontSize: 11,
    color: t.inkMute,
    textAlign: 'right',
    marginTop: 2,
  },
  attCta: {
    fontFamily: t.fonts.semiBold,
    fontSize: 12,
  },
  player: {
    borderTopWidth: 1,
    borderTopColor: t.line,
    backgroundColor: '#0F172A',
    aspectRatio: 16 / 9,
  },
  iframe: { width: '100%', height: '100%', borderWidth: 0 },
  video: { width: '100%', height: '100%' },
});
