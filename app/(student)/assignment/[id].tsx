import { useCallback, useMemo, useState } from 'react';
import {
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Button, EmptyState, Icon, useToast } from '@/components/ui';
import {
  FadeIn,
  IconBadge,
  LoadingBlock,
  StudentPageShell,
  assignmentStatusLabel,
  formatShortDate,
  rowRtl,
} from '@/components/student/ui';
import { studentTheme as t } from '@/components/student/theme';
import { ApiError } from '@/api/client';
import { getTaskDetail, submitTask, submitTaskPdf } from '@/services/studentPortal';
import type { TaskDetail } from '@/services/studentPortal';

const CHOICE_LETTERS = ['أ', 'ب', 'ج', 'د', 'هـ', 'و'];

function statusTone(status: string) {
  if (status === 'overdue') return { color: t.danger, soft: t.dangerSoft };
  if (status === 'graded') return { color: t.success, soft: t.successSoft };
  if (status === 'submitted') return { color: t.sky, soft: t.skySoft };
  return { color: t.warning, soft: t.warningSoft };
}

export default function AssignmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();
  const [detail, setDetail] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [mcq, setMcq] = useState<Record<string, string>>({});
  const [written, setWritten] = useState<Record<string, string>>({});
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getTaskDetail(String(id));
      setDetail(data);
      if (data) {
        const nextMcq: Record<string, string> = {};
        const nextWritten: Record<string, string> = {};
        for (const q of data.questions) {
          if (q.yourChoiceId) nextMcq[q.id] = q.yourChoiceId;
          if (q.yourWritten) nextWritten[q.id] = q.yourWritten;
        }
        setMcq(nextMcq);
        setWritten(nextWritten);
        setNote(data.task.submissionNote || '');
      }
    } catch {
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const pickStudentPdf = () => {
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
      showToast('تم اختيار ملف الإجابة', 'success');
    };
    input.click();
  };

  const onSubmit = async () => {
    if (!detail) return;
    const mode = detail.task.submissionMode || 'questions';
    const { questions } = detail;

    if (mode === 'pdf') {
      if (!pdfFile) {
        showToast('ارفع ملف PDF بإجابتك قبل التسليم', 'warning');
        return;
      }
      setBusy(true);
      try {
        await submitTaskPdf(String(id), {
          submission_note: note.trim() || null,
          file: pdfFile,
        });
        showToast('تم تسليم ملف PDF — بانتظار تقييم المدرس', 'success');
        setPdfFile(null);
        await load();
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message === 'Task already submitted'
              ? 'تم تسليم هذا الواجب مسبقاً'
              : err.message === 'Task deadline has passed'
                ? 'انتهى موعد التسليم'
                : err.message
            : 'تعذر تسليم الواجب';
        showToast(msg, 'danger');
      } finally {
        setBusy(false);
      }
      return;
    }

    if (questions.length > 0) {
      const unanswered = questions.filter((q) =>
        q.type === 'mcq' ? !mcq[q.id] : !written[q.id]?.trim(),
      );
      if (unanswered.length > 0) {
        showToast(`أجب عن ${unanswered.length} سؤال متبقي قبل التسليم`, 'warning');
        return;
      }
    }

    setBusy(true);
    try {
      const answers = questions.map((q) => ({
        question_id: Number(q.id),
        choice_id: q.type === 'mcq' && mcq[q.id] ? Number(mcq[q.id]) : null,
        written_answer:
          q.type === 'written' ? written[q.id]?.trim() || null : null,
      }));
      const res = await submitTask(String(id), {
        submission_note: note.trim() || null,
        answers,
      });
      showToast(
        res.auto_scored && res.score != null
          ? `تم التسليم — درجتك ${res.score}/${res.max_score}`
          : 'تم تسليم الواجب بنجاح',
        'success',
      );
      await load();
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message === 'Task already submitted'
            ? 'تم تسليم هذا الواجب مسبقاً'
            : err.message === 'Task deadline has passed'
              ? 'انتهى موعد التسليم'
              : err.message === 'Something went wrong'
                ? 'تعذر التسليم — حاول مرة أخرى'
                : err.message
          : err instanceof Error
            ? err.message
            : 'تعذر تسليم الواجب';
      showToast(msg, 'danger');
    } finally {
      setBusy(false);
    }
  };

  const answeredCount = useMemo(() => {
    if (!detail) return 0;
    return detail.questions.filter((q) =>
      q.type === 'mcq' ? !!mcq[q.id] : !!written[q.id]?.trim(),
    ).length;
  }, [detail, mcq, written]);

  if (loading) {
    return (
      <StudentPageShell title="الواجب" icon="ClipboardList">
        <LoadingBlock />
      </StudentPageShell>
    );
  }

  if (!detail) {
    return (
      <StudentPageShell title="الواجب" icon="ClipboardList">
        <EmptyState
          icon="FileText"
          title="الواجب غير موجود"
          actionLabel="العودة"
          onAction={() => router.back()}
        />
      </StudentPageShell>
    );
  }

  const { task, attachments, questions } = detail;
  const locked = task.status === 'submitted' || task.status === 'graded';
  const due = formatShortDate(task.dueAt);
  const tone = statusTone(task.status);
  const totalPts = questions.reduce((s, q) => s + (q.points || 0), 0) || task.maxScore;

  return (
    <StudentPageShell
      title="تفاصيل الواجب"
      subtitle={task.subjectName || 'واجب دراسي'}
      icon="ClipboardList"
      refreshing={false}
      onRefresh={load}
    >
      <FadeIn>
        <View style={styles.hero}>
          <View style={[styles.heroAccent, { backgroundColor: tone.color }]} />
          <View style={styles.heroBody}>
            <View style={[styles.heroTop, { flexDirection: rowRtl as 'row' }]}>
              <View style={[styles.statusPill, { backgroundColor: tone.soft }]}>
                <Text style={[styles.statusText, { color: tone.color }]}>
                  {assignmentStatusLabel[task.status] || task.status}
                </Text>
              </View>
              {task.score != null ? (
                <View style={styles.scoreChip}>
                  <Text style={styles.scoreChipText}>
                    {task.score}/{task.maxScore}
                  </Text>
                </View>
              ) : totalPts ? (
                <View style={styles.pointsChip}>
                  <Text style={styles.pointsChipText}>{totalPts} درجة</Text>
                </View>
              ) : null}
            </View>

            <Text style={styles.title}>{task.title}</Text>

            <View style={styles.metaRow}>
              {task.subjectName ? (
                <View style={styles.metaChip}>
                  <Icon name="BookOpen" size={12} color={t.inkMute} />
                  <Text style={styles.metaChipText}>{task.subjectName}</Text>
                </View>
              ) : null}
              {task.teacherName ? (
                <View style={styles.metaChip}>
                  <Icon name="GraduationCap" size={12} color={t.inkMute} />
                  <Text style={styles.metaChipText}>أ/{task.teacherName}</Text>
                </View>
              ) : null}
              {due ? (
                <View style={styles.metaChip}>
                  <Icon name="CalendarDays" size={12} color={t.inkMute} />
                  <Text style={styles.metaChipText}>تسليم {due}</Text>
                </View>
              ) : null}
            </View>

            {task.description ? (
              <Text style={styles.body}>{task.description}</Text>
            ) : null}

            {!locked && questions.length > 0 ? (
              <View style={styles.progressBlock}>
                <View
                  style={[styles.progressHead, { flexDirection: rowRtl as 'row' }]}
                >
                  <Text style={styles.progressLabel}>تقدّم الإجابة</Text>
                  <Text style={styles.progressValue}>
                    {answeredCount}/{questions.length}
                  </Text>
                </View>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.round(
                          (answeredCount / Math.max(questions.length, 1)) * 100,
                        )}%`,
                      },
                    ]}
                  />
                </View>
              </View>
            ) : null}
          </View>
        </View>
      </FadeIn>

      {task.review ? (
        <FadeIn delay={40}>
          <View style={styles.reviewBox}>
            <View style={[styles.reviewHead, { flexDirection: rowRtl as 'row' }]}>
              <IconBadge name="MessageSquare" color={t.brand} size={36} />
              <Text style={styles.reviewTitle}>مراجعة المدرس</Text>
            </View>
            <Text style={styles.reviewBody}>{task.review}</Text>
          </View>
        </FadeIn>
      ) : null}

      {attachments.length > 0 ? (
        <FadeIn delay={50}>
          <Text style={styles.section}>المرفقات</Text>
          <View style={styles.list}>
            {attachments.map((a) => (
              <Pressable
                key={a.id}
                style={({ pressed }) => [
                  styles.attach,
                  { flexDirection: rowRtl as 'row' },
                  pressed && { opacity: 0.92 },
                ]}
                onPress={() => Linking.openURL(a.fileUrl)}
              >
                <View
                  style={[
                    styles.attachIcon,
                    {
                      backgroundColor:
                        a.kind === 'video' ? t.skySoft : t.brandSoft,
                    },
                  ]}
                >
                  <Icon
                    name={a.kind === 'video' ? 'Play' : 'FileText'}
                    size={18}
                    color={a.kind === 'video' ? t.sky : t.brand}
                  />
                </View>
                <View style={styles.attachText}>
                  <Text style={styles.attachTitle} numberOfLines={1}>
                    {a.title}
                  </Text>
                  <Text style={styles.attachHint}>
                    {a.kind === 'video' ? 'فتح الفيديو' : 'فتح ملف PDF'}
                  </Text>
                </View>
                <Icon name="ChevronLeft" size={18} color={t.inkMute} />
              </Pressable>
            ))}
          </View>
        </FadeIn>
      ) : null}

      {task.submissionMode === 'pdf' ? (
        <FadeIn delay={70}>
          <View style={[styles.hintBox, { flexDirection: rowRtl as 'row' }]}>
            <Icon name="FileText" size={18} color={t.sky} />
            <Text style={styles.hintText}>
              حمّل ورقة الواجب أعلاه، أنجزها، ثم ارفع إجابتك كملف PDF.
            </Text>
          </View>
          {locked && task.submissionFileUrl ? (
            <Pressable
              style={[styles.attach, { flexDirection: rowRtl as 'row' }]}
              onPress={() => Linking.openURL(task.submissionFileUrl!)}
            >
              <View style={[styles.attachIcon, { backgroundColor: t.brandSoft }]}>
                <Icon name="Upload" size={18} color={t.brand} />
              </View>
              <View style={styles.attachText}>
                <Text style={styles.attachTitle}>ملفك المسلَّم</Text>
                <Text style={styles.attachHint}>
                  {task.submissionFilename || 'فتح PDF'}
                </Text>
              </View>
              <Icon name="ChevronLeft" size={18} color={t.inkMute} />
            </Pressable>
          ) : null}
        </FadeIn>
      ) : questions.length > 0 ? (
        <FadeIn delay={70}>
          <Text style={styles.section}>الأسئلة ({questions.length})</Text>
          <View style={styles.list}>
            {questions.map((q, i) => {
              const answered =
                q.type === 'mcq' ? !!mcq[q.id] : !!written[q.id]?.trim();
              return (
                <View key={q.id} style={styles.qCard}>
                  <View
                    style={[styles.qHead, { flexDirection: rowRtl as 'row' }]}
                  >
                    <View style={styles.qIndex}>
                      <Text style={styles.qIndexText}>{i + 1}</Text>
                    </View>
                    <View style={styles.qHeadText}>
                      <Text style={styles.qTitle}>{q.text}</Text>
                      <Text style={styles.qPts}>{q.points} درجة</Text>
                    </View>
                    {!locked && answered ? (
                      <Icon name="Check" size={16} color={t.success} />
                    ) : null}
                  </View>

                  {q.type === 'written' ? (
                    <TextInput
                      style={styles.written}
                      multiline
                      editable={!locked}
                      textAlign="right"
                      placeholder="اكتب إجابتك هنا..."
                      placeholderTextColor={t.inkMute}
                      value={written[q.id] || ''}
                      onChangeText={(v) =>
                        setWritten((prev) => ({ ...prev, [q.id]: v }))
                      }
                    />
                  ) : (
                    <View style={styles.choices}>
                      {q.choices.map((c, ci) => {
                        const selected = mcq[q.id] === c.id;
                        const showCorrect = locked && c.isCorrect;
                        const showWrong =
                          locked && selected && c.isCorrect === false;
                        return (
                          <Pressable
                            key={c.id}
                            disabled={locked}
                            style={({ pressed }) => [
                              styles.choice,
                              { flexDirection: rowRtl as 'row' },
                              selected && styles.choiceOn,
                              showCorrect && styles.choiceCorrect,
                              showWrong && styles.choiceWrong,
                              pressed && !locked && { opacity: 0.92 },
                            ]}
                            onPress={() =>
                              setMcq((prev) => ({ ...prev, [q.id]: c.id }))
                            }
                          >
                            <View
                              style={[
                                styles.choiceLetter,
                                selected && styles.choiceLetterOn,
                                showCorrect && styles.choiceLetterCorrect,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.choiceLetterText,
                                  (selected || showCorrect) &&
                                    styles.choiceLetterTextOn,
                                ]}
                              >
                                {CHOICE_LETTERS[ci] || String(ci + 1)}
                              </Text>
                            </View>
                            <Text
                              style={[
                                styles.choiceText,
                                selected && styles.choiceTextOn,
                              ]}
                            >
                              {c.text}
                            </Text>
                            {selected && !locked ? (
                              <Icon name="Check" size={16} color={t.brand} />
                            ) : null}
                            {showCorrect ? (
                              <Icon name="Check" size={16} color={t.success} />
                            ) : null}
                          </Pressable>
                        );
                      })}
                    </View>
                  )}

                  {locked && q.isCorrect === false ? (
                    <Text style={styles.wrong}>إجابة غير صحيحة</Text>
                  ) : null}
                  {locked && q.isCorrect === true ? (
                    <Text style={styles.ok}>إجابة صحيحة</Text>
                  ) : null}
                </View>
              );
            })}
          </View>
        </FadeIn>
      ) : (
        <FadeIn delay={70}>
          <View style={[styles.hintBox, { flexDirection: rowRtl as 'row' }]}>
            <Icon name="Sparkles" size={18} color={t.sky} />
            <Text style={styles.hintText}>لا توجد أسئلة في هذا الواجب.</Text>
          </View>
        </FadeIn>
      )}

      {!locked ? (
        <FadeIn delay={90}>
          <View style={styles.submitCard}>
            {task.submissionMode === 'pdf' ? (
              <>
                <Text style={styles.submitLabel}>رفع إجابتك (PDF)</Text>
                <Pressable
                  onPress={pickStudentPdf}
                  style={({ pressed }) => [
                    styles.pdfPick,
                    { flexDirection: rowRtl as 'row' },
                    pressed && { opacity: 0.92 },
                    !!pdfFile && styles.pdfPickOn,
                  ]}
                >
                  <Icon
                    name="Upload"
                    size={18}
                    color={pdfFile ? t.brandDeep : t.inkSoft}
                  />
                  <Text
                    style={[styles.pdfPickText, pdfFile && styles.pdfPickTextOn]}
                    numberOfLines={1}
                  >
                    {pdfFile ? pdfFile.name : 'اختر ملف PDF'}
                  </Text>
                </Pressable>
              </>
            ) : null}

            <Text style={styles.submitLabel}>ملاحظة للمدرس (اختياري)</Text>
            <TextInput
              style={styles.noteInput}
              multiline
              textAlign="right"
              placeholder="مثال: أنهيت التمرين من الكتاب..."
              placeholderTextColor={t.inkMute}
              value={note}
              onChangeText={setNote}
            />

            <Pressable
              onPress={onSubmit}
              disabled={busy}
              style={({ pressed }) => [
                styles.submitBtn,
                { flexDirection: rowRtl as 'row' },
                busy && { opacity: 0.7 },
                pressed && !busy && { opacity: 0.92 },
              ]}
            >
              <Icon name="Send" size={18} color="#fff" />
              <Text style={styles.submitBtnText}>
                {busy ? 'جارٍ التسليم...' : 'تسليم الواجب'}
              </Text>
            </Pressable>
          </View>
        </FadeIn>
      ) : (
        <FadeIn delay={90}>
          <View style={[styles.lockedBox, { flexDirection: rowRtl as 'row' }]}>
            <IconBadge name="Check" color={t.success} size={44} />
            <View style={styles.lockedText}>
              <Text style={styles.locked}>تم تسليم هذا الواجب</Text>
              {task.submittedAt ? (
                <Text style={styles.lockedMeta}>
                  {formatShortDate(task.submittedAt)}
                </Text>
              ) : null}
            </View>
          </View>
        </FadeIn>
      )}

      <Button
        label="العودة لقائمة الواجبات"
        variant="outline"
        onPress={() => router.replace('/(student)/assignments' as never)}
      />
    </StudentPageShell>
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
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: t.radius.full,
  },
  statusText: {
    fontFamily: t.fonts.semiBold,
    fontSize: 12,
  },
  scoreChip: {
    backgroundColor: t.brandSoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: t.radius.full,
  },
  scoreChipText: {
    fontFamily: t.fonts.bold,
    fontSize: 14,
    color: t.brandDeep,
    fontVariant: ['tabular-nums'],
  },
  pointsChip: {
    backgroundColor: t.cardMuted,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: t.radius.full,
  },
  pointsChipText: {
    fontFamily: t.fonts.semiBold,
    fontSize: 12,
    color: t.inkSoft,
  },
  title: {
    fontFamily: t.fonts.bold,
    fontSize: 22,
    color: t.ink,
    textAlign: 'right',
    letterSpacing: -0.3,
    lineHeight: 30,
  },
  metaRow: {
    flexDirection: rowRtl,
    flexWrap: 'wrap',
    gap: 8,
  },
  metaChip: {
    flexDirection: rowRtl,
    alignItems: 'center',
    gap: 4,
    backgroundColor: t.cardMuted,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: t.radius.full,
  },
  metaChipText: {
    fontFamily: t.fonts.medium,
    fontSize: 12,
    color: t.inkSoft,
  },
  body: {
    fontFamily: t.fonts.regular,
    fontSize: 14,
    color: t.inkSoft,
    textAlign: 'right',
    lineHeight: 22,
  },
  progressBlock: { gap: 8 },
  progressHead: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontFamily: t.fonts.medium,
    fontSize: 12,
    color: t.inkMute,
  },
  progressValue: {
    fontFamily: t.fonts.bold,
    fontSize: 13,
    color: t.brandDeep,
    fontVariant: ['tabular-nums'],
  },
  progressTrack: {
    height: 8,
    borderRadius: 8,
    backgroundColor: t.cardMuted,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 8,
    backgroundColor: t.brand,
  },
  reviewBox: {
    backgroundColor: t.brandSoft,
    borderRadius: t.radius.xl,
    padding: t.space.md,
    gap: 10,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  reviewHead: {
    alignItems: 'center',
    gap: 10,
  },
  reviewTitle: {
    flex: 1,
    fontFamily: t.fonts.bold,
    fontSize: 14,
    color: t.brandDeep,
    textAlign: 'right',
  },
  reviewBody: {
    fontFamily: t.fonts.regular,
    fontSize: 14,
    color: t.ink,
    textAlign: 'right',
    lineHeight: 22,
  },
  section: {
    fontFamily: t.fonts.bold,
    fontSize: 16,
    color: t.ink,
    textAlign: 'right',
  },
  list: { gap: 10 },
  attach: {
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: t.line,
    borderRadius: t.radius.xl,
    padding: t.space.md,
    backgroundColor: t.card,
    ...t.shadow.card,
  },
  attachIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachText: { flex: 1, gap: 2 },
  attachTitle: {
    fontFamily: t.fonts.semiBold,
    fontSize: 14,
    color: t.ink,
    textAlign: 'right',
  },
  attachHint: {
    fontFamily: t.fonts.medium,
    fontSize: 12,
    color: t.brand,
    textAlign: 'right',
  },
  hintBox: {
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: t.skySoft,
    borderRadius: t.radius.lg,
    padding: t.space.md,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  hintText: {
    flex: 1,
    fontFamily: t.fonts.regular,
    fontSize: 13,
    color: t.inkSoft,
    textAlign: 'right',
    lineHeight: 20,
  },
  qCard: {
    borderWidth: 1,
    borderColor: t.line,
    borderRadius: t.radius.xl,
    padding: t.space.md,
    gap: 14,
    backgroundColor: t.card,
    ...t.shadow.card,
  },
  qHead: {
    alignItems: 'flex-start',
    gap: 12,
  },
  qIndex: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: t.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qIndexText: {
    fontFamily: t.fonts.bold,
    fontSize: 14,
    color: t.brandDeep,
    fontVariant: ['tabular-nums'],
  },
  qHeadText: { flex: 1, gap: 4 },
  qTitle: {
    fontFamily: t.fonts.bold,
    fontSize: 15,
    color: t.ink,
    textAlign: 'right',
    lineHeight: 22,
  },
  qPts: {
    fontFamily: t.fonts.medium,
    fontSize: 12,
    color: t.inkMute,
    textAlign: 'right',
  },
  choices: { gap: 8 },
  choice: {
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderColor: t.line,
    borderRadius: t.radius.lg,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: t.card,
  },
  choiceOn: {
    borderColor: t.brand,
    backgroundColor: t.brandSoft,
  },
  choiceCorrect: {
    borderColor: t.success,
    backgroundColor: t.successSoft,
  },
  choiceWrong: {
    borderColor: t.danger,
    backgroundColor: t.dangerSoft,
  },
  choiceLetter: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: t.cardMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceLetterOn: {
    backgroundColor: t.brand,
  },
  choiceLetterCorrect: {
    backgroundColor: t.success,
  },
  choiceLetterText: {
    fontFamily: t.fonts.bold,
    fontSize: 13,
    color: t.inkSoft,
  },
  choiceLetterTextOn: {
    color: '#fff',
  },
  choiceText: {
    flex: 1,
    fontFamily: t.fonts.medium,
    fontSize: 15,
    color: t.ink,
    textAlign: 'right',
  },
  choiceTextOn: {
    fontFamily: t.fonts.bold,
    color: t.brandDeep,
  },
  written: {
    minHeight: 110,
    borderWidth: 1,
    borderColor: t.line,
    borderRadius: t.radius.lg,
    padding: t.space.md,
    fontFamily: t.fonts.regular,
    fontSize: 14,
    color: t.ink,
    backgroundColor: t.cardMuted,
    textAlignVertical: 'top',
  },
  wrong: {
    fontFamily: t.fonts.semiBold,
    fontSize: 12,
    color: t.danger,
    textAlign: 'right',
  },
  ok: {
    fontFamily: t.fonts.semiBold,
    fontSize: 12,
    color: t.success,
    textAlign: 'right',
  },
  submitCard: {
    backgroundColor: t.card,
    borderRadius: t.radius.xl,
    borderWidth: 1,
    borderColor: t.line,
    padding: t.space.lg,
    gap: 12,
    ...t.shadow.card,
  },
  submitLabel: {
    fontFamily: t.fonts.semiBold,
    fontSize: 13,
    color: t.inkSoft,
    textAlign: 'right',
  },
  pdfPick: {
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: t.line,
    borderRadius: t.radius.lg,
    padding: t.space.md,
    backgroundColor: t.cardMuted,
  },
  pdfPickOn: {
    borderColor: t.brand,
    borderStyle: 'solid',
    backgroundColor: t.brandSoft,
  },
  pdfPickText: {
    flex: 1,
    fontFamily: t.fonts.medium,
    fontSize: 13,
    color: t.inkSoft,
    textAlign: 'right',
  },
  pdfPickTextOn: {
    color: t.brandDeep,
    fontFamily: t.fonts.semiBold,
  },
  noteInput: {
    minHeight: 84,
    borderWidth: 1,
    borderColor: t.line,
    borderRadius: t.radius.lg,
    padding: t.space.md,
    fontFamily: t.fonts.regular,
    fontSize: 14,
    color: t.ink,
    backgroundColor: t.cardMuted,
    textAlignVertical: 'top',
  },
  submitBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: t.brand,
    borderRadius: t.radius.lg,
    paddingVertical: 16,
    marginTop: 4,
    ...t.shadow.float,
  },
  submitBtnText: {
    fontFamily: t.fonts.bold,
    fontSize: 15,
    color: '#fff',
  },
  lockedBox: {
    alignItems: 'center',
    gap: 12,
    backgroundColor: t.successSoft,
    borderRadius: t.radius.xl,
    padding: t.space.md,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  lockedText: { flex: 1, gap: 2 },
  locked: {
    fontFamily: t.fonts.bold,
    fontSize: 15,
    color: t.success,
    textAlign: 'right',
  },
  lockedMeta: {
    fontFamily: t.fonts.regular,
    fontSize: 12,
    color: t.inkMute,
    textAlign: 'right',
  },
});
