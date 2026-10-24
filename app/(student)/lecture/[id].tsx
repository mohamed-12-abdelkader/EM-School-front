import { useCallback, useMemo, useState } from 'react';
import {
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { EmptyState, Icon } from '@/components/ui';
import {
  FadeIn,
  IconBadge,
  LoadingBlock,
  StudentPageShell,
  formatShortDate,
  rowRtl,
} from '@/components/student/ui';
import { studentTheme as t } from '@/components/student/theme';
import { getLecture, getSubject } from '@/services/studentPortal';
import type { Lecture } from '@/types/studentPortal';
import type { LessonAttachment } from '@/services/studentPortal';
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

function isDirectVideo(url: string) {
  return /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url);
}

function isPdf(a: LessonAttachment) {
  if (a.kind === 'pdf') return true;
  const name = `${a.filename || ''} ${a.fileUrl || ''}`.toLowerCase();
  return name.includes('.pdf');
}

function attachKind(a: LessonAttachment): 'pdf' | 'youtube' | 'video' | 'link' {
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

export default function LectureDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [lecture, setLecture] = useState<
    (Lecture & { attachments?: LessonAttachment[]; subjectName?: string }) | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setLecture(await getLecture(String(id)));
    } catch (e) {
      setLecture(null);
      setError(e instanceof Error ? e.message : 'تعذر تحميل الدرس');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const subject = lecture ? getSubject(lecture.subjectId) : undefined;
  const subjectName =
    (lecture as { subjectName?: string } | null)?.subjectName ||
    subject?.name ||
    'مادة';
  const accent = subject?.color || t.brand;

  const groups = useMemo(() => {
    const list = lecture?.attachments || [];
    const videos = list.filter((a) => {
      const k = attachKind(a);
      return k === 'video' || k === 'youtube';
    });
    const pdfs = list.filter((a) => attachKind(a) === 'pdf');
    const links = list.filter((a) => attachKind(a) === 'link');
    return { videos, pdfs, links, all: list };
  }, [lecture]);

  if (loading) {
    return (
      <StudentPageShell title="الدرس" icon="Presentation">
        <LoadingBlock />
      </StudentPageShell>
    );
  }

  if (!lecture) {
    return (
      <StudentPageShell title="الدرس" icon="Presentation">
        <EmptyState
          icon="Presentation"
          title="الدرس غير موجود"
          description={error || 'تأكد أن الدرس منشور لفصلك من المدرس'}
          actionLabel="إعادة المحاولة"
          onAction={load}
        />
      </StudentPageShell>
    );
  }

  const title = displayTitle(lecture.title, 'درس');
  const summary = displayTitle(lecture.summary || '', '');

  return (
    <StudentPageShell
      title={title}
      subtitle={subjectName}
      icon="Presentation"
      refreshing={false}
      onRefresh={load}
    >
      <FadeIn>
        <View style={styles.hero}>
          <View style={[styles.heroAccent, { backgroundColor: accent }]} />
          <View style={styles.heroBody}>
            <View style={[styles.heroTop, { flexDirection: rowRtl as 'row' }]}>
              <View style={[styles.badge, { backgroundColor: `${accent}18` }]}>
                <Icon name="Presentation" size={14} color={accent} />
                <Text style={[styles.badgeText, { color: accent }]}>
                  درس مسجّل
                </Text>
              </View>
              <Text style={styles.date}>{formatShortDate(lecture.date)}</Text>
            </View>

            <Text style={styles.heroTitle}>{title}</Text>
            {summary ? <Text style={styles.summary}>{summary}</Text> : null}

            <View style={styles.stats}>
              <Stat
                value={groups.videos.length}
                label="فيديو"
                color={t.sky}
                soft={t.skySoft}
              />
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
        <EmptyState
          icon="FolderOpen"
          title="لا مرفقات بعد"
          description="عندما يرفع المدرس فيديو أو PDF أو رابط سيظهر هنا"
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
                openAttachment(a.fileUrl);
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

      <Pressable
        style={({ pressed }) => [
          styles.subjectBtn,
          { flexDirection: rowRtl as 'row' },
          pressed && { opacity: 0.92 },
        ]}
        onPress={() =>
          router.push(`/(student)/subject/${lecture.subjectId}` as never)
        }
      >
        <IconBadge name="BookOpen" color={accent} size={44} />
        <View style={styles.subjectText}>
          <Text style={styles.subjectBtnText}>عرض المادة</Text>
          <Text style={styles.subjectSub}>{subjectName}</Text>
        </View>
        <Icon name="ChevronLeft" size={18} color={t.inkMute} />
      </Pressable>
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
    <View style={[styles.stat, { backgroundColor: soft, borderColor: soft }]}>
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
  items: LessonAttachment[];
  playingId?: string | null;
  onPlay?: (a: LessonAttachment) => void;
  onOpen: (url: string) => void;
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
                  onPress={() =>
                    canInline ? onPlay?.(a) : onOpen(a.fileUrl)
                  }
                  style={({ pressed }) => [
                    styles.attachRow,
                    { flexDirection: rowRtl as 'row' },
                    pressed && { opacity: 0.94 },
                  ]}
                >
                  <View
                    style={[styles.attachIcon, { backgroundColor: meta.soft }]}
                  >
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
                  <View
                    style={[
                      styles.ctaPill,
                      { backgroundColor: meta.soft },
                    ]}
                  >
                    <Text style={[styles.ctaText, { color: meta.color }]}>
                      {canInline
                        ? isPlaying
                          ? 'إخفاء'
                          : 'تشغيل'
                        : 'فتح'}
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
  heroAccent: { height: 5 },
  heroBody: {
    padding: t.space.lg,
    gap: 12,
  },
  heroTop: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badge: {
    flexDirection: rowRtl,
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: t.radius.full,
  },
  badgeText: {
    fontFamily: t.fonts.semiBold,
    fontSize: 12,
  },
  date: {
    fontFamily: t.fonts.medium,
    fontSize: 12,
    color: t.inkMute,
    fontVariant: ['tabular-nums'],
  },
  heroTitle: {
    fontFamily: t.fonts.bold,
    fontSize: 22,
    color: t.ink,
    textAlign: 'right',
    letterSpacing: -0.3,
    lineHeight: 30,
  },
  summary: {
    fontFamily: t.fonts.regular,
    fontSize: 14,
    color: t.inkSoft,
    textAlign: 'right',
    lineHeight: 22,
  },
  stats: {
    flexDirection: rowRtl,
    gap: 8,
    marginTop: 4,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    borderRadius: t.radius.lg,
    borderWidth: 1,
    paddingVertical: 12,
    gap: 2,
  },
  statNum: {
    fontFamily: t.fonts.bold,
    fontSize: 20,
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontFamily: t.fonts.medium,
    fontSize: 11,
    color: t.inkMute,
  },
  section: { gap: 10 },
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
    fontSize: 11,
    color: t.inkMute,
  },
  list: { gap: 10 },
  attachCard: {
    backgroundColor: t.card,
    borderRadius: t.radius.xl,
    borderWidth: 1,
    borderColor: t.line,
    overflow: 'hidden',
    ...t.shadow.card,
  },
  attachRow: {
    alignItems: 'center',
    gap: 12,
    padding: t.space.md,
  },
  attachIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachBody: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  attachTitle: {
    fontFamily: t.fonts.bold,
    fontSize: 15,
    color: t.ink,
    textAlign: 'right',
  },
  attachMeta: {
    fontFamily: t.fonts.regular,
    fontSize: 12,
    color: t.inkMute,
    textAlign: 'right',
  },
  ctaPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: t.radius.full,
  },
  ctaText: {
    fontFamily: t.fonts.semiBold,
    fontSize: 12,
  },
  player: {
    backgroundColor: '#0F172A',
    aspectRatio: 16 / 9,
    width: '100%',
  },
  iframe: {
    width: '100%',
    height: '100%',
    border: 'none',
  },
  video: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    backgroundColor: '#000',
  },
  subjectBtn: {
    alignItems: 'center',
    gap: 12,
    backgroundColor: t.card,
    borderWidth: 1,
    borderColor: t.line,
    borderRadius: t.radius.xl,
    padding: t.space.md,
    ...t.shadow.card,
  },
  subjectText: { flex: 1, gap: 2 },
  subjectBtnText: {
    fontFamily: t.fonts.bold,
    fontSize: 15,
    color: t.ink,
    textAlign: 'right',
  },
  subjectSub: {
    fontFamily: t.fonts.regular,
    fontSize: 12,
    color: t.inkMute,
    textAlign: 'right',
  },
});
