import { useCallback, useMemo, useState } from 'react';
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
import { getParentChildLesson } from '@/services/parentPortal';
import type { ParentLessonDetail } from '@/types/parentPortal';
import { displayTitle } from '@/utils/displayTitle';

type Attachment = ParentLessonDetail['attachments'][number];

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

function isDirectVideo(url: string) {
  return /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url);
}

function isPdf(a: Attachment) {
  if (a.kind === 'pdf') return true;
  const name = `${a.filename || ''} ${a.fileUrl || ''}`.toLowerCase();
  return name.includes('.pdf');
}

function attachKind(a: Attachment): 'pdf' | 'youtube' | 'video' | 'link' {
  if (isPdf(a)) return 'pdf';
  if (youtubeId(a.fileUrl)) return 'youtube';
  if (a.kind === 'video' || isDirectVideo(a.fileUrl)) return 'video';
  return 'link';
}

function kindMeta(kind: ReturnType<typeof attachKind>) {
  switch (kind) {
    case 'pdf':
      return { icon: 'FileText', label: 'PDF', color: t.danger, soft: t.dangerSoft };
    case 'youtube':
      return { icon: 'CirclePlay', label: 'يوتيوب', color: '#DC2626', soft: '#FEE2E2' };
    case 'video':
      return { icon: 'Play', label: 'فيديو', color: t.sky, soft: t.skySoft };
    default:
      return { icon: 'ArrowUpRight', label: 'رابط', color: t.brand, soft: t.brandSoft };
  }
}

async function openAttachment(url: string) {
  if (!url) return;
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }
  await Linking.openURL(url);
}

