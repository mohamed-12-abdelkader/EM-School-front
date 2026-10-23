import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Button, Input, Icon, useToast } from '@/components/ui';
import {
  EmptyBlock,
  FadeIn,
  LoadingBlock,
  SoftCard,
  TeacherScreen,
  rowRtl,
} from '@/components/teacher/ui';
import { teacherTheme as t } from '@/components/teacher/theme';
import {
  addLessonAttachment,
  deleteLessonAttachment,
  deleteTeacherLesson,
  getTeacherLesson,
  updateLessonAttachment,
  updateTeacherLesson,
} from '@/api/teacherPortal';
import type { TeacherAttachment, TeacherLesson } from '@/types/teacherPortal';

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

function isPdfAttachment(kind: string, url: string, filename?: string | null) {
  if (kind === 'pdf') return true;
  const name = `${filename || ''} ${url || ''}`.toLowerCase();
  return name.includes('.pdf') || name.includes('application/pdf');
}

function resolveKind(
  kind: string,
  url: string,
  filename?: string | null,
): 'video' | 'pdf' {
  if (isPdfAttachment(kind, url, filename)) return 'pdf';
  if (kind === 'video' || youtubeId(url) || isDirectVideo(url)) return 'video';
  return kind === 'pdf' ? 'pdf' : 'video';
}

