import { useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Input, Icon, useToast } from '@/components/ui';
import {
  FadeIn,
  SoftCard,
  TeacherScreen,
  rowRtl,
} from '@/components/teacher/ui';
import { ClassSubjectPicker } from '@/components/teacher/ClassSubjectPicker';
import { teacherTheme as t } from '@/components/teacher/theme';
import { createTeacherExam } from '@/api/teacherPortal';
import type { TeacherExamQuestion } from '@/types/teacherPortal';

const CHOICE_LETTERS = ['أ', 'ب', 'ج', 'د', 'هـ', 'و'];
const DURATION_PRESETS = [15, 30, 45, 60];

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

function totalPoints(questions: TeacherExamQuestion[]) {
  return questions.reduce((sum, q) => sum + (Number(q.points) || 0), 0);
}

export default function NewExamScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const { width } = useWindowDimensions();
  const wide = width >= 900;

  const [cls, setCls] = useState<{
    classroom_id: number;
    subject_id: number;
    label: string;
  } | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState('30');
  const [questions, setQuestions] = useState<TeacherExamQuestion[]>([emptyMcq()]);
  const [saving, setSaving] = useState(false);

  const points = useMemo(() => totalPoints(questions), [questions]);
  const mcqCount = useMemo(
    () => questions.filter((q) => q.type === 'mcq').length,
    [questions],
  );
  const writtenCount = useMemo(
    () => questions.filter((q) => q.type === 'written').length,
    [questions],
  );

  const ready = !!cls && title.trim().length >= 2 && questions.length > 0;

  const updateQ = (index: number, patch: Partial<TeacherExamQuestion>) => {
    setQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, ...patch } : q)));
  };

  const setCorrect = (qi: number, ci: number) => {
    const q = questions[qi];
    if (!q || q.type !== 'mcq') return;
    updateQ(qi, {
      choices: (q.choices || []).map((ch, i) => ({
        ...ch,
        is_correct: i === ci,
      })),
    });
  };

  const addChoice = (qi: number) => {
    const q = questions[qi];
    if (!q?.choices || q.choices.length >= CHOICE_LETTERS.length) return;
    updateQ(qi, {
      choices: [...q.choices, { text: '', is_correct: false }],
    });
  };

  const removeChoice = (qi: number, ci: number) => {
    const q = questions[qi];
    if (!q?.choices || q.choices.length <= 2) return;
    const next = q.choices.filter((_, i) => i !== ci);
    if (!next.some((c) => c.is_correct) && next[0]) next[0].is_correct = true;
    updateQ(qi, { choices: next });
  };

  const onSave = async (status: 'draft' | 'published') => {
    if (!cls) return showToast('اختر الصف والمادة أولاً', 'danger');
    if (title.trim().length < 2) return showToast('أدخل عنوان الاختبار', 'danger');
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
    setSaving(true);
    try {
      const res = await createTeacherExam({
        classroom_id: cls.classroom_id,
        subject_id: cls.subject_id,
        title: title.trim(),
        description: description.trim() || null,
        duration_minutes: Number(duration) || null,
        status,
        questions: questions.map((q) => ({
          ...q,
          choices:
            q.type === 'mcq'
              ? (q.choices || [])
                  .filter((c) => c.text.trim())
                  .map((c) => ({ text: c.text.trim(), is_correct: c.is_correct }))
              : undefined,
        })),
      });
      showToast(status === 'published' ? 'تم نشر الاختبار للطلاب' : 'تم حفظ المسودة', 'success');
      router.replace(`/teacher/exam/${res.exam.id}` as never);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'تعذر الحفظ', 'danger');
    } finally {
      setSaving(false);
    }
  };

  return (
    <TeacherScreen
      title="اختبار جديد"
      subtitle="ابنِ الأسئلة ثم انشر للطلاب"
      onBack={() => {
        if (router.canGoBack()) router.back();
        else router.replace('/teacher/exams');
      }}
      hero
    >
      <FadeIn>
        <View style={[styles.summary, { flexDirection: rowRtl as 'row' }]}>
          <SummaryChip icon="ClipboardList" label="أسئلة" value={String(questions.length)} />
          <SummaryChip icon="Trophy" label="مجموع الدرجات" value={String(points)} accent />
          <SummaryChip
            icon="Clock"
            label="المدة"
            value={duration ? `${duration} د` : '—'}
          />
          <SummaryChip
            icon="Layers"
            label="الأنواع"
            value={`${mcqCount} اختيار · ${writtenCount} مقالي`}
            flex
          />
        </View>
      </FadeIn>

      <View style={wide ? styles.wideRow : undefined}>
        <View style={wide ? styles.wideMain : undefined}>
          <FadeIn delay={40}>
            <SoftCard style={styles.sectionCard}>
              <View style={[styles.sectionHead, { flexDirection: rowRtl as 'row' }]}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepNum}>1</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionTitle}>بيانات الاختبار</Text>
                  <Text style={styles.sectionHint}>الصف، العنوان، والمدة الزمنية</Text>
                </View>
              </View>

              <Text style={styles.fieldLabel}>الصف والمادة</Text>
              <ClassSubjectPicker value={cls} onChange={setCls} />

              <View style={styles.fieldGap} />
              <Input
                label="عنوان الاختبار"
                value={title}
                onChangeText={setTitle}
                placeholder="مثال: اختبار الوحدة الأولى"
              />
              <View style={styles.fieldGap} />
              <Input
                label="وصف مختصر (اختياري)"
                value={description}
                onChangeText={setDescription}
                placeholder="تعليمات للطلاب قبل البدء..."
                multiline
              />

              <View style={styles.fieldGap} />
              <Text style={styles.fieldLabel}>مدة الاختبار</Text>
              <View style={[styles.chipRow, { flexDirection: rowRtl as 'row' }]}>
                {DURATION_PRESETS.map((mins) => {
                  const active = duration === String(mins);
                  return (
                    <Pressable
                      key={mins}
                      onPress={() => setDuration(String(mins))}
                      style={[styles.chip, active && styles.chipOn]}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextOn]}>
                        {mins} دقيقة
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <View style={styles.fieldGap} />
              <Input
                label="مدة مخصصة (بالدقائق)"
                value={duration}
                onChangeText={setDuration}
                keyboardType="number-pad"
                placeholder="30"
              />
            </SoftCard>
          </FadeIn>

          <View style={[styles.questionsHead, { flexDirection: rowRtl as 'row' }]}>
            <View style={[styles.sectionHead, { flex: 1, flexDirection: rowRtl as 'row' }]}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepNum}>2</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>الأسئلة</Text>
                <Text style={styles.sectionHint}>اضغط الخيار الصحيح لتحديد الإجابة</Text>
              </View>
            </View>
          </View>

          {questions.map((q, qi) => (
            <FadeIn key={qi} delay={60 + qi * 40}>
              <SoftCard style={styles.qCard}>
                <View style={[styles.qTop, { flexDirection: rowRtl as 'row' }]}>
                  <View style={styles.qIndex}>
                    <Text style={styles.qIndexText}>{qi + 1}</Text>
                  </View>
                  <View style={{ flex: 1, gap: 8 }}>
                    <View style={[styles.typeSeg, { flexDirection: rowRtl as 'row' }]}>
                      {(
                        [
                          { type: 'mcq' as const, label: 'اختيار من متعدد', icon: 'ClipboardCheck' },
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
                              size={15}
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
                  </View>
                  {questions.length > 1 ? (
                    <Pressable
                      onPress={() =>
                        setQuestions((prev) => prev.filter((_, i) => i !== qi))
                      }
                      style={styles.trashBtn}
                      accessibilityLabel="حذف السؤال"
                    >
                      <Icon name="Trash2" size={17} color={t.danger} />
                    </Pressable>
                  ) : (
                    <View style={{ width: 36 }} />
                  )}
                </View>

                <View style={styles.fieldGap} />
                <Input
                  label="نص السؤال"
                  value={q.text}
                  onChangeText={(text) => updateQ(qi, { text })}
                  placeholder="اكتب السؤال بوضوح..."
                  multiline
                />

                <View style={styles.fieldGap} />
                <Text style={styles.fieldLabel}>درجة السؤال</Text>
                <View style={[styles.chipRow, { flexDirection: rowRtl as 'row' }]}>
                  {[1, 2, 5, 10].map((p) => {
                    const on = Number(q.points) === p;
                    return (
                      <Pressable
                        key={p}
                        onPress={() => updateQ(qi, { points: p })}
                        style={[styles.chipSm, on && styles.chipOn]}
                      >
                        <Text style={[styles.chipText, on && styles.chipTextOn]}>{p}</Text>
                      </Pressable>
                    );
                  })}
                  <View style={{ flex: 1, minWidth: 90 }}>
                    <Input
                      value={String(q.points)}
                      onChangeText={(v) => updateQ(qi, { points: Number(v) || 1 })}
                      keyboardType="number-pad"
                      placeholder="درجة"
                    />
                  </View>
                </View>

                {q.type === 'mcq' ? (
                  <View style={styles.choicesBlock}>
                    <View
                      style={[styles.choicesHead, { flexDirection: rowRtl as 'row' }]}
                    >
                      <Text style={styles.fieldLabel}>الخيارات</Text>
                      <Text style={styles.correctHint}>اضغط الحرف لتحديد الصحيح</Text>
                    </View>
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
                          onPress={() => setCorrect(qi, ci)}
                          style={[styles.letter, c.is_correct && styles.letterOn]}
                          accessibilityLabel={
                            c.is_correct ? 'الإجابة الصحيحة' : 'تعيين كإجابة صحيحة'
                          }
                        >
                          <Text
                            style={[styles.letterText, c.is_correct && styles.letterTextOn]}
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
                            placeholder={`نص الخيار ${CHOICE_LETTERS[ci] || ci + 1}`}
                          />
                        </View>
                        {(q.choices || []).length > 2 ? (
                          <Pressable
                            onPress={() => removeChoice(qi, ci)}
                            style={styles.choiceRemove}
                          >
                            <Icon name="X" size={16} color={t.inkMute} />
                          </Pressable>
                        ) : null}
                      </View>
                    ))}
                    {(q.choices || []).length < CHOICE_LETTERS.length ? (
                      <Pressable
                        onPress={() => addChoice(qi)}
                        style={[styles.addChoice, { flexDirection: rowRtl as 'row' }]}
                      >
                        <Icon name="Plus" size={16} color={t.brand} />
                        <Text style={styles.addChoiceText}>إضافة خيار</Text>
                      </Pressable>
                    ) : null}
                  </View>
                ) : (
                  <View style={styles.writtenBlock}>
                    <Input
                      label="نموذج الإجابة (للمراجعة فقط — لا يظهر للطالب)"
                      value={q.model_answer || ''}
                      onChangeText={(model_answer) => updateQ(qi, { model_answer })}
                      placeholder="النقاط المتوقعة أو الإجابة النموذجية..."
                      multiline
                    />
                  </View>
                )}
              </SoftCard>
            </FadeIn>
          ))}

          <View style={[styles.addQRow, wide && { flexDirection: rowRtl as 'row' }]}>
            <Pressable
              onPress={() => setQuestions((prev) => [...prev, emptyMcq()])}
              style={[styles.addQCard, styles.addQMcq]}
            >
              <View style={[styles.addQIcon, { backgroundColor: t.brandSoft }]}>
                <Icon name="ClipboardCheck" size={22} color={t.brand} />
              </View>
              <Text style={styles.addQTitle}>سؤال اختيار</Text>
              <Text style={styles.addQSub}>خيارات متعددة + إجابة صحيحة</Text>
            </Pressable>
            <Pressable
              onPress={() => setQuestions((prev) => [...prev, emptyWritten()])}
              style={[styles.addQCard, styles.addQWritten]}
            >
              <View style={[styles.addQIcon, { backgroundColor: t.accentSoft }]}>
                <Icon name="Pencil" size={22} color={t.accent} />
              </View>
              <Text style={styles.addQTitle}>سؤال مقالي</Text>
              <Text style={styles.addQSub}>إجابة مفتوحة للمراجعة اليدوية</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <View style={styles.footerSpacer} />
      <View style={[styles.footer, { flexDirection: rowRtl as 'row' }]}>
        <View style={{ flex: 1 }}>
          <Button
            label={saving ? 'جارٍ الحفظ...' : 'حفظ كمسودة'}
            variant="outline"
            icon="FileText"
            onPress={() => onSave('draft')}
            disabled={saving || !ready}
            style={{ alignSelf: 'stretch' }}
          />
        </View>
        <View style={{ flex: 1.2 }}>
          <Button
            label={saving ? 'جارٍ النشر...' : 'نشر للطلاب'}
            icon="Send"
            onPress={() => onSave('published')}
            disabled={saving || !ready}
            style={{ alignSelf: 'stretch' }}
          />
        </View>
      </View>
      {!ready ? (
        <Text style={styles.footerHint}>
          أكمل اختيار الصف وعنوان الاختبار لتفعيل الحفظ
        </Text>
      ) : (
        <Text style={styles.footerHintOk}>
          جاهز — {questions.length} سؤال · {points} درجة
        </Text>
      )}
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
        flex && { flex: 1.4, minWidth: 140 },
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
  summary: {
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
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
    fontVariant: ['tabular-nums'],
  },
  wideRow: { gap: 16 },
  wideMain: { flex: 1 },
  sectionCard: { gap: 0 },
  sectionHead: {
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
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
  fieldGap: { height: 14 },
  chipRow: {
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: t.cardMuted,
    borderWidth: 1,
    borderColor: t.line,
  },
  chipSm: {
    minWidth: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: t.cardMuted,
    borderWidth: 1,
    borderColor: t.line,
    alignItems: 'center',
  },
  chipOn: {
    backgroundColor: t.brandSoft,
    borderColor: t.brand,
  },
  chipText: {
    fontFamily: t.fonts.semiBold,
    fontSize: 13,
    color: t.inkSoft,
    writingDirection: 'rtl',
  },
  chipTextOn: { color: t.brandDeep },
  questionsHead: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  qCard: { gap: 0 },
  qTop: { alignItems: 'flex-start', gap: 10 },
  qIndex: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: t.canvasTint,
    borderWidth: 1,
    borderColor: '#B2F5EA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qIndexText: {
    fontFamily: t.fonts.bold,
    fontSize: 15,
    color: t.brandDeep,
    fontVariant: ['tabular-nums'],
  },
  typeSeg: {
    backgroundColor: t.cardMuted,
    borderRadius: 12,
    padding: 3,
    gap: 3,
    flexWrap: 'wrap',
  },
  typeSegBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  typeSegBtnOn: {
    backgroundColor: t.card,
    ...t.shadow.card,
  },
  typeSegText: {
    fontFamily: t.fonts.medium,
    fontSize: 12,
    color: t.inkMute,
    writingDirection: 'rtl',
  },
  typeSegTextOn: {
    color: t.brandDeep,
    fontFamily: t.fonts.semiBold,
  },
  trashBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: t.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choicesBlock: { marginTop: 16, gap: 8 },
  choicesHead: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  correctHint: {
    fontFamily: t.fonts.regular,
    fontSize: 11,
    color: t.success,
    writingDirection: 'rtl',
  },
  choiceRow: {
    alignItems: 'center',
    gap: 8,
    padding: 8,
    borderRadius: 14,
    backgroundColor: t.cardMuted,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  choiceRowOn: {
    backgroundColor: t.successSoft,
    borderColor: '#6EE7B7',
  },
  letter: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: t.card,
    borderWidth: 2,
    borderColor: t.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letterOn: {
    backgroundColor: t.success,
    borderColor: t.success,
  },
  letterText: {
    fontFamily: t.fonts.bold,
    fontSize: 15,
    color: t.inkSoft,
  },
  letterTextOn: { color: '#fff' },
  choiceRemove: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addChoice: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: t.brand,
    borderStyle: 'dashed',
    backgroundColor: t.brandSoft,
  },
  addChoiceText: {
    fontFamily: t.fonts.semiBold,
    fontSize: 13,
    color: t.brandDeep,
    writingDirection: 'rtl',
  },
  writtenBlock: { marginTop: 14 },
  addQRow: { gap: 10, marginTop: 4 },
  addQCard: {
    flex: 1,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    gap: 6,
    alignItems: 'flex-end',
    ...t.shadow.card,
  },
  addQMcq: {
    backgroundColor: t.card,
    borderColor: '#99F6E4',
  },
  addQWritten: {
    backgroundColor: t.card,
    borderColor: '#BAE6FD',
  },
  addQIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  addQTitle: {
    fontFamily: t.fonts.bold,
    fontSize: 15,
    color: t.ink,
    writingDirection: 'rtl',
  },
  addQSub: {
    fontFamily: t.fonts.regular,
    fontSize: 12,
    color: t.inkMute,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  footerSpacer: { height: 8 },
  footer: {
    gap: 10,
    paddingTop: 8,
    paddingBottom: 4,
  },
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
