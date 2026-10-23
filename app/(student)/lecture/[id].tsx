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
  LoadingBlock,
  SoftCard,
  StudentScreen,
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
      return { icon: 'FileText', label: 'PDF', color: t.danger, bg: '#FEE2E2' };
    case 'youtube':
      return { icon: 'CirclePlay', label: 'يوتيوب', color: '#DC2626', bg: '#FEE2E2' };
    case 'video':
      return { icon: 'Play', label: 'فيديو', color: t.sky, bg: t.skySoft };
    default:
      return { icon: 'ArrowUpRight', label: 'رابط', color: t.brand, bg: t.brandSoft };
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

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        setLoading(true);
        setError(null);
        try {
          const data = await getLecture(String(id));
          if (alive) setLecture(data);
        } catch (e) {
          if (alive) {
            setLecture(null);
            setError(e instanceof Error ? e.message : 'تعذر تحميل الدرس');
          }
        } finally {
          if (alive) setLoading(false);
        }
      })();
      return () => {
        alive = false;
      };
    }, [id]),
  );

  const subject = lecture ? getSubject(lecture.subjectId) : undefined;
  const subjectName =
    (lecture as { subjectName?: string } | null)?.subjectName ||
    subject?.name ||
    'مادة';

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
      <StudentScreen title="الدرس" onBack hero>
        <LoadingBlock />
      </StudentScreen>
    );
  }

  if (!lecture) {
    return (
      <StudentScreen title="الدرس" onBack hero>
        <EmptyState
          icon="Presentation"
          title="الدرس غير موجود"
          description={error || 'تأكد أن الدرس منشور لفصلك من المدرس'}
        />
      </StudentScreen>
    );
  }

  const title = displayTitle(lecture.title, 'درس');
  const summary = displayTitle(lecture.summary || '', '');

  return (
    <StudentScreen title={title} subtitle={subjectName} onBack hero>
      <FadeIn>
        <SoftCard style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={styles.badge}>
              <Icon name="Presentation" size={14} color={t.brand} />
              <Text style={styles.badgeText}>درس مسجّل</Text>
            </View>
            <Text style={styles.date}>{formatShortDate(lecture.date)}</Text>
          </View>
          <Text style={styles.heroTitle}>{title}</Text>
          {summary ? <Text style={styles.summary}>{summary}</Text> : null}
          <View style={styles.stats}>
            <View style={styles.stat}>
              <Text style={styles.statNum}>{groups.videos.length}</Text>
              <Text style={styles.statLabel}>فيديو</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statNum}>{groups.pdfs.length}</Text>
              <Text style={styles.statLabel}>PDF</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statNum}>{groups.links.length}</Text>
              <Text style={styles.statLabel}>روابط</Text>
            </View>
          </View>
        </SoftCard>
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
              title="فيديوهات"
              items={groups.videos}
              onOpen={openAttachment}
            />
          ) : null}
          {groups.pdfs.length > 0 ? (
            <Section
              title="ملفات PDF"
              items={groups.pdfs}
              onOpen={openAttachment}
            />
          ) : null}
          {groups.links.length > 0 ? (
            <Section
              title="روابط"
              items={groups.links}
              onOpen={openAttachment}
            />
          ) : null}
        </>
      )}

      <Pressable
        style={({ pressed }) => [styles.subjectBtn, pressed && { opacity: 0.9 }]}
        onPress={() =>
          router.push(`/(student)/subject/${lecture.subjectId}` as never)
        }
      >
        <Icon name="BookOpen" size={18} color={t.brand} />
        <Text style={styles.subjectBtnText}>عرض المادة</Text>
        <Icon name="ChevronLeft" size={18} color={t.inkMute} />
      </Pressable>
    </StudentScreen>
  );
}

function Section({
  title,
  items,
  onOpen,
}: {
  title: string;
  items: LessonAttachment[];
  onOpen: (url: string) => void;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {items.map((a, i) => {
        const kind = attachKind(a);
        const meta = kindMeta(kind);
        const label = displayTitle(a.title, meta.label);
        return (
          <FadeIn key={a.id} delay={i * 40}>
            <SoftCard
              padded={false}
              onPress={() => onOpen(a.fileUrl)}
              style={styles.attachCard}
            >
              <View style={styles.attachRow}>
                <View style={[styles.attachIcon, { backgroundColor: meta.bg }]}>
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
                <Icon name="ChevronLeft" size={18} color={t.inkMute} />
              </View>
            </SoftCard>
          </FadeIn>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: 10,
    ...t.shadow.card,
  },
  heroTop: {
    flexDirection: rowRtl,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badge: {
    flexDirection: rowRtl,
    alignItems: 'center',
    gap: 6,
    backgroundColor: t.brandSoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: t.radius.full,
  },
  badgeText: {
    fontFamily: t.fonts.semiBold,
    fontSize: 12,
    color: t.brand,
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
    backgroundColor: t.cardMuted,
    borderRadius: t.radius.lg,
    paddingVertical: 10,
    gap: 2,
  },
  statNum: {
    fontFamily: t.fonts.bold,
    fontSize: 18,
    color: t.ink,
  },
  statLabel: {
    fontFamily: t.fonts.regular,
    fontSize: 11,
    color: t.inkMute,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontFamily: t.fonts.bold,
    fontSize: 16,
    color: t.ink,
    textAlign: 'right',
  },
  attachCard: {
    overflow: 'hidden',
  },
  attachRow: {
    flexDirection: rowRtl,
    alignItems: 'center',
    gap: 12,
    padding: t.space.lg,
  },
  attachIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachBody: {
    flex: 1,
    gap: 3,
  },
  attachTitle: {
    fontFamily: t.fonts.semiBold,
    fontSize: 15,
    color: t.ink,
    textAlign: 'right',
  },
  attachMeta: {
    fontFamily: t.fonts.regular,
    fontSize: 12,
    color: t.inkSoft,
    textAlign: 'right',
  },
  subjectBtn: {
    flexDirection: rowRtl,
    alignItems: 'center',
    gap: 10,
    backgroundColor: t.card,
    borderWidth: 1,
    borderColor: t.line,
    borderRadius: t.radius.xl,
    padding: t.space.lg,
  },
  subjectBtnText: {
    flex: 1,
    fontFamily: t.fonts.semiBold,
    fontSize: 15,
    color: t.ink,
    textAlign: 'right',
  },
});