async function downloadFile(url: string, filename: string) {
  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    await Linking.openURL(url);
    return;
  }
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) throw new Error('download failed');
    const blob = await res.blob();
    const href = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = href;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(href);
  } catch {
    // Fallback: open in new tab so the browser can save
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

/** Web-only PDF preview via blob URL (cross-origin iframe PDFs often stay blank). */
function PdfPreview({
  url,
  title,
  heightPx,
}: {
  url: string;
  title: string;
  heightPx: number;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(url, { mode: 'cors' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        const pdfBlob =
          blob.type === 'application/pdf'
            ? blob
            : new Blob([blob], { type: 'application/pdf' });
        objectUrl = URL.createObjectURL(pdfBlob);
        if (!cancelled) setSrc(objectUrl);
      } catch {
        if (!cancelled) {
          setFailed(true);
          setSrc(url);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url]);

  if (!src) {
    return (
      <View style={styles.pdfLoading}>
        <ActivityIndicator color={t.brand} size="large" />
        <Text style={styles.pdfLoadingText}>جارٍ تحميل ملف PDF...</Text>
      </View>
    );
  }

  if (Platform.OS !== 'web') {
    return (
      <View style={styles.fallbackOpen}>
        <Button label="فتح PDF" onPress={() => Linking.openURL(url)} />
      </View>
    );
  }

  const embedSrc = `${src}#toolbar=1&navpanes=0&scrollbar=1`;

  return (
    <div
      style={{
        width: '100%',
        height: heightPx,
        background: '#F8FAFC',
        borderRadius: 16,
        overflow: 'hidden',
        border: '1px solid #E2E8F0',
      }}
    >
      {/* object is more reliable than iframe for PDF preview in Chromium */}
      <object data={embedSrc} type="application/pdf" width="100%" height="100%">
        <iframe
          title={title}
          src={embedSrc}
          width="100%"
          height="100%"
          style={{ border: 0 }}
        />
        {failed ? (
          <div style={{ padding: 24, textAlign: 'center', fontFamily: 'Cairo, sans-serif' }}>
            تعذر عرض الملف هنا — استخدم زر التحميل أو التبويب الجديد
          </div>
        ) : null}
      </object>
    </div>
  );
}

export default function LessonDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();
  const { width, height } = useWindowDimensions();

  const [lesson, setLesson] = useState<TeacherLesson | null>(null);
  const [attachments, setAttachments] = useState<TeacherAttachment[]>([]);
  const [loading, setLoading] = useState(true);

  const [editingLesson, setEditingLesson] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [savingLesson, setSavingLesson] = useState(false);

  const [viewer, setViewer] = useState<TeacherAttachment | null>(null);
  const [editingAtt, setEditingAtt] = useState<TeacherAttachment | null>(null);
  const [attTitle, setAttTitle] = useState('');
  const [attUrl, setAttUrl] = useState('');
  const [attKind, setAttKind] = useState<'video' | 'pdf'>('video');
  const [savingAtt, setSavingAtt] = useState(false);

  const [addKind, setAddKind] = useState<'video' | 'pdf'>('video');
  const [addTitle, setAddTitle] = useState('');
  const [addUrl, setAddUrl] = useState('');
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await getTeacherLesson(Number(id));
      setLesson(res.lesson);
      setAttachments(res.attachments);
      setEditTitle(res.lesson.title);
      setEditDesc(res.lesson.description || '');
    } catch {
      setLesson(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const openAttachment = (a: TeacherAttachment) => {
    if (Platform.OS === 'web') {
      setViewer(a);
      return;
    }
    Linking.openURL(a.file_url).catch(() =>
      showToast('تعذر فتح المرفق', 'danger'),
    );
  };

  const saveLesson = async () => {
    if (editTitle.trim().length < 2) {
      showToast('عنوان الدرس قصير جداً', 'danger');
      return;
    }
    setSavingLesson(true);
    try {
      const res = await updateTeacherLesson(Number(id), {
        title: editTitle.trim(),
        description: editDesc.trim() || null,
      });
      setLesson((prev) => (prev ? { ...prev, ...res.lesson } : res.lesson));
      setEditingLesson(false);
      showToast('تم حفظ تعديلات الدرس', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'تعذر الحفظ', 'danger');
    } finally {
      setSavingLesson(false);
    }
  };

  const startEditAtt = (a: TeacherAttachment) => {
    setEditingAtt(a);
    setAttTitle(a.title);
    setAttUrl(a.file_url);
    setAttKind(a.kind);
  };

  const saveAtt = async () => {
    if (!editingAtt) return;
    if (!attTitle.trim()) {
      showToast('أدخل عنوان المرفق', 'danger');
      return;
    }
    setSavingAtt(true);
    try {
      await updateLessonAttachment(Number(id), editingAtt.id, {
        kind: attKind,
        title: attTitle.trim(),
        file_url: attUrl.trim() || undefined,
      });
      showToast('تم تحديث المرفق', 'success');
      setEditingAtt(null);
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'تعذر التحديث', 'danger');
    } finally {
      setSavingAtt(false);
    }
  };

  const replaceAttFile = () => {
    if (!editingAtt || Platform.OS !== 'web' || typeof document === 'undefined') {
      showToast('استبدال الملف متاح من المتصفح', 'warning');
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = attKind === 'pdf' ? 'application/pdf,.pdf' : 'video/*';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      setSavingAtt(true);
      try {
        await updateLessonAttachment(Number(id), editingAtt.id, {
          kind: attKind,
          title: attTitle.trim() || file.name,
          file,
        });
        showToast('تم استبدال الملف', 'success');
        setEditingAtt(null);
        load();
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'تعذر الرفع', 'danger');
      } finally {
        setSavingAtt(false);
      }
    };
    input.click();
  };

  const addByUrl = async () => {
    if (!addTitle.trim() || !addUrl.trim()) {
      showToast('أدخل العنوان والرابط', 'danger');
      return;
    }
    setAdding(true);
    try {
      await addLessonAttachment(Number(id), {
        kind: addKind,
        title: addTitle.trim(),
        file_url: addUrl.trim(),
      });
      setAddTitle('');
      setAddUrl('');
      showToast('تمت إضافة المرفق', 'success');
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'تعذر الإضافة', 'danger');
    } finally {
      setAdding(false);
    }
  };

  const pickAddFile = () => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      showToast('ارفع من المتصفح أو الصق رابطاً', 'warning');
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = addKind === 'pdf' ? 'application/pdf,.pdf' : 'video/*';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      setAdding(true);
      try {
        await addLessonAttachment(Number(id), {
          kind: addKind,
          title: addTitle.trim() || file.name,
          file,
        });
        setAddTitle('');
        showToast('تم رفع الملف', 'success');
        load();
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'تعذر الرفع', 'danger');
      } finally {
        setAdding(false);
      }
    };
    input.click();
  };

  const viewerBody = useMemo(() => {
    if (!viewer || Platform.OS !== 'web') return null;
    const url = viewer.file_url;
    const kind = resolveKind(viewer.kind, url, viewer.filename);
    const yt = youtubeId(url);

    // PDF must be checked before video — materials folder hosts both types
    if (kind === 'pdf') {
      return (
        <PdfPreview
          url={url}
          title={viewer.title}
          heightPx={Math.min(height * 0.65, 560)}
        />
      );
    }

    if (yt) {
      return (
        <iframe
          title={viewer.title}
          src={`https://www.youtube.com/embed/${yt}?rel=0`}
          style={{
            width: '100%',
            height: Math.min(height * 0.55, 420),
            border: 0,
            borderRadius: 16,
          }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      );
    }

    if (kind === 'video' || isDirectVideo(url)) {
      return (
        // @ts-expect-error web video element
        <video
          src={url}
          controls
          style={{
            width: '100%',
            maxHeight: Math.min(height * 0.55, 420),
            borderRadius: 16,
            backgroundColor: '#000',
          }}
        />
      );
    }

    return (
      <View style={styles.fallbackOpen}>
        <Text style={styles.fallbackText}>معاينة هذا الرابط غير متاحة داخل الصفحة</Text>
        <Button label="فتح في تبويب جديد" onPress={() => Linking.openURL(url)} />
      </View>
    );
  }, [viewer, height]);

  return (
    <TeacherScreen
      title={lesson?.title || 'تفاصيل الدرس'}
      subtitle={
        lesson
          ? `${lesson.grade_name} · ${lesson.classroom_name} · ${lesson.subject_name}`
          : undefined
      }
      onBack={() => {
        if (router.canGoBack()) router.back();
        else router.replace('/teacher/lessons');
      }}
      hero
      right={
        <Pressable
          style={styles.trash}
          onPress={async () => {
            try {
              await deleteTeacherLesson(Number(id));
              showToast('تم حذف الدرس', 'success');
              router.replace('/teacher/lessons' as never);
            } catch {
              showToast('تعذر الحذف', 'danger');
            }
          }}
        >
          <Icon name="Trash2" size={18} color="#fff" />
        </Pressable>
      }
    >
      {loading ? (
        <LoadingBlock />
      ) : !lesson ? (
        <EmptyBlock title="الدرس غير موجود" />
      ) : (
        <View style={[styles.page, width >= 860 && styles.pageWide]}>
          <SoftCard>
            <View style={[styles.cardHead, { flexDirection: rowRtl as 'row' }]}>
              <Text style={styles.cardHeadTitle}>بيانات الدرس</Text>
              <Pressable
                onPress={() => {
                  if (!editingLesson) {
                    setEditTitle(lesson.title);
                    setEditDesc(lesson.description || '');
                  }
                  setEditingLesson((v) => !v);
                }}
                style={[styles.chipBtn, { flexDirection: rowRtl as 'row' }]}
              >
                <Icon name={editingLesson ? 'X' : 'Pencil'} size={14} color={t.brand} />
                <Text style={styles.chipBtnText}>
                  {editingLesson ? 'إلغاء' : 'تعديل'}
                </Text>
              </Pressable>
            </View>

            {editingLesson ? (
              <>
                <Input label="عنوان الدرس" value={editTitle} onChangeText={setEditTitle} />
                <View style={styles.gap} />
                <Input
                  label="الوصف"
                  value={editDesc}
                  onChangeText={setEditDesc}
                  multiline
                  style={{ minHeight: 90, textAlignVertical: 'top' }}
                />
                <View style={styles.gap} />
                <Button
                  label={savingLesson ? 'جارٍ الحفظ...' : 'حفظ التعديلات'}
                  onPress={saveLesson}
                  disabled={savingLesson}
                  icon="Check"
                />
              </>
            ) : (
              <>
                <Text style={styles.lessonTitle}>{lesson.title}</Text>
                <Text style={styles.lessonDesc}>
                  {lesson.description?.trim() || 'لا يوجد وصف لهذا الدرس'}
                </Text>
              </>
            )}
          </SoftCard>

          <View style={[styles.sectionRow, { flexDirection: rowRtl as 'row' }]}>
            <Text style={styles.section}>المرفقات ({attachments.length})</Text>
          </View>

          {attachments.length === 0 ? (
            <EmptyBlock
              icon="FolderOpen"
              title="لا مرفقات بعد"
              subtitle="أضف فيديو أو PDF من النموذج بالأسفل"
            />
          ) : (
            attachments.map((a, i) => {
              const kind = resolveKind(a.kind, a.file_url, a.filename);
              const isPdf = kind === 'pdf';
              return (
              <FadeIn key={a.id} delay={i * 35}>
                <SoftCard>
                  <View style={[styles.attRow, { flexDirection: rowRtl as 'row' }]}>
                    <View
                      style={[
                        styles.kindIcon,
                        {
                          backgroundColor: isPdf ? t.brandSoft : t.accentSoft,
                        },
                      ]}
                    >
                      <Icon
                        name={isPdf ? 'FileText' : 'CirclePlay'}
                        size={20}
                        color={isPdf ? t.brand : t.accent}
                      />
                    </View>
                    <View style={{ flex: 1, gap: 3 }}>
                      <Text style={styles.attTitle}>{a.title}</Text>
                      <Text style={styles.attMeta}>
                        {isPdf ? 'PDF' : 'فيديو'}
                        {a.filename ? ` · ${a.filename}` : ''}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.attActions, { flexDirection: rowRtl as 'row' }]}>
                    <Pressable
                      style={[styles.actionPrimary, { flexDirection: rowRtl as 'row' }]}
                      onPress={() => openAttachment(a)}
                    >
                      <Icon name={isPdf ? 'Eye' : 'Play'} size={16} color="#fff" />
                      <Text style={styles.actionPrimaryText}>
                        {isPdf ? 'فتح PDF' : 'تشغيل الفيديو'}
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[styles.actionGhost, { flexDirection: rowRtl as 'row' }]}
                      onPress={() => startEditAtt(a)}
                    >
                      <Icon name="Pencil" size={15} color={t.brand} />
                      <Text style={styles.actionGhostText}>تعديل</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.actionGhost, { flexDirection: rowRtl as 'row' }]}
                      onPress={() => Linking.openURL(a.file_url)}
                    >
                      <Icon name="Download" size={15} color={t.inkSoft} />
                      <Text style={[styles.actionGhostText, { color: t.inkSoft }]}>
                        تبويب
                      </Text>
                    </Pressable>
                    <Pressable
                      style={styles.actionDanger}
                      onPress={async () => {
                        const ok =
                          typeof window !== 'undefined'
                            ? window.confirm('هل تريد حذف هذا المرفق؟')
                            : true;
                        if (!ok) return;
                        try {
                          await deleteLessonAttachment(Number(id), Number(a.id));
                          setAttachments((prev) => prev.filter((x) => x.id !== a.id));
                          if (viewer?.id === a.id) setViewer(null);
                          showToast('تم حذف المرفق', 'success');
                        } catch (err) {
                          showToast(
                            err instanceof Error ? err.message : 'تعذر حذف المرفق',
                            'danger',
                          );
                        }
                      }}
                    >
                      <Icon name="Trash2" size={16} color={t.danger} />
                    </Pressable>
                  </View>
                </SoftCard>
              </FadeIn>
              );
            })
          )}

          <SoftCard>
            <Text style={styles.cardHeadTitle}>إضافة مرفق جديد</Text>
            <Text style={styles.help}>
              ارفع من الجهاز أو الصق رابط يوتيوب / رابط مباشر لملف PDF أو فيديو
            </Text>
            <View style={[styles.kindRow, { flexDirection: rowRtl as 'row' }]}>
              {(['video', 'pdf'] as const).map((k) => (
                <Pressable
                  key={k}
                  onPress={() => setAddKind(k)}
                  style={[styles.kindBtn, addKind === k && styles.kindBtnOn]}
                >
                  <Icon
                    name={k === 'video' ? 'CirclePlay' : 'FileText'}
                    size={16}
                    color={addKind === k ? t.brand : t.inkMute}
                  />
                  <Text style={[styles.kindBtnText, addKind === k && styles.kindBtnTextOn]}>
                    {k === 'video' ? 'فيديو' : 'PDF'}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.gap} />
            <Input
              label="عنوان المرفق"
              value={addTitle}
              onChangeText={setAddTitle}
              placeholder="عنوان واضح"
            />
            <View style={styles.gap} />
            <Input
              label="رابط (اختياري إن رفعت ملفاً)"
              value={addUrl}
              onChangeText={setAddUrl}
              placeholder="https://..."
              autoCapitalize="none"
            />
            <View style={[styles.addRow, { flexDirection: rowRtl as 'row' }]}>
              <Pressable
                onPress={pickAddFile}
                style={[styles.uploadBtn, { flexDirection: rowRtl as 'row' }]}
              >
                <Icon name="Upload" size={16} color="#fff" />
                <Text style={styles.uploadBtnText}>رفع من الجهاز</Text>
              </Pressable>
              <Pressable
                onPress={addByUrl}
                disabled={adding}
                style={[styles.linkBtn, { flexDirection: rowRtl as 'row' }]}
              >
                <Icon name="Plus" size={16} color={t.brand} />
                <Text style={styles.linkBtnText}>
                  {adding ? 'جارٍ...' : 'إضافة بالرابط'}
                </Text>
              </Pressable>
            </View>
          </SoftCard>
        </View>
      )}

      {/* Viewer modal */}
      <Modal visible={!!viewer} transparent animationType="fade" onRequestClose={() => setViewer(null)}>
        <View style={styles.viewerOverlay}>
          <View style={[styles.viewerSheet, { maxWidth: Math.min(width - 24, 920) }]}>
            <View style={[styles.viewerHead, { flexDirection: rowRtl as 'row' }]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.viewerTitle}>{viewer?.title}</Text>
                <Text style={styles.viewerMeta}>
                  {viewer
                    ? resolveKind(viewer.kind, viewer.file_url, viewer.filename) === 'pdf'
                      ? 'PDF'
                      : 'فيديو'
                    : ''}
                </Text>
              </View>
              <Pressable onPress={() => setViewer(null)} style={styles.viewerClose}>
                <Icon name="X" size={18} color={t.ink} />
              </Pressable>
            </View>
            {viewerBody}
            {viewer ? (
              <View style={[styles.viewerFooter, { flexDirection: rowRtl as 'row' }]}>
                <Button
                  label="تحميل"
                  icon="Download"
                  onPress={async () => {
                    const kind = resolveKind(
                      viewer.kind,
                      viewer.file_url,
                      viewer.filename,
                    );
                    let name =
                      viewer.filename?.trim() ||
                      viewer.title.trim() ||
                      (kind === 'pdf' ? 'file.pdf' : 'file');
                    if (kind === 'pdf' && !/\.pdf$/i.test(name)) name = `${name}.pdf`;
                    try {
                      await downloadFile(viewer.file_url, name);
                      showToast('بدأ التحميل', 'success');
                    } catch {
                      showToast('تعذر التحميل', 'danger');
                    }
                  }}
                />
                <Button
                  label="فتح في تبويب جديد"
                  variant="outline"
                  onPress={() => Linking.openURL(viewer.file_url)}
                />
                <Button
                  label="تعديل المرفق"
                  variant="secondary"
                  onPress={() => {
                    startEditAtt(viewer);
                    setViewer(null);
                  }}
                />
              </View>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* Edit attachment modal */}
      <Modal
        visible={!!editingAtt}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingAtt(null)}
      >
        <View style={styles.viewerOverlay}>
          <View style={[styles.editSheet, { maxWidth: Math.min(width - 24, 520) }]}>
            <View style={[styles.viewerHead, { flexDirection: rowRtl as 'row' }]}>
              <Text style={styles.viewerTitle}>تعديل المرفق</Text>
              <Pressable onPress={() => setEditingAtt(null)} style={styles.viewerClose}>
                <Icon name="X" size={18} color={t.ink} />
              </Pressable>
            </View>

            <View style={[styles.kindRow, { flexDirection: rowRtl as 'row' }]}>
              {(['video', 'pdf'] as const).map((k) => (
                <Pressable
                  key={k}
                  onPress={() => setAttKind(k)}
                  style={[styles.kindBtn, attKind === k && styles.kindBtnOn]}
                >
                  <Text style={[styles.kindBtnText, attKind === k && styles.kindBtnTextOn]}>
                    {k === 'video' ? 'فيديو' : 'PDF'}
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.gap} />
            <Input label="العنوان" value={attTitle} onChangeText={setAttTitle} />
            <View style={styles.gap} />
            <Input
              label="الرابط"
              value={attUrl}
              onChangeText={setAttUrl}
              autoCapitalize="none"
            />
            <View style={styles.gap} />
            <Button
              label="استبدال الملف من الجهاز"
              variant="outline"
              icon="Upload"
              onPress={replaceAttFile}
              disabled={savingAtt}
            />
            <View style={styles.gap} />
            <Button
              label={savingAtt ? 'جارٍ الحفظ...' : 'حفظ التعديلات'}
              onPress={saveAtt}
              disabled={savingAtt}
            />
          </View>
        </View>
      </Modal>
    </TeacherScreen>
  );
}

