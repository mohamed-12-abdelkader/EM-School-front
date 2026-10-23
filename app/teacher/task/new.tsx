import { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Input, Icon, useToast } from '@/components/ui';
import {
  FadeIn,
  SoftCard,
  TeacherScreen,
  rowRtl,
} from '@/components/teacher/ui';
import { ClassSubjectPicker } from '@/components/teacher/ClassSubjectPicker';
import { DueDatePickerField } from '@/components/teacher/DayCalendar';
import { teacherTheme as t } from '@/components/teacher/theme';
import { addTaskAttachment, createTeacherTask } from '@/api/teacherPortal';
import type { TeacherExamQuestion } from '@/types/teacherPortal';

const GRADE_PRESETS = [10, 20, 50, 100];
const CHOICE_LETTERS = ['أ', 'ب', 'ج', 'د', 'هـ', 'و'];

type ContentMode = 'instructions' | 'pdf' | 'questions' | 'both';

function toDateInput(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(base: Date, days: number) {
  const d = new Date(base);
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDueLabel(isoDate: string) {
  if (!isoDate.trim()) return 'بدون موعد';
  const d = new Date(`${isoDate.trim()}T12:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  try {
    return d.toLocaleDateString('ar-EG', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return isoDate;
  }
}

function emptyMcq(): TeacherExamQuestion {
  return {
    type: 'mcq',
    text: '',
    points: 1,
    choices: [
      { text: '', is_correct: true },
      { text: '', is_correct: false },
      { text: '', is_correct: false },
      { text: '', is_correct: false },
    ],
  };
}

function emptyWritten(): TeacherExamQuestion {
  return { type: 'written', text: '', points: 5, model_answer: '' };
}

const DUE_PRESETS: { label: string; days: number }[] = [
  { label: 'غداً', days: 1 },
  { label: 'بعد 3 أيام', days: 3 },
  { label: 'أسبوع', days: 7 },
  { label: 'أسبوعين', days: 14 },
];

const CONTENT_MODES: {
  id: ContentMode;
  title: string;
  sub: string;
  icon: string;
}[] = [
  {
    id: 'pdf',
    title: 'ملف PDF',
    sub: 'ورقة عمل أو واجب للتحميل',
    icon: 'FileText',
  },
  {
    id: 'questions',
    title: 'أسئلة',
    sub: 'اختيار من متعدد أو مقالي',
    icon: 'ClipboardList',
  },
  {
    id: 'both',
    title: 'PDF + أسئلة',
    sub: 'ارفع ملفاً وأضف أسئلة',
    icon: 'Layers',
  },
  {
    id: 'instructions',
    title: 'تعليمات فقط',
    sub: 'بدون ملف أو أسئلة',
    icon: 'Pencil',
  },
];

export default function NewTaskScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    return d;
  }, []);

  const [cls, setCls] = useState<{
    classroom_id: number;
    subject_id: number;
    label: string;
  } | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [maxGrade, setMaxGrade] = useState('100');
  const [dueAt, setDueAt] = useState(() => toDateInput(addDays(new Date(), 7)));
  const [contentMode, setContentMode] = useState<ContentMode>('pdf');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfTitle, setPdfTitle] = useState('');
  const [questions, setQuestions] = useState<TeacherExamQuestion[]>([]);
  const [saving, setSaving] = useState(false);

  const ready = !!cls && title.trim().length >= 2;
  const dueLabel = formatDueLabel(dueAt);
  const wantsPdf = contentMode === 'pdf' || contentMode === 'both';
  const wantsQuestions = contentMode === 'questions' || contentMode === 'both';

  const updateQ = (index: number, patch: Partial<TeacherExamQuestion>) => {
    setQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, ...patch } : q)));
  };

  const pickPdf = () => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      showToast('ارفع ملف PDF من المتصفح', 'warning');
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf,.pdf';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      if (file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)) {
        showToast('اختر ملف PDF فقط', 'danger');
        return;
      }
      setPdfFile(file);
      if (!pdfTitle.trim()) {
        setPdfTitle(file.name.replace(/\.pdf$/i, ''));
      }
      showToast('تم اختيار ملف PDF', 'success');
    };
    input.click();
  };

  const onSave = async () => {
    if (!cls) return showToast('اختر الصف والمادة أولاً', 'danger');
    if (title.trim().length < 2) return showToast('أدخل عنوان الواجب', 'danger');
    const grade = Number(maxGrade);
    if (!grade || grade < 1) return showToast('أدخل درجة قصوى صحيحة', 'danger');

    if (wantsPdf && !pdfFile) {
      return showToast('ارفع ملف PDF للواجب', 'danger');
    }
    if (wantsQuestions) {
      if (questions.length === 0) {
        return showToast('أضف سؤالاً واحداً على الأقل', 'danger');
      }
      for (const [i, q] of questions.entries()) {
        if (q.text.trim().length < 2) {
          return showToast(`أكمل نص السؤال ${i + 1}`, 'danger');
        }
        if (q.type === 'mcq') {
          const choices = q.choices || [];
          if (choices.filter((c) => c.text.trim()).length < 2) {
            return showToast(`السؤال ${i + 1}: أضف خيارين على الأقل`, 'danger');
          }
          if (!choices.some((c) => c.is_correct && c.text.trim())) {
            return showToast(`السؤال ${i + 1}: حدّد الإجابة الصحيحة`, 'danger');
          }
        }
      }
    }

    setSaving(true);
    try {
      const due = dueAt.trim()
        ? new Date(`${dueAt.trim()}T23:59:00`).toISOString()
        : null;
      const res = await createTeacherTask({
        classroom_id: cls.classroom_id,
        subject_id: cls.subject_id,
        title: title.trim(),
        description: description.trim() || null,
        max_grade: grade,
        due_at: due,
        questions: wantsQuestions
          ? questions.map((q) => ({
              ...q,
              choices:
                q.type === 'mcq'
                  ? (q.choices || [])
                      .filter((c) => c.text.trim())
                      .map((c) => ({ text: c.text.trim(), is_correct: c.is_correct }))
                  : undefined,
            }))
          : [],
      });

      if (wantsPdf && pdfFile) {
        await addTaskAttachment(res.task.id, {
          title: pdfTitle.trim() || title.trim() || pdfFile.name,
          file: pdfFile,
        });
      }

      showToast('تم إنشاء الواجب', 'success');
      router.replace(`/teacher/task/${res.task.id}` as never);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'تعذر الحفظ', 'danger');
    } finally {
      setSaving(false);
    }
  };

  return (
    <TeacherScreen
      title="واجب جديد"
      subtitle="ارفع PDF أو أضف أسئلة مثل الاختبار"
      onBack={() => {
        if (router.canGoBack()) router.back();
        else router.replace('/teacher/tasks');
      }}
      hero
    >
      <FadeIn>
        <View style={[styles.summary, { flexDirection: rowRtl as 'row' }]}>
          <SummaryChip
            icon="Users"
            label="الصف"
            value={cls ? 'محدّد' : 'غير محدّد'}
            accent={!!cls}
          />
          <SummaryChip
            icon="FileText"
            label="المحتوى"
            value={
              contentMode === 'pdf'
                ? 'PDF'
                : contentMode === 'questions'
                  ? 'أسئلة'
                  : contentMode === 'both'
                    ? 'PDF+أسئلة'
                    : 'تعليمات'
            }
            accent
          />
          <SummaryChip icon="CalendarDays" label="التسليم" value={dueLabel} flex />
        </View>
      </FadeIn>

      <FadeIn delay={40}>
        <SoftCard>
          <View style={[styles.sectionHead, { flexDirection: rowRtl as 'row' }]}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepNum}>1</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>لمن الواجب؟</Text>
              <Text style={styles.sectionHint}>اختر الصف والمادة</Text>
            </View>
          </View>
          <ClassSubjectPicker value={cls} onChange={setCls} />
        </SoftCard>
      </FadeIn>

      <FadeIn delay={70}>
        <SoftCard>
          <View style={[styles.sectionHead, { flexDirection: rowRtl as 'row' }]}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepNum}>2</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>تفاصيل الواجب</Text>
              <Text style={styles.sectionHint}>العنوان والتعليمات</Text>
            </View>
          </View>
          <Input
            label="عنوان الواجب"
            value={title}
            onChangeText={setTitle}
            placeholder="مثال: واجب الوحدة الثانية"
          />
          <View style={styles.fieldGap} />
          <Input
            label="التعليمات (اختياري)"
            value={description}
            onChangeText={setDescription}
            placeholder="ما المطلوب من الطالب..."
            multiline
          />
        </SoftCard>
      </FadeIn>

      <FadeIn delay={100}>
        <SoftCard>
          <View style={[styles.sectionHead, { flexDirection: rowRtl as 'row' }]}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepNum}>3</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>محتوى الواجب</Text>
              <Text style={styles.sectionHint}>هنا ترفع PDF أو تبني الأسئلة</Text>
            </View>
          </View>

          <View style={styles.modeGrid}>
            {CONTENT_MODES.map((m) => {
              const on = contentMode === m.id;
              return (
                <Pressable
                  key={m.id}
                  onPress={() => {
                    setContentMode(m.id);
                    if (
                      (m.id === 'questions' || m.id === 'both') &&
                      questions.length === 0
                    ) {
                      setQuestions([emptyMcq()]);
                    }
                  }}
                  style={[styles.modeCard, on && styles.modeCardOn]}
                >
                  <View
                    style={[
                      styles.modeIcon,
                      { backgroundColor: on ? t.brandSoft : t.cardMuted },
                    ]}
                  >
                    <Icon name={m.icon} size={20} color={on ? t.brand : t.inkMute} />
                  </View>
                  <Text style={[styles.modeTitle, on && styles.modeTitleOn]}>
                    {m.title}
                  </Text>
                  <Text style={styles.modeSub}>{m.sub}</Text>
                </Pressable>
              );
            })}
          </View>

          {wantsPdf ? (
            <View style={styles.contentBlock}>
              <Text style={styles.fieldLabel}>ملف PDF</Text>
              <Pressable
                onPress={pickPdf}
                style={[styles.uploadZone, { flexDirection: rowRtl as 'row' }]}
              >
                <View style={styles.uploadIcon}>
                  <Icon name="Upload" size={22} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.uploadTitle}>
                    {pdfFile ? pdfFile.name : 'اضغط لرفع ملف PDF'}
                  </Text>
                  <Text style={styles.uploadSub}>
                    {pdfFile
                      ? `${Math.max(1, Math.round(pdfFile.size / 1024))} ك.ب — اضغط للتغيير`
                      : 'ورقة عمل، تمارين، أو واجب للطباعة'}
                  </Text>
                </View>
                {pdfFile ? (
                  <Pressable
                    onPress={(e) => {
                      e?.stopPropagation?.();
                      setPdfFile(null);
                    }}
                    style={styles.clearFile}
                  >
                    <Icon name="X" size={16} color={t.danger} />
                  </Pressable>
                ) : null}
              </Pressable>
              {pdfFile ? (
                <>
                  <View style={styles.fieldGap} />
                  <Input
                    label="عنوان الملف (يظهر للطالب)"
                    value={pdfTitle}
                    onChangeText={setPdfTitle}
                    placeholder="ورقة العمل"
                  />
                </>
              ) : null}
            </View>
          ) : null}

          {wantsQuestions ? (
            <View style={styles.contentBlock}>
              <Text style={styles.fieldLabel}>الأسئلة</Text>
              {questions.map((q, qi) => (
                <View key={qi} style={styles.qCard}>
                  <View style={[styles.qTop, { flexDirection: rowRtl as 'row' }]}>
                    <View style={styles.qIndex}>
                      <Text style={styles.qIndexText}>{qi + 1}</Text>
                    </View>
                    <View style={[styles.typeSeg, { flexDirection: rowRtl as 'row' }]}>
                      {(
                        [
                          { type: 'mcq' as const, label: 'اختيار', icon: 'ClipboardCheck' },
                          { type: 'written' as const, label: 'مقالي', icon: 'Pencil' },
                        ] as const
                      ).map((opt) => {
                        const on = q.type === opt.type;
                        return (
                          <Pressable
                            key={opt.type}
                            onPress={() =>
                              updateQ(qi, opt.type === 'mcq' ? emptyMcq() : emptyWritten())
                            }
                            style={[styles.typeSegBtn, on && styles.typeSegBtnOn]}
                          >
                            <Icon
                              name={opt.icon}
                              size={14}
                              color={on ? t.brandDeep : t.inkMute}
                            />
                            <Text
                              style={[styles.typeSegText, on && styles.typeSegTextOn]}
                            >
                              {opt.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                    {questions.length > 1 ? (
                      <Pressable
                        onPress={() =>
                          setQuestions((prev) => prev.filter((_, i) => i !== qi))
                        }
                        style={styles.trashBtn}
                      >
                        <Icon name="Trash2" size={16} color={t.danger} />
                      </Pressable>
                    ) : (
                      <View style={{ width: 32 }} />
                    )}
                  </View>
                  <View style={styles.fieldGap} />
                  <Input
                    label="نص السؤال"
                    value={q.text}
                    onChangeText={(text) => updateQ(qi, { text })}
                    multiline
                    placeholder="اكتب السؤال..."
                  />
                  <View style={styles.fieldGap} />
                  <Input
                    label="الدرجة"
                    value={String(q.points)}
                    onChangeText={(v) => updateQ(qi, { points: Number(v) || 1 })}
                    keyboardType="number-pad"
                  />
                  {q.type === 'mcq' ? (
                    <View style={{ marginTop: 12, gap: 8 }}>
                      <Text style={styles.correctHint}>
                        اضغط الحرف لتحديد الإجابة الصحيحة
                      </Text>
                      {(q.choices || []).map((c, ci) => (
                        <View
                          key={ci}
                          style={[
                            styles.choiceRow,
                            c.is_correct && styles.choiceRowOn,
                            { flexDirection: rowRtl as 'row' },
                          ]}
                        >
                          <Pressable
                            onPress={() =>
                              updateQ(qi, {
                                choices: (q.choices || []).map((ch, i) => ({
                                  ...ch,
                                  is_correct: i === ci,
                                })),
                              })
                            }
                            style={[styles.letter, c.is_correct && styles.letterOn]}
                          >
                            <Text
                              style={[
                                styles.letterText,
                                c.is_correct && styles.letterTextOn,
                              ]}
                            >
                              {CHOICE_LETTERS[ci] || String(ci + 1)}
                            </Text>
                          </Pressable>
                          <View style={{ flex: 1 }}>
                            <Input
                              value={c.text}
                              onChangeText={(text) =>
                                updateQ(qi, {
                                  choices: (q.choices || []).map((ch, i) =>
                                    i === ci ? { ...ch, text } : ch,
                                  ),
                                })
                              }
                              placeholder={`خيار ${CHOICE_LETTERS[ci]}`}
                            />
                          </View>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <>
                      <View style={styles.fieldGap} />
                      <Input
                        label="نموذج الإجابة (للمراجعة)"
                        value={q.model_answer || ''}
                        onChangeText={(model_answer) => updateQ(qi, { model_answer })}
                        multiline
                      />
                    </>
                  )}
                </View>
              ))}
              <View style={[styles.addQRow, { flexDirection: rowRtl as 'row' }]}>
                <Pressable
                  onPress={() => setQuestions((prev) => [...prev, emptyMcq()])}
                  style={styles.addQBtn}
                >
                  <Icon name="Plus" size={16} color={t.brand} />
                  <Text style={styles.addQText}>سؤال اختيار</Text>
                </Pressable>
                <Pressable
                  onPress={() => setQuestions((prev) => [...prev, emptyWritten()])}
                  style={styles.addQBtn}
                >
                  <Icon name="Plus" size={16} color={t.accent} />
                  <Text style={[styles.addQText, { color: t.accent }]}>سؤال مقالي</Text>
                </Pressable>
              </View>
            </View>
          ) : null}
        </SoftCard>
      </FadeIn>

      <FadeIn delay={130}>
        <SoftCard>
          <View style={[styles.sectionHead, { flexDirection: rowRtl as 'row' }]}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepNum}>4</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>الدرجة والموعد</Text>
              <Text style={styles.sectionHint}>اختَر بسرعة أو من التقويم</Text>
            </View>
          </View>

          <Text style={styles.fieldLabel}>الدرجة القصوى</Text>
          <View style={[styles.chipRow, { flexDirection: rowRtl as 'row' }]}>
            {GRADE_PRESETS.map((g) => {
              const on = maxGrade === String(g);
              return (
                <Pressable
                  key={g}
                  onPress={() => setMaxGrade(String(g))}
                  style={[styles.chip, on && styles.chipOn]}
                >
                  <Text style={[styles.chipText, on && styles.chipTextOn]}>{g}</Text>
                </Pressable>
              );
            })}
            <View style={{ flex: 1, minWidth: 100 }}>
              <Input
                value={maxGrade}
                onChangeText={setMaxGrade}
                keyboardType="number-pad"
                placeholder="درجة"
              />
            </View>
          </View>

          <View style={styles.fieldGap} />
          <Text style={styles.fieldLabel}>موعد التسليم</Text>
          <View style={[styles.chipRow, { flexDirection: rowRtl as 'row' }]}>
            {DUE_PRESETS.map((p) => {
              const value = toDateInput(addDays(today, p.days));
              const on = dueAt === value;
              return (
                <Pressable
                  key={p.days}
                  onPress={() => setDueAt(value)}
                  style={[styles.chip, on && styles.chipOn]}
                >
                  <Text style={[styles.chipText, on && styles.chipTextOn]}>
                    {p.label}
                  </Text>
                </Pressable>
              );
            })}
            <Pressable
              onPress={() => setDueAt('')}
              style={[styles.chip, !dueAt && styles.chipMutedOn]}
            >
              <Text style={[styles.chipText, !dueAt && { color: t.ink }]}>
                بدون موعد
              </Text>
            </Pressable>
          </View>
          <View style={styles.fieldGap} />
          <DueDatePickerField
            value={dueAt}
            onChange={setDueAt}
            previewLabel={dueLabel}
          />
        </SoftCard>
      </FadeIn>

      <View style={styles.footerSpacer} />
      <View style={[styles.footer, { flexDirection: rowRtl as 'row' }]}>
        <View style={{ flex: 1 }}>
          <Button
            label="إلغاء"
            variant="outline"
            onPress={() => {
              if (router.canGoBack()) router.back();
              else router.replace('/teacher/tasks');
            }}
            disabled={saving}
            style={{ alignSelf: 'stretch' }}
          />
        </View>
        <View style={{ flex: 1.4 }}>
          <Button
            label={saving ? 'جارٍ الحفظ...' : 'حفظ الواجب'}
            icon="Check"
            onPress={onSave}
            disabled={saving || !ready}
            style={{ alignSelf: 'stretch' }}
          />
        </View>
      </View>
      <Text style={ready ? styles.footerHintOk : styles.footerHint}>
        {ready
          ? `جاهز — ${wantsPdf ? (pdfFile ? 'PDF ✓' : 'PDF ناقص') : 'بدون PDF'} · ${
              wantsQuestions ? `${questions.length} سؤال` : 'بدون أسئلة'
            }`
          : 'أكمل الصف والعنوان لتفعيل الحفظ'}
      </Text>
    </TeacherScreen>
  );
}

function SummaryChip({
  icon,
  label,
  value,
  accent,
  flex,
}: {
  icon: string;
  label: string;
  value: string;
  accent?: boolean;
  flex?: boolean;
}) {
  return (
    <View
      style={[
        styles.summaryChip,
        accent && styles.summaryChipAccent,
        flex && { flex: 1.3, minWidth: 140 },
      ]}
    >
      <Icon name={icon} size={16} color={accent ? t.brandDeep : t.inkSoft} />
      <View style={{ flexShrink: 1 }}>
        <Text style={styles.summaryLabel}>{label}</Text>
        <Text
          style={[styles.summaryValue, accent && { color: t.brandDeep }]}
          numberOfLines={1}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  summary: { flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  summaryChip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: t.card,
    borderWidth: 1,
    borderColor: t.line,
    minWidth: 108,
    ...t.shadow.card,
  },
  summaryChipAccent: {
    backgroundColor: t.brandSoft,
    borderColor: '#99F6E4',
  },
  summaryLabel: {
    fontFamily: t.fonts.regular,
    fontSize: 11,
    color: t.inkMute,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  summaryValue: {
    fontFamily: t.fonts.bold,
    fontSize: 14,
    color: t.ink,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  sectionHead: { alignItems: 'center', gap: 12, marginBottom: 16 },
  stepBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: t.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNum: {
    fontFamily: t.fonts.bold,
    fontSize: 15,
    color: '#fff',
    fontVariant: ['tabular-nums'],
  },
  sectionTitle: {
    fontFamily: t.fonts.bold,
    fontSize: 17,
    color: t.ink,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  sectionHint: {
    marginTop: 2,
    fontFamily: t.fonts.regular,
    fontSize: 12,
    color: t.inkMute,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  fieldLabel: {
    fontFamily: t.fonts.semiBold,
    fontSize: 13,
    color: t.ink,
    marginBottom: 8,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  fieldGap: { height: 12 },
  modeGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
  },
  modeCard: {
    width: '48%',
    flexGrow: 1,
    minWidth: 140,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: t.line,
    backgroundColor: t.cardMuted,
    alignItems: 'flex-end',
    gap: 4,
  },
  modeCardOn: {
    borderColor: t.brand,
    backgroundColor: '#F0FDFA',
  },
  modeIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  modeTitle: {
    fontFamily: t.fonts.bold,
    fontSize: 14,
    color: t.ink,
    writingDirection: 'rtl',
  },
  modeTitleOn: { color: t.brandDeep },
  modeSub: {
    fontFamily: t.fonts.regular,
    fontSize: 11,
    color: t.inkMute,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  contentBlock: { marginTop: 18 },
  uploadZone: {
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: t.brand,
    backgroundColor: t.brandSoft,
  },
  uploadIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: t.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadTitle: {
    fontFamily: t.fonts.bold,
    fontSize: 14,
    color: t.ink,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  uploadSub: {
    marginTop: 2,
    fontFamily: t.fonts.regular,
    fontSize: 12,
    color: t.inkSoft,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  clearFile: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: t.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qCard: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 16,
    backgroundColor: t.cardMuted,
    borderWidth: 1,
    borderColor: t.line,
  },
  qTop: { alignItems: 'center', gap: 8 },
  qIndex: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: t.canvasTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qIndexText: {
    fontFamily: t.fonts.bold,
    fontSize: 14,
    color: t.brandDeep,
  },
  typeSeg: {
    flex: 1,
    backgroundColor: t.card,
    borderRadius: 10,
    padding: 3,
    gap: 3,
  },
  typeSegBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  typeSegBtnOn: { backgroundColor: t.brandSoft },
  typeSegText: {
    fontFamily: t.fonts.medium,
    fontSize: 12,
    color: t.inkMute,
  },
  typeSegTextOn: {
    color: t.brandDeep,
    fontFamily: t.fonts.semiBold,
  },
  trashBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: t.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  correctHint: {
    fontFamily: t.fonts.regular,
    fontSize: 11,
    color: t.success,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  choiceRow: {
    alignItems: 'center',
    gap: 8,
    padding: 6,
    borderRadius: 12,
  },
  choiceRowOn: { backgroundColor: t.successSoft },
  letter: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: t.card,
    borderWidth: 2,
    borderColor: t.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letterOn: { backgroundColor: t.success, borderColor: t.success },
  letterText: {
    fontFamily: t.fonts.bold,
    fontSize: 14,
    color: t.inkSoft,
  },
  letterTextOn: { color: '#fff' },
  addQRow: { gap: 8, marginTop: 4 },
  addQBtn: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: t.brand,
    borderStyle: 'dashed',
    backgroundColor: t.card,
  },
  addQText: {
    fontFamily: t.fonts.semiBold,
    fontSize: 13,
    color: t.brandDeep,
    writingDirection: 'rtl',
  },
  chipRow: { flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: t.cardMuted,
    borderWidth: 1,
    borderColor: t.line,
  },
  chipOn: { backgroundColor: t.brandSoft, borderColor: t.brand },
  chipMutedOn: { borderColor: t.inkSoft },
  chipText: {
    fontFamily: t.fonts.semiBold,
    fontSize: 13,
    color: t.inkSoft,
    writingDirection: 'rtl',
  },
  chipTextOn: { color: t.brandDeep },
  footerSpacer: { height: 8 },
  footer: { gap: 10, paddingTop: 8, paddingBottom: 4 },
  footerHint: {
    textAlign: 'center',
    fontFamily: t.fonts.regular,
    fontSize: 12,
    color: t.inkMute,
    writingDirection: 'rtl',
    marginBottom: 8,
  },
  footerHintOk: {
    textAlign: 'center',
    fontFamily: t.fonts.medium,
    fontSize: 12,
    color: t.brand,
    writingDirection: 'rtl',
    marginBottom: 8,
  },
});