export default function ParentLessonDetailScreen() {
  const { childId, id } = useLocalSearchParams<{ childId: string; id: string }>();
  const [data, setData] = useState<ParentLessonDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [playingId, setPlayingId] = useState<string | null>(null);

  const load = useCallback(
    async (soft = false) => {
      if (!childId || !id) return;
      if (soft) setRefreshing(true);
      else setLoading(true);
      setError('');
      try {
        setData(await getParentChildLesson(String(childId), String(id)));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'تعذر تحميل الدرس');
        if (!soft) setData(null);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [childId, id],
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const lesson = data?.lesson;
  const groups = useMemo(() => {
    const list = data?.attachments || [];
    const videos = list.filter((a) => {
      const k = attachKind(a);
      return k === 'video' || k === 'youtube';
    });
    const pdfs = list.filter((a) => attachKind(a) === 'pdf');
    const links = list.filter((a) => attachKind(a) === 'link');
    return { videos, pdfs, links, all: list };
  }, [data]);

  if (loading) {
    return (
      <StudentPageShell title="تفاصيل الدرس" icon="BookOpen">
        <LoadingBlock label="جارٍ تحميل محتوى الدرس..." />
      </StudentPageShell>
    );
  }

  if (!lesson) {
    return (
      <StudentPageShell title="تفاصيل الدرس" icon="BookOpen" onRefresh={() => load()}>
        <EmptyState
          icon="BookOpen"
          title="الدرس غير موجود"
          description={error || 'قد يكون الدرس محذوفاً أو غير متاح لصف ابنك'}
          actionLabel="إعادة المحاولة"
          onAction={() => load()}
        />
      </StudentPageShell>
    );
  }

  const title = displayTitle(lesson.title, 'درس');
  const description = (lesson.description || '').trim();

  return (
    <StudentPageShell
      title={title}
      subtitle={`${lesson.subjectName} · المعلّم ${lesson.teacherName}`}
      icon="BookOpen"
      refreshing={refreshing}
      onRefresh={() => load(true)}
    >
      <FadeIn>
        <View style={styles.hero}>
          <View style={styles.heroAccent} />
          <View style={styles.heroBody}>
            <View style={[styles.heroTop, { flexDirection: rowRtl as 'row' }]}>
              <View style={styles.badge}>
                <Icon name="BookOpen" size={14} color={t.guardian} />
                <Text style={styles.badgeText}>مادة دراسية</Text>
              </View>
              <Text style={styles.date}>{formatShortDate(lesson.createdAt)}</Text>
            </View>

            <Text style={styles.heroTitle}>{title}</Text>

            <View style={[styles.teacherRow, { flexDirection: rowRtl as 'row' }]}>
              <View style={styles.teacherIcon}>
                <Icon name="UserCheck" size={16} color={t.guardian} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.teacherLabel}>المعلّم</Text>
                <Text style={styles.teacherName}>{lesson.teacherName}</Text>
              </View>
              <View style={styles.subjectPill}>
                <Text style={styles.subjectPillText}>{lesson.subjectName}</Text>
              </View>
            </View>

            {description ? <Text style={styles.summary}>{description}</Text> : null}

            <View style={styles.stats}>
              <Stat value={groups.videos.length} label="فيديو" color={t.sky} soft={t.skySoft} />
              <Stat
                value={groups.pdfs.length}
                label="PDF"
                color={t.danger}
                soft={t.dangerSoft}
              />
              <Stat
                value={groups.links.length}
                label="روابط"
                color={t.brand}
                soft={t.brandSoft}
              />
            </View>
          </View>
        </View>
      </FadeIn>

      {groups.all.length === 0 ? (
        <EmptyHint
          title="لا مرفقات بعد"
          body="عندما يرفع المعلّم فيديو أو PDF أو رابط لهذا الدرس سيظهر هنا."
        />
      ) : (
        <>
          {groups.videos.length > 0 ? (
            <Section
              title="الفيديوهات"
              hint="اضغط للتشغيل أو الفتح"
              items={groups.videos}
              playingId={playingId}
              onPlay={(a) => {
                const yt = youtubeId(a.fileUrl);
                if (Platform.OS === 'web' && (yt || isDirectVideo(a.fileUrl))) {
                  setPlayingId((cur) => (cur === a.id ? null : a.id));
                  return;
                }
                void openAttachment(a.fileUrl);
              }}
              onOpen={openAttachment}
            />
          ) : null}
          {groups.pdfs.length > 0 ? (
            <Section
              title="ملفات PDF"
              hint="افتح للقراءة أو التحميل"
              items={groups.pdfs}
              onOpen={openAttachment}
            />
          ) : null}
          {groups.links.length > 0 ? (
            <Section
              title="روابط مفيدة"
              hint="تفتح في نافذة جديدة"
              items={groups.links}
              onOpen={openAttachment}
            />
          ) : null}
        </>
      )}
    </StudentPageShell>
  );
}

function Stat({
  value,
  label,
  color,
  soft,
}: {
  value: number;
  label: string;
  color: string;
  soft: string;
}) {
  return (
    <View style={[styles.stat, { backgroundColor: soft }]}>
      <Text style={[styles.statNum, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Section({
  title,
  hint,
  items,
  playingId,
  onPlay,
  onOpen,
}: {
  title: string;
  hint?: string;
  items: Attachment[];
  playingId?: string | null;
  onPlay?: (a: Attachment) => void;
  onOpen: (url: string) => void | Promise<void>;
}) {
  return (
    <View style={styles.section}>
      <View style={[styles.sectionHead, { flexDirection: rowRtl as 'row' }]}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {hint ? <Text style={styles.sectionHint}>{hint}</Text> : null}
      </View>
      <View style={styles.list}>
        {items.map((a, i) => {
          const kind = attachKind(a);
          const meta = kindMeta(kind);
          const label = displayTitle(a.title, meta.label);
          const yt = youtubeId(a.fileUrl);
          const isPlaying = playingId === a.id;
          const canInline =
            Platform.OS === 'web' &&
            (kind === 'video' || kind === 'youtube') &&
            !!onPlay;

          return (
            <FadeIn key={a.id} delay={i * 40}>
              <View style={styles.attachCard}>
                <Pressable
                  onPress={() => (canInline ? onPlay?.(a) : void onOpen(a.fileUrl))}
                  style={({ pressed }) => [
                    styles.attachRow,
                    { flexDirection: rowRtl as 'row' },
                    pressed && { opacity: 0.94 },
                  ]}
                >
                  <View style={[styles.attachIcon, { backgroundColor: meta.soft }]}>
                    <Icon name={meta.icon} size={20} color={meta.color} />
                  </View>
                  <View style={styles.attachBody}>
                    <Text style={styles.attachTitle} numberOfLines={2}>
                      {label}
                    </Text>
                    <Text style={styles.attachMeta} numberOfLines={1}>
                      {meta.label}
                      {a.filename ? ` · ${a.filename}` : ''}
                    </Text>
                  </View>
                  <View style={[styles.ctaPill, { backgroundColor: meta.soft }]}>
                    <Text style={[styles.ctaText, { color: meta.color }]}>
                      {canInline ? (isPlaying ? 'إخفاء' : 'تشغيل') : 'فتح'}
                    </Text>
                  </View>
                </Pressable>

                {isPlaying && Platform.OS === 'web' ? (
                  <View style={styles.player}>
                    {yt ? (
                      <iframe
                        title={label}
                        src={`https://www.youtube.com/embed/${yt}?autoplay=1`}
                        style={styles.iframe as object}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      // eslint-disable-next-line jsx-a11y/media-has-caption
                      <video
                        key={a.fileUrl}
                        src={a.fileUrl}
                        controls
                        autoPlay
                        style={styles.video as object}
                      />
                    )}
                  </View>
                ) : null}
              </View>
            </FadeIn>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: t.card,
    borderRadius: t.radius.xl,
    borderWidth: 1,
    borderColor: t.line,
    overflow: 'hidden',
    ...t.shadow.card,
  },
  heroAccent: {
    height: 4,
    backgroundColor: t.guardian,
  },
  heroBody: {
    padding: 16,
    gap: 12,
  },
  heroTop: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badge: {
    flexDirection: rowRtl as 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: t.guardianSoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: t.radius.full,
  },
  badgeText: {
    fontFamily: t.fonts.semiBold,
    fontSize: 12,
    color: t.guardian,
  },
  date: {
    fontFamily: t.fonts.regular,
    fontSize: 12,
    color: t.inkMute,
  },
  heroTitle: {
    fontFamily: t.fonts.bold,
    fontSize: 20,
    color: t.ink,
    textAlign: 'right',
    lineHeight: 28,
  },
  teacherRow: {
    alignItems: 'center',
    gap: 10,
    backgroundColor: t.guardianSoft,
    borderRadius: 14,
    padding: 10,
  },
  teacherIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: t.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teacherLabel: {
    fontFamily: t.fonts.regular,
    fontSize: 11,
    color: t.guardianDeep,
    textAlign: 'right',
  },
  teacherName: {
    fontFamily: t.fonts.bold,
    fontSize: 15,
    color: t.ink,
    textAlign: 'right',
  },
  subjectPill: {
    backgroundColor: t.card,
    borderRadius: t.radius.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  subjectPillText: {
    fontFamily: t.fonts.semiBold,
    fontSize: 12,
    color: t.inkSoft,
  },
  summary: {
    fontFamily: t.fonts.regular,
    fontSize: 14,
    color: t.inkSoft,
    textAlign: 'right',
    lineHeight: 22,
  },
  stats: {
    flexDirection: rowRtl as 'row',
    gap: 8,
  },
  stat: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 2,
  },
  statNum: {
    fontFamily: t.fonts.bold,
    fontSize: 18,
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontFamily: t.fonts.medium,
    fontSize: 11,
    color: t.inkMute,
  },
  section: {
    marginTop: 16,
    gap: 10,
  },
  sectionHead: {
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 8,
  },
  sectionTitle: {
    fontFamily: t.fonts.bold,
    fontSize: 16,
    color: t.ink,
    textAlign: 'right',
  },
  sectionHint: {
    fontFamily: t.fonts.regular,
    fontSize: 12,
    color: t.inkMute,
  },
  list: { gap: 8 },
  attachCard: {
    backgroundColor: t.card,
    borderRadius: t.radius.lg,
    borderWidth: 1,
    borderColor: t.line,
    overflow: 'hidden',
    ...t.shadow.card,
  },
  attachRow: {
    alignItems: 'center',
    gap: 12,
    padding: 12,
  },
  attachIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachBody: { flex: 1 },
  attachTitle: {
    fontFamily: t.fonts.semiBold,
    fontSize: 14,
    color: t.ink,
    textAlign: 'right',
  },
  attachMeta: {
    fontFamily: t.fonts.regular,
    fontSize: 12,
    color: t.inkMute,
    textAlign: 'right',
    marginTop: 2,
  },
  ctaPill: {
    borderRadius: t.radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  ctaText: {
    fontFamily: t.fonts.semiBold,
    fontSize: 12,
  },
  player: {
    borderTopWidth: 1,
    borderTopColor: t.line,
    backgroundColor: '#0F172A',
    aspectRatio: 16 / 9,
  },
  iframe: {
    width: '100%',
    height: '100%',
    borderWidth: 0,
  },
  video: {
    width: '100%',
    height: '100%',
  },
});