const styles = StyleSheet.create({
  trash: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(239,68,68,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  page: { gap: 14, paddingBottom: 28 },
  pageWide: { maxWidth: 820, width: '100%', alignSelf: 'center' },
  cardHead: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardHeadTitle: {
    fontFamily: t.fonts.bold,
    fontSize: 15,
    color: t.ink,
    writingDirection: 'rtl',
  },
  chipBtn: {
    alignItems: 'center',
    gap: 6,
    backgroundColor: t.brandSoft,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  chipBtnText: {
    fontFamily: t.fonts.semiBold,
    fontSize: 12,
    color: t.brandDeep,
  },
  lessonTitle: {
    fontFamily: t.fonts.bold,
    fontSize: 18,
    color: t.ink,
    writingDirection: 'rtl',
    marginBottom: 8,
  },
  lessonDesc: {
    fontFamily: t.fonts.regular,
    fontSize: 14,
    color: t.inkSoft,
    lineHeight: 22,
    writingDirection: 'rtl',
  },
  sectionRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  section: {
    fontFamily: t.fonts.bold,
    fontSize: 16,
    color: t.ink,
    writingDirection: 'rtl',
  },
  attRow: { alignItems: 'center', gap: 12, marginBottom: 12 },
  kindIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attTitle: {
    fontFamily: t.fonts.bold,
    fontSize: 14,
    color: t.ink,
    writingDirection: 'rtl',
  },
  attMeta: {
    fontFamily: t.fonts.regular,
    fontSize: 12,
    color: t.inkMute,
    writingDirection: 'rtl',
  },
  attActions: {
    flexWrap: 'wrap',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: t.line,
    paddingTop: 12,
  },
  actionPrimary: {
    alignItems: 'center',
    gap: 6,
    backgroundColor: t.brand,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  actionPrimaryText: {
    fontFamily: t.fonts.semiBold,
    color: '#fff',
    fontSize: 13,
  },
  actionGhost: {
    alignItems: 'center',
    gap: 5,
    backgroundColor: t.brandSoft,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  actionGhostText: {
    fontFamily: t.fonts.semiBold,
    color: t.brandDeep,
    fontSize: 13,
  },
  actionDanger: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: t.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  help: {
    fontFamily: t.fonts.regular,
    fontSize: 12,
    color: t.inkSoft,
    writingDirection: 'rtl',
    marginTop: 6,
    marginBottom: 12,
    lineHeight: 18,
  },
  kindRow: { gap: 8 },
  kindBtn: {
    flex: 1,
    flexDirection: rowRtl as 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: t.line,
    backgroundColor: t.cardMuted,
  },
  kindBtnOn: {
    borderColor: t.brand,
    backgroundColor: t.brandSoft,
  },
  kindBtnText: {
    fontFamily: t.fonts.medium,
    color: t.inkSoft,
    fontSize: 13,
  },
  kindBtnTextOn: {
    color: t.brandDeep,
    fontFamily: t.fonts.semiBold,
  },
  addRow: { gap: 10, marginTop: 14, flexWrap: 'wrap' },
  uploadBtn: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: t.brand,
    paddingVertical: 12,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  uploadBtnText: {
    fontFamily: t.fonts.semiBold,
    color: '#fff',
    fontSize: 13,
  },
  linkBtn: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: t.brandSoft,
    borderWidth: 1,
    borderColor: `${t.brand}44`,
    paddingVertical: 12,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  linkBtnText: {
    fontFamily: t.fonts.semiBold,
    color: t.brandDeep,
    fontSize: 13,
  },
  gap: { height: 10 },
  viewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  viewerSheet: {
    width: '100%',
    backgroundColor: t.card,
    borderRadius: 22,
    padding: 16,
    gap: 12,
    ...t.shadow.float,
  },
  editSheet: {
    width: '100%',
    backgroundColor: t.card,
    borderRadius: 22,
    padding: 18,
    gap: 4,
    ...t.shadow.float,
  },
  viewerHead: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  viewerTitle: {
    fontFamily: t.fonts.bold,
    fontSize: 16,
    color: t.ink,
    writingDirection: 'rtl',
  },
  viewerMeta: {
    fontFamily: t.fonts.regular,
    fontSize: 12,
    color: t.inkMute,
    writingDirection: 'rtl',
    marginTop: 2,
  },
  viewerClose: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: t.cardMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerFooter: {
    gap: 10,
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
  },
  fallbackOpen: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 28,
  },
  fallbackText: {
    fontFamily: t.fonts.regular,
    color: t.inkSoft,
    writingDirection: 'rtl',
  },
  pdfLoading: {
    minHeight: 240,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: t.cardMuted,
    borderRadius: 16,
  },
  pdfLoadingText: {
    fontFamily: t.fonts.medium,
    fontSize: 13,
    color: t.inkSoft,
    writingDirection: 'rtl',
  },
});
