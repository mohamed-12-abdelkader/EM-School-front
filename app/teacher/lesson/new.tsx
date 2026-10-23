import { useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Input, Icon, useToast } from '@/components/ui';
import { SoftCard, TeacherScreen, rowRtl } from '@/components/teacher/ui';
import { ClassSubjectPicker } from '@/components/teacher/ClassSubjectPicker';
import { teacherTheme as t } from '@/components/teacher/theme';
import { addLessonAttachment, createTeacherLesson } from '@/api/teacherPortal';

type PendingAttach = {
  localId: string;
  kind: 'video' | 'pdf';
  title: string;
  file?: File;
  file_url?: string;
  fileName?: string;
};

export default function NewLessonScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const { width } = useWindowDimensions();
  const wide = width >= 800;

  const [cls, setCls] = useState<{
    classroom_id: number;
    subject_id: number;
    label: string;
  } | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [attachments, setAttachments] = useState<PendingAttach[]>([]);
  const [kind, setKind] = useState<'video' | 'pdf'>('video');
  const [attTitle, setAttTitle] = useState('');
  const [attUrl, setAttUrl] = useState('');
  const [saving, setSaving] = useState(false);

  const canSave = useMemo(
    () => !!cls && title.trim().length >= 2,
    [cls, title],
  );

  const pickFile = () => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      showToast('ارفع الملف من المتصفح، أو الصق رابطاً أدناه', 'warning');
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = kind === 'pdf' ? 'application/pdf,.pdf' : 'video/*,.mp4,.webm,.mov';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      setAttachments((prev) => [
        ...prev,
        {
          localId: `${Date.now()}-${file.name}`,
          kind,
          title: attTitle.trim() || file.name.replace(/\.[^.]+$/, ''),
          file,
          fileName: file.name,
        },
      ]);
      setAttTitle('');
      showToast(
        kind === 'video' ? 'تمت إضافة الفيديو للقائمة' : 'تمت إضافة ملف PDF للقائمة',
        'success',
      );
    };
    input.click();
  };

  const addByUrl = () => {
    if (!attUrl.trim()) {
      showToast('الصق رابط الفيديو أو ملف PDF', 'danger');
      return;
    }
    try {
      void new URL(attUrl.trim());
    } catch {
      showToast('الرابط غير صالح', 'danger');
      return;
    }
    setAttachments((prev) => [
      ...prev,
      {
        localId: `${Date.now()}-url`,
        kind,
        title: attTitle.trim() || (kind === 'video' ? 'فيديو الدرس' : 'ملف PDF'),
        file_url: attUrl.trim(),
      },
    ]);
    setAttTitle('');
    setAttUrl('');
    showToast('تمت إضافة المرفق بالقائمة', 'success');
  };

  const onSave = async () => {
    if (!cls) {
      showToast('اختر الصف والمادة', 'danger');
      return;
    }
    if (title.trim().length < 2) {
      showToast('أدخل عنوان الدرس', 'danger');
      return;
    }
    setSaving(true);
    try {
      const res = await createTeacherLesson({
        classroom_id: cls.classroom_id,
        subject_id: cls.subject_id,
        title: title.trim(),
        description: description.trim() || null,
      });
      const lessonId = res.lesson.id;

      for (const a of attachments) {
        await addLessonAttachment(lessonId, {
          kind: a.kind,
          title: a.title,
          file_url: a.file_url,
          file: a.file ?? null,
        });
      }

      showToast(
        attachments.length
          ? `تم حفظ الدرس مع ${attachments.length} مرفق`
          : 'تم حفظ الدرس',
        'success',
      );
      router.replace(`/teacher/lesson/${lessonId}` as never);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'تعذر الحفظ', 'danger');
    } finally {
      setSaving(false);
    }
  };

  return (
    <TeacherScreen
      title="درس جديد"
      subtitle="العنوان + المرفقات في خطوة واحدة"
      onBack
      hero
    >
      <View style={[styles.layout, wide && styles.layoutWide]}>
        <SoftCard style={styles.block}>
          <StepBadge n={1} label="الصف والمادة" />
          <ClassSubjectPicker value={cls} onChange={setCls} />
        </SoftCard>

        <SoftCard style={styles.block}>
          <StepBadge n={2} label="معلومات الدرس" />
          <Input
            label="عنوان الدرس"
            value={title}
            onChangeText={setTitle}
            placeholder="مثال: النكرة والمعرفة"
          />
          <View style={styles.gap} />
          <Input
            label="الوصف (اختياري)"
            value={description}
            onChangeText={setDescription}
            placeholder="ماذا سيتعلم الطالب في هذا الدرس؟"
            multiline
            style={{ minHeight: 88, textAlignVertical: 'top' }}
          />
        </SoftCard>

        <SoftCard style={styles.block}>
          <StepBadge n={3} label="مرفقات الفيديو و PDF" />
          <Text style={styles.help}>
            اختر النوع ثم ارفع ملفاً من جهازك، أو الصق رابط يوتيوب / رابط مباشر للملف.
            يمكنك إضافة أكثر من مرفق قبل الحفظ.
          </Text>

          <View style={[styles.kindRow, { flexDirection: rowRtl as 'row' }]}>
            {(['video', 'pdf'] as const).map((k) => {
              const active = kind === k;
              return (
                <Pressable
                  key={k}
                  onPress={() => setKind(k)}
                  style={[styles.kindBtn, active && styles.kindBtnOn]}
                >
                  <Icon
                    name={k === 'video' ? 'CirclePlay' : 'FileText'}
                    size={18}
                    color={active ? t.brand : t.inkMute}
                  />
                  <Text style={[styles.kindText, active && styles.kindTextOn]}>
                    {k === 'video' ? 'فيديو' : 'PDF'}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.gap} />
          <Input
            label="عنوان المرفق (اختياري)"
            value={attTitle}
            onChangeText={setAttTitle}
            placeholder={kind === 'video' ? 'شرح الدرس بالفيديو' : 'ملخص الدرس PDF'}
          />
          <View style={styles.gap} />
          <Input
            label="أو رابط الملف / الفيديو"
            value={attUrl}
            onChangeText={setAttUrl}
            placeholder={
              kind === 'video'
                ? 'https://youtube.com/... أو رابط مباشر'
                : 'https://.../file.pdf'
            }
            autoCapitalize="none"
          />

          <View style={[styles.attachActions, { flexDirection: rowRtl as 'row' }]}>
            <Pressable
              onPress={pickFile}
              style={({ pressed }) => [styles.uploadBtn, pressed && { opacity: 0.9 }]}
            >
              <Icon name="Upload" size={18} color="#fff" />
              <Text style={styles.uploadBtnText}>
                {kind === 'video' ? 'رفع فيديو من الجهاز' : 'رفع PDF من الجهاز'}
              </Text>
            </Pressable>
            <Pressable
              onPress={addByUrl}
              style={({ pressed }) => [styles.urlBtn, pressed && { opacity: 0.9 }]}
            >
              <Icon name="Plus" size={18} color={t.brand} />
              <Text style={styles.urlBtnText}>إضافة بالرابط</Text>
            </Pressable>
          </View>

          {attachments.length > 0 ? (
            <View style={styles.pendingList}>
              <Text style={styles.pendingTitle}>
                مرفقات جاهزة للحفظ ({attachments.length})
              </Text>
              {attachments.map((a) => (
                <View
                  key={a.localId}
                  style={[styles.pendingItem, { flexDirection: rowRtl as 'row' }]}
                >
                  <View
                    style={[
                      styles.pendingIcon,
                      {
                        backgroundColor:
                          a.kind === 'video' ? t.accentSoft : t.brandSoft,
                      },
                    ]}
                  >
                    <Icon
                      name={a.kind === 'video' ? 'CirclePlay' : 'FileText'}
                      size={16}
                      color={a.kind === 'video' ? t.accent : t.brand}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pendingName}>{a.title}</Text>
                    <Text style={styles.pendingMeta}>
                      {a.kind === 'video' ? 'فيديو' : 'PDF'}
                      {a.fileName ? ` · ${a.fileName}` : a.file_url ? ' · رابط' : ''}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() =>
                      setAttachments((prev) =>
                        prev.filter((x) => x.localId !== a.localId),
                      )
                    }
                    hitSlop={8}
                  >
                    <Icon name="Trash2" size={18} color={t.danger} />
                  </Pressable>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyAttach}>
              <Icon name="FolderOpen" size={22} color={t.inkMute} />
              <Text style={styles.emptyAttachText}>
                لم تُضف مرفقات بعد — يمكنك الحفظ بدون مرفقات وإضافتها لاحقاً
              </Text>
            </View>
          )}
        </SoftCard>

        <Button
          label={
            saving
              ? 'جارٍ الحفظ...'
              : attachments.length
                ? `حفظ الدرس مع ${attachments.length} مرفق`
                : 'حفظ الدرس'
          }
          onPress={onSave}
          disabled={saving || !canSave}
          icon="Check"
        />
      </View>
    </TeacherScreen>
  );
}

function StepBadge({ n, label }: { n: number; label: string }) {
  return (
    <View style={[styles.stepRow, { flexDirection: rowRtl as 'row' }]}>
      <View style={styles.stepNum}>
        <Text style={styles.stepNumText}>{n}</Text>
      </View>
      <Text style={styles.stepLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  layout: { gap: 14, paddingBottom: 24 },
  layoutWide: { maxWidth: 720, width: '100%', alignSelf: 'center' },
  block: { gap: 4 },
  gap: { height: 12 },
  stepRow: { alignItems: 'center', gap: 10, marginBottom: 14 },
  stepNum: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: t.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: {
    fontFamily: t.fonts.bold,
    fontSize: 13,
    color: t.brandDeep,
    fontVariant: ['tabular-nums'],
  },
  stepLabel: {
    fontFamily: t.fonts.bold,
    fontSize: 15,
    color: t.ink,
    writingDirection: 'rtl',
  },
  help: {
    fontFamily: t.fonts.regular,
    fontSize: 13,
    color: t.inkSoft,
    lineHeight: 20,
    writingDirection: 'rtl',
    marginBottom: 12,
  },
  kindRow: { gap: 10 },
  kindBtn: {
    flex: 1,
    flexDirection: rowRtl as 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: t.line,
    backgroundColor: t.cardMuted,
  },
  kindBtnOn: {
    borderColor: t.brand,
    backgroundColor: t.brandSoft,
  },
  kindText: {
    fontFamily: t.fonts.semiBold,
    fontSize: 14,
    color: t.inkSoft,
  },
  kindTextOn: { color: t.brandDeep },
  attachActions: {
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14,
  },
  uploadBtn: {
    flexGrow: 1,
    minWidth: 160,
    flexDirection: rowRtl as 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: t.brand,
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 14,
  },
  uploadBtnText: {
    fontFamily: t.fonts.semiBold,
    color: '#fff',
    fontSize: 13,
  },
  urlBtn: {
    flexGrow: 1,
    minWidth: 140,
    flexDirection: rowRtl as 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: t.brandSoft,
    borderWidth: 1,
    borderColor: `${t.brand}33`,
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 14,
  },
  urlBtnText: {
    fontFamily: t.fonts.semiBold,
    color: t.brandDeep,
    fontSize: 13,
  },
  pendingList: { marginTop: 16, gap: 8 },
  pendingTitle: {
    fontFamily: t.fonts.semiBold,
    fontSize: 13,
    color: t.inkSoft,
    writingDirection: 'rtl',
    marginBottom: 4,
  },
  pendingItem: {
    alignItems: 'center',
    gap: 10,
    backgroundColor: t.cardMuted,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: t.line,
  },
  pendingIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingName: {
    fontFamily: t.fonts.semiBold,
    fontSize: 13,
    color: t.ink,
    writingDirection: 'rtl',
  },
  pendingMeta: {
    fontFamily: t.fonts.regular,
    fontSize: 11,
    color: t.inkMute,
    writingDirection: 'rtl',
  },
  emptyAttach: {
    marginTop: 14,
    alignItems: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: t.line,
    backgroundColor: t.cardMuted,
  },
  emptyAttachText: {
    fontFamily: t.fonts.regular,
    fontSize: 12,
    color: t.inkMute,
    textAlign: 'center',
    writingDirection: 'rtl',
    paddingHorizontal: 16,
    lineHeight: 18,
  },
});
