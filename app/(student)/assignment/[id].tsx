import { useCallback, useState } from 'react';
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
import { Badge, Button, EmptyState, Icon, useToast } from '@/components/ui';
import {
  FadeIn,
  LoadingBlock,
  StudentScreen,
  assignmentStatusLabel,
  formatShortDate,
  rowRtl,
} from '@/components/student/ui';
import { studentTheme as t } from '@/components/student/theme';
import { ApiError } from '@/api/client';
import { getTaskDetail, submitTask, submitTaskPdf } from '@/services/studentPortal';
import type { TaskDetail } from '@/services/studentPortal';

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

  if (loading) {
    return (
      <StudentScreen title="الواجب" onBack>
        <LoadingBlock />
      </StudentScreen>
    );
  }

  if (!detail) {
    return (
      <StudentScreen title="الواجب" onBack>
        <EmptyState
          icon="FileText"
          title="الواجب غير موجود"
          actionLabel="العودة"
          onAction={() => router.back()}
        />
      </StudentScreen>
    );
  }

  const { task, attachments, questions } = detail;
  const locked = task.status === 'submitted' || task.status === 'graded';
  const due = formatShortDate(task.dueAt);
  const metaBits = [task.subjectName, task.teacherName, due ? `تسليم ${due}` : null].filter(
    Boolean,
  ) as string[];

  return (
    <StudentScreen title="تفاصيل الواجب" onBack hero>
      <FadeIn>
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <Badge
              label={assignmentStatusLabel[task.status] || task.status}
              tone={
                task.status === 'overdue'
                  ? 'danger'
                  : task.status === 'graded'
                    ? 'success'
                    : task.status === 'submitted'
                      ? 'info'
                      : 'warning'
              }
            />
            {task.score != null ? (
              <View style={styles.scoreChip}>
                <Text style={styles.scoreChipText}>
                  {task.score}/{task.maxScore}
                </Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.title}>{task.title}</Text>
          {metaBits.length > 0 ? (
            <Text style={styles.meta}>{metaBits.join(' · ')}</Text>
          ) : null}
          {task.description ? (
            <Text style={styles.body}>{task.description}</Text>
          ) : null}
        </View>
      </FadeIn>

      {task.review ? (
        <FadeIn delay={40}>
          <View style={styles.reviewBox}>
            <View style={styles.reviewHead}>
              <Icon name="MessageSquare" size={16} color={t.brandDeep} />
              <Text style={styles.reviewTitle}>مراجعة المدرس</Text>
            </View>
            <Text style={styles.reviewBody}>{task.review}</Text>
          </View>
        </FadeIn>
      ) : null}

      {attachments.length > 0 ? (
        <FadeIn delay={60}>
          <Text style={styles.section}>المرفقات</Text>
          {attachments.map((a) => (
            <Pressable
              key={a.id}
              style={({ pressed }) => [styles.attach, pressed && { opacity: 0.9 }]}
              onPress={() => Linking.openURL(a.fileUrl)}
            >
              <View
                style={[
                  styles.attachIcon,
                  { backgroundColor: a.kind === 'video' ? t.skySoft : t.brandSoft },
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
        </FadeIn>
      ) : null}

      {task.submissionMode === 'pdf' ? (
        <FadeIn delay={80}>
          <View style={styles.hintBox}>
            <Icon name="FileText" size={18} color={t.sky} />
            <Text style={styles.hintText}>
              حمّل ورقة الواجب أعلاه، أنجزها، ثم ارفع إجابتك كملف PDF.
            </Text>
          </View>
          {locked && task.submissionFileUrl ? (
            <Pressable
              style={styles.attach}
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
        <FadeIn delay={80}>
          <Text style={styles.section}>الأسئلة ({questions.length})</Text>
          {questions.map((q, i) => (
            <View key={q.id} style={styles.qCard}>
              <Text style={styles.qTitle}>
                {i + 1}. {q.text}{' '}
                <Text style={styles.qPts}>({q.points} درجة)</Text>
              </Text>
              {q.type === 'written' ? (
                <TextInput
                  style={styles.written}
                  multiline
                  editable={!locked}
                  textAlign="right"
                  placeholder="اكتب إجابتك..."
                  placeholderTextColor={t.inkMute}
                  value={written[q.id] || ''}
                  onChangeText={(v) =>
                    setWritten((prev) => ({ ...prev, [q.id]: v }))
                  }
                />
              ) : (
                q.choices.map((c) => {
                  const selected = mcq[q.id] === c.id;
                  return (
                    <Pressable
                      key={c.id}
                      disabled={locked}
                      style={[styles.choice, selected && styles.choiceOn]}
                      onPress={() =>
                        setMcq((prev) => ({ ...prev, [q.id]: c.id }))
                      }
                    >
                      <Text
                        style={[
                          styles.choiceText,
                          selected && styles.choiceTextOn,
                        ]}
                      >
                        {c.text}
                        {locked && c.isCorrect ? ' — صحيحة' : ''}
                      </Text>
                    </Pressable>
                  );
                })
              )}
              {locked && q.isCorrect === false ? (
                <Text style={styles.wrong}>إجابة غير صحيحة</Text>
              ) : null}
              {locked && q.isCorrect === true ? (
                <Text style={styles.ok}>إجابة صحيحة</Text>
              ) : null}
            </View>
          ))}
        </FadeIn>
      ) : (
        <FadeIn delay={80}>
          <View style={styles.hintBox}>
            <Icon name="Sparkles" size={18} color={t.sky} />
            <Text style={styles.hintText}>لا توجد أسئلة في هذا الواجب.</Text>
          </View>
        </FadeIn>
      )}

      {!locked ? (
        <FadeIn delay={100}>
          {task.submissionMode === 'pdf' ? (
            <>
              <Text style={styles.section}>رفع إجابتك (PDF)</Text>
              <Button
                label={pdfFile ? `تم الاختيار: ${pdfFile.name}` : 'اختر ملف PDF'}
                variant="outline"
                icon="Upload"
                onPress={pickStudentPdf}
              />
            </>
          ) : null}
          <Text style={styles.section}>ملاحظة للمدرس (اختياري)</Text>
          <TextInput
            style={styles.written}
            multiline
            textAlign="right"
            placeholder="مثال: أنهيت التمرين من الكتاب..."
            placeholderTextColor={t.inkMute}
            value={note}
            onChangeText={setNote}
          />
          <Button
            label={busy ? 'جارٍ التسليم...' : 'تسليم الواجب'}
            disabled={busy}
            onPress={onSubmit}
          />
        </FadeIn>
      ) : (
        <FadeIn delay={100}>
          <View style={styles.lockedBox}>
            <Icon name="Check" size={22} color={t.success} />
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
    </StudentScreen>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    backgroundColor: t.card,
    borderRadius: t.radius.xl,
    borderWidth: 1,
    borderColor: t.line,
    padding: t.space.xl,
    gap: 8,
    ...t.shadow.card,
  },
  heroTop: {
    flexDirection: rowRtl,
    justifyContent: 'space-between',
    alignItems: 'center',
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
  title: {
    fontFamily: t.fonts.bold,
    fontSize: 20,
    color: t.ink,
    textAlign: 'right',
  },
  meta: {
    fontFamily: t.fonts.regular,
    fontSize: 13,
    color: t.inkMute,
    textAlign: 'right',
  },
  body: {
    fontFamily: t.fonts.regular,
    fontSize: 14,
    color: t.inkSoft,
    textAlign: 'right',
    lineHeight: 22,
    marginTop: 4,
  },
  reviewBox: {
    backgroundColor: t.brandSoft,
    borderRadius: t.radius.lg,
    padding: t.space.md,
    gap: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  reviewHead: {
    flexDirection: rowRtl,
    alignItems: 'center',
    gap: 6,
  },
  reviewTitle: {
    fontFamily: t.fonts.semiBold,
    fontSize: 13,
    color: t.brandDeep,
    textAlign: 'right',
  },
  reviewBody: {
    fontFamily: t.fonts.regular,
    fontSize: 13,
    color: t.ink,
    textAlign: 'right',
  },
  section: {
    fontFamily: t.fonts.bold,
    fontSize: 15,
    color: t.ink,
    textAlign: 'right',
    marginTop: t.space.sm,
  },
  attach: {
    flexDirection: rowRtl,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: t.line,
    borderRadius: t.radius.lg,
    padding: t.space.md,
    backgroundColor: t.card,
    ...t.shadow.card,
  },
  attachIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
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
    fontFamily: t.fonts.regular,
    fontSize: 12,
    color: t.brand,
    textAlign: 'right',
  },
  hintBox: {
    flexDirection: rowRtl,
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
    borderRadius: t.radius.lg,
    padding: t.space.md,
    gap: 8,
    backgroundColor: t.card,
    ...t.shadow.card,
  },
  qTitle: {
    fontFamily: t.fonts.semiBold,
    fontSize: 14,
    color: t.ink,
    textAlign: 'right',
  },
  qPts: {
    fontFamily: t.fonts.regular,
    color: t.inkMute,
  },
  choice: {
    borderWidth: 1,
    borderColor: t.line,
    borderRadius: t.radius.md,
    padding: t.space.sm,
  },
  choiceOn: {
    borderColor: t.brand,
    backgroundColor: t.brandSoft,
  },
  choiceText: {
    fontFamily: t.fonts.regular,
    fontSize: 13,
    color: t.ink,
    textAlign: 'right',
  },
  choiceTextOn: {
    fontFamily: t.fonts.semiBold,
    color: t.brandDeep,
  },
  written: {
    minHeight: 96,
    borderWidth: 1,
    borderColor: t.line,
    borderRadius: t.radius.lg,
    padding: t.space.md,
    fontFamily: t.fonts.regular,
    fontSize: 14,
    color: t.ink,
    backgroundColor: t.card,
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
  lockedBox: {
    flexDirection: rowRtl,
    alignItems: 'center',
    gap: 10,
    backgroundColor: t.successSoft,
    borderRadius: t.radius.lg,
    padding: t.space.md,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  lockedText: { flex: 1, gap: 2 },
  locked: {
    fontFamily: t.fonts.semiBold,
    fontSize: 14,
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
