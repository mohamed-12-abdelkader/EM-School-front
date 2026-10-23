import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  fetchStudentDashboard,
  fetchStudentExam,
  fetchStudentExamResult,
  fetchStudentExams,
  fetchStudentLesson,
  fetchStudentLessons,
  fetchStudentNotifications,
  fetchStudentResults,
  fetchStudentSubjects,
  fetchStudentTask,
  fetchStudentTasks,
  fetchStudentTimetable,
  fetchSubjectDetail,
  markAllStudentNotificationsRead,
  markStudentNotificationRead,
  submitStudentExam,
  submitStudentTask,
  submitStudentTaskPdf,
} from '@/api/studentPortal';
import type {
  AiMessage,
  Assignment,
  AssignmentStatus,
  BadgeItem,
  ChatMessage,
  ChatThread,
  Competition,
  Exam,
  ExamAttempt,
  ExamQuestion,
  Lecture,
  NotificationKind,
  PointsEntry,
  ScheduleSlot,
  StudentDashboardData,
  StudentNotification,
  StudentSubject,
  StudentTeacher,
  StudySession,
  StudySessionStatus,
} from '@/types/studentPortal';
import { displayTitle } from '@/utils/displayTitle';
import { loadSession } from '@/auth/storage';

/** Local-only personal data (planner / optional chat drafts) — never seeded with mock content. */
const PLAN_KEY = 'em_student_study_plan';
const CHAT_KEY = 'em_student_chats';

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson<T>(key: string, value: T) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

/** In-memory caches filled from API (for getSubject / getTeacher helpers). */
let subjectsCache: StudentSubject[] = [];
let teachersCache: StudentTeacher[] = [];

function rememberSubjects(list: StudentSubject[]) {
  subjectsCache = list;
  const teachers = new Map<string, StudentTeacher>();
  for (const s of list) {
    if (!s.teacherId) continue;
    const existing = teachers.get(s.teacherId);
    if (existing) {
      if (!existing.subjectIds.includes(s.id)) existing.subjectIds.push(s.id);
    } else {
      teachers.set(s.teacherId, {
        id: s.teacherId,
        name: (s as StudentSubject & { teacherName?: string }).teacherName || 'مدرس',
        subjectIds: [s.id],
        avatarColor: s.color,
      });
    }
  }
  teachersCache = Array.from(teachers.values());
}

export function getTeacher(id: string): StudentTeacher | undefined {
  return teachersCache.find((t) => t.id === id);
}

export function getSubject(id: string): StudentSubject | undefined {
  return subjectsCache.find((s) => s.id === id);
}

export async function getStudentProfile() {
  const session = await loadSession();
  const user = session?.user;
  const meta = session?.studentMeta;
  return {
    id: user?.id != null ? String(user.id) : '',
    name: user?.name || 'طالب',
    loginCode: user?.login_code || '',
    gradeName: meta?.profile.grade_name || '',
    classroomName: meta?.profile.classroom_name || '',
    academicYear: meta?.profile.academic_year || '',
    schoolName: meta?.school.name || '',
  };
}

function asAssignment(raw: Record<string, unknown>): Assignment {
  return {
    id: String(raw.id),
    subjectId: String(raw.subjectId),
    subjectName: raw.subjectName ? String(raw.subjectName) : undefined,
    teacherId: String(raw.teacherId || ''),
    teacherName: raw.teacherName ? String(raw.teacherName) : undefined,
    title: displayTitle(String(raw.title || ''), 'واجب دراسي'),
    dueAt: raw.dueAt ? String(raw.dueAt) : '',
    status: (raw.status as AssignmentStatus) || 'new',
    tasksCount: Number(raw.tasksCount || 0),
    attachmentsCount:
      raw.attachmentsCount != null ? Number(raw.attachmentsCount) : undefined,
    score: raw.score != null ? Number(raw.score) : null,
    maxScore: raw.maxScore != null ? Number(raw.maxScore) : null,
    description: raw.description ? String(raw.description) : '',
    review: raw.review != null ? String(raw.review) : null,
  };
}

function asLecture(raw: Record<string, unknown>): Lecture {
  return {
    id: String(raw.id),
    subjectId: String(raw.subjectId),
    teacherId: String(raw.teacherId || ''),
    title: displayTitle(String(raw.title || ''), 'درس'),
    durationMin: Number(raw.durationMin || 0),
    date: String(raw.date || raw.created_at || new Date().toISOString()),
    type: (raw.type as Lecture['type']) || 'recorded',
    status: (raw.status as Lecture['status']) || 'recorded',
    watchProgress: Number(raw.watchProgress || 0),
    summary: raw.summary ? String(raw.summary) : raw.description ? String(raw.description) : '',
    completed: !!raw.completed,
  };
}

function asExam(raw: Record<string, unknown>): Exam {
  const duration = Number(raw.durationMin);
  return {
    id: String(raw.id),
    subjectId: String(raw.subjectId),
    subjectName: raw.subjectName ? String(raw.subjectName) : undefined,
    teacherName: raw.teacherName ? String(raw.teacherName) : undefined,
    title: displayTitle(String(raw.title || ''), 'امتحان'),
    description: raw.description ? String(raw.description) : undefined,
    durationMin: Number.isFinite(duration) && duration > 0 ? duration : 30,
    questionIds: Array.isArray(raw.questionIds)
      ? (raw.questionIds as string[])
      : [],
    difficulty: (raw.difficulty as Exam['difficulty']) || 'medium',
    unit: raw.unit ? String(raw.unit) : undefined,
    isOfficial: raw.isOfficial !== false,
    date: raw.date ? String(raw.date) : undefined,
    attempted: !!raw.attempted,
    score: raw.score != null ? Number(raw.score) : null,
    maxScore: raw.maxScore != null ? Number(raw.maxScore) : null,
    totalPoints: raw.totalPoints != null ? Number(raw.totalPoints) : null,
    status: raw.status ? String(raw.status) : undefined,
  };
}

function asSubject(raw: Record<string, unknown>): StudentSubject & { teacherName?: string } {
  return {
    id: String(raw.id),
    name: String(raw.name),
    icon: String(raw.icon || 'BookOpen'),
    color: String(raw.color || '#4F46E5'),
    teacherId: String(raw.teacherId || ''),
    teacherName: raw.teacherName ? String(raw.teacherName) : '',
    progress: Number(raw.progress || 0),
    lecturesCount: Number(raw.lecturesCount || 0),
    assignmentsCount: Number(raw.assignmentsCount || 0),
    lastExamScore: raw.lastExamScore != null ? Number(raw.lastExamScore) : null,
    lastExamMax: raw.lastExamMax != null ? Number(raw.lastExamMax) : null,
    description: raw.description ? String(raw.description) : '',
  };
}

function slotStatus(
  day: number,
  start: string,
  end: string,
): ScheduleSlot['status'] {
  const now = new Date();
  const today = now.getDay(); // 0=Sunday
  if (day < today) return 'completed';
  if (day > today) return 'upcoming';
  const mins = now.getHours() * 60 + now.getMinutes();
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const startM = (sh || 0) * 60 + (sm || 0);
  const endM = (eh || 0) * 60 + (em || 0);
  if (mins < startM) return 'upcoming';
  if (mins >= endM) return 'completed';
  return 'live';
}

function mapDashboardSlot(raw: Record<string, unknown>): ScheduleSlot {
  const day = Number(raw.day);
  const start = String(raw.start || '');
  const end = String(raw.end || '');
  return {
    id: String(raw.id),
    day,
    subjectId: String(raw.subjectId || ''),
    subjectName: raw.subjectName ? String(raw.subjectName) : undefined,
    teacherId: String(raw.teacherId || ''),
    teacherName: raw.teacherName ? String(raw.teacherName) : undefined,
    start,
    end,
    type: 'onsite',
    status: slotStatus(day, start, end),
    room: raw.room ? String(raw.room) : undefined,
    periodNumber:
      raw.periodNumber != null ? Number(raw.periodNumber) : undefined,
    slotType: (raw.slotType as ScheduleSlot['slotType']) || 'lesson',
    color: raw.color ? String(raw.color) : undefined,
  };
}

export async function getStudentDashboard(): Promise<StudentDashboardData> {
  const data = (await fetchStudentDashboard()) as {
    stats: {
      subjects_count: number;
      pending_tasks: number;
      pending_exams: number;
      unread_notifications: number;
      avg_exam_percent: number;
      exam_attempts: number;
    };
    subjects: Array<Record<string, unknown>>;
    recent_lessons: Array<Record<string, unknown>>;
    upcoming_tasks: Array<Record<string, unknown>>;
    exams: Array<Record<string, unknown>>;
    today_slots?: Array<Record<string, unknown>>;
  };

  rememberSubjects(data.subjects.map(asSubject));

  const dueAssignments = data.upcoming_tasks.map((t) =>
    asAssignment({
      ...t,
      teacherId: t.teacherId || '',
      tasksCount: 0,
      description: '',
    }),
  );

  const upcomingLecturesList = data.recent_lessons.map((l) =>
    asLecture({
      ...l,
      teacherId: '',
      type: 'recorded',
      status: 'recorded',
      durationMin: 0,
      watchProgress: 0,
      completed: false,
      summary: '',
    }),
  );

  const openExams = data.exams
    .filter((e) => !e.attempted)
    .map((e) => asExam(e));

  const recentResults: ExamAttempt[] = data.exams
    .filter((e) => e.attempted)
    .map((e) => ({
      id: `att-${e.id}`,
      examId: String(e.id),
      score: Number(e.score || 0),
      maxScore: Number(e.maxScore || 0),
      percent:
        e.maxScore && Number(e.maxScore) > 0
          ? Math.round((Number(e.score || 0) / Number(e.maxScore)) * 100)
          : 0,
      finishedAt: String(e.date || new Date().toISOString()),
      answers: {},
    }));

  const todaySlots = (data.today_slots || []).map(mapDashboardSlot);
  // Activity density for the week from real pending items (no fake chart data).
  const weekProgress = Array.from({ length: 7 }, (_, i) => {
    const day = new Date().getDay();
    if (i === day) {
      return Math.min(
        100,
        (data.stats.pending_tasks + data.stats.pending_exams) * 15 +
          todaySlots.length * 10,
      );
    }
    return 0;
  });

  return {
    points: data.stats.avg_exam_percent,
    subjectsCount: data.stats.subjects_count,
    pendingAssignments: data.stats.pending_tasks,
    pendingExams: data.stats.pending_exams,
    upcomingLectures: data.recent_lessons.length,
    completionRate: data.stats.avg_exam_percent,
    weekProgress,
    todaySlots,
    upcomingLecturesList,
    dueAssignments,
    openExams,
    recentResults,
    competitions: [],
  };
}

export async function getStudentSubjects() {
  const res = await fetchStudentSubjects();
  const list = (res.subjects as Array<Record<string, unknown>>).map(asSubject);
  rememberSubjects(list);
  return list;
}

export async function getSubjectDetail(id: string) {
  const data = await fetchSubjectDetail(id);
  const subject = asSubject(data.subject as Record<string, unknown>);
  const teacher = data.teacher
    ? ({
        id: String((data.teacher as { id: string }).id),
        name: String((data.teacher as { name: string }).name),
        subjectIds: [id],
        avatarColor: subject.color,
      } as StudentTeacher)
    : null;

  if (teacher) {
    teachersCache = [
      teacher,
      ...teachersCache.filter((t) => t.id !== teacher.id),
    ];
  }
  subjectsCache = [subject, ...subjectsCache.filter((s) => s.id !== subject.id)];

  return {
    subject,
    teacher,
    lectures: (data.lectures as Array<Record<string, unknown>>).map(asLecture),
    assignments: (data.assignments as Array<Record<string, unknown>>).map(
      asAssignment,
    ),
    exams: (data.exams as Array<Record<string, unknown>>).map(asExam),
    announcements: data.announcements || [],
  };
}

export async function getStudentSchedule(day?: number): Promise<{
  slots: ScheduleSlot[];
  classroomName: string | null;
  gradeName: string | null;
  academicYear: string | null;
}> {
  try {
    const data = await fetchStudentTimetable(day);
    return {
      classroomName: data.classroomName,
      gradeName: data.gradeName,
      academicYear: data.academicYear,
      slots: data.slots.map((s) => {
        const type: ScheduleSlot['type'] =
          s.slotType === 'break'
            ? 'onsite'
            : s.slotType === 'activity'
              ? 'live'
              : 'onsite';
        return {
          id: s.id,
          day: s.day,
          subjectId: s.subjectId,
          subjectName: s.subjectName ?? undefined,
          teacherId: s.teacherId,
          teacherName: s.teacherName ?? undefined,
          start: s.start,
          end: s.end,
          type,
          status: slotStatus(s.day, s.start, s.end),
          room: s.room ?? undefined,
          periodNumber: s.periodNumber,
          slotType: s.slotType,
          color: s.color,
        };
      }),
    };
  } catch {
    return {
      classroomName: null,
      gradeName: null,
      academicYear: null,
      slots: [],
    };
  }
}

export async function getLectures(filters?: {
  subjectId?: string;
  status?: string;
  search?: string;
}) {
  const res = await fetchStudentLessons(filters?.subjectId);
  let list = (res.lessons as Array<Record<string, unknown>>).map(asLecture);
  if (filters?.search?.trim()) {
    const q = filters.search.trim().toLowerCase();
    list = list.filter((l) => l.title.toLowerCase().includes(q));
  }
  return list;
}

export type LessonAttachment = {
  id: string;
  kind: 'video' | 'pdf';
  title: string;
  fileUrl: string;
  filename?: string | null;
};

export async function getLecture(
  id: string,
): Promise<
  (Lecture & {
    attachments?: LessonAttachment[];
    subjectName?: string;
    teacherName?: string;
  }) | null
> {
  try {
    const data = await fetchStudentLesson(id);
    const raw = data.lesson as Record<string, unknown>;
    return {
      ...asLecture(raw),
      subjectName: raw.subjectName ? String(raw.subjectName) : undefined,
      teacherName: raw.teacherName ? String(raw.teacherName) : undefined,
      summary: displayTitle(
        String(raw.summary || raw.description || ''),
        '',
      ),
      attachments: (data.attachments || []).map((a) => ({
        id: String(a.id),
        kind: a.kind === 'pdf' ? 'pdf' : 'video',
        title: displayTitle(a.title, a.kind === 'pdf' ? 'ملف PDF' : 'مرفق'),
        fileUrl: String(a.fileUrl || ''),
        filename: a.filename ?? null,
      })),
    };
  } catch {
    return null;
  }
}

export async function getAssignments(): Promise<Assignment[]> {
  const res = await fetchStudentTasks();
  return (res.tasks as Array<Record<string, unknown>>).map(asAssignment);
}

export type TaskDetail = {
  task: Assignment & {
    review?: string | null;
    submittedAt?: string | null;
    submissionNote?: string | null;
    submissionMode?: 'questions' | 'pdf';
    submissionFileUrl?: string | null;
    submissionFilename?: string | null;
    subjectName?: string;
    teacherName?: string;
  };
  attachments: LessonAttachment[];
  questions: Array<{
    id: string;
    type: 'mcq' | 'written';
    text: string;
    points: number;
    choices: Array<{ id: string; text: string; isCorrect?: boolean }>;
    modelAnswer?: string | null;
    yourChoiceId?: string | null;
    yourWritten?: string | null;
    isCorrect?: boolean | null;
    pointsAwarded?: number;
  }>;
};

export async function getAssignment(id: string): Promise<Assignment | null> {
  try {
    const data = await fetchStudentTask(id);
    return asAssignment(data.task);
  } catch {
    return null;
  }
}

export async function getTaskDetail(id: string): Promise<TaskDetail | null> {
  try {
    const data = await fetchStudentTask(id);
    const t = data.task;
    return {
      task: {
        ...asAssignment(t),
        review: t.review != null ? String(t.review) : null,
        submittedAt: t.submittedAt != null ? String(t.submittedAt) : null,
        submissionNote:
          t.submissionNote != null ? String(t.submissionNote) : null,
        submissionMode:
          t.submissionMode === 'pdf' || t.submissionMode === 'questions'
            ? t.submissionMode
            : 'questions',
        submissionFileUrl:
          t.submissionFileUrl != null ? String(t.submissionFileUrl) : null,
        submissionFilename:
          t.submissionFilename != null ? String(t.submissionFilename) : null,
        subjectName: t.subjectName != null ? String(t.subjectName) : undefined,
        teacherName: t.teacherName != null ? String(t.teacherName) : undefined,
      },
      attachments: data.attachments as LessonAttachment[],
      questions: data.questions,
    };
  } catch {
    return null;
  }
}

export async function submitTask(
  id: string,
  payload: {
    submission_note?: string | null;
    answers: Array<{
      question_id: number;
      choice_id?: number | null;
      written_answer?: string | null;
    }>;
  },
) {
  return submitStudentTask(id, payload);
}

export async function submitTaskPdf(
  id: string,
  payload: { submission_note?: string | null; file: File },
) {
  return submitStudentTaskPdf(id, payload);
}

/** @deprecated Use submitTask — kept for older screens */
export async function updateAssignmentStatus(
  id: string,
  _status: Assignment['status'],
): Promise<Assignment | null> {
  return getAssignment(id);
}

export async function getExams(subjectId?: string): Promise<Exam[]> {
  const res = await fetchStudentExams(subjectId);
  return (res.exams as Array<Record<string, unknown>>).map(asExam);
}

export async function getExam(id: string) {
  try {
    const data = await fetchStudentExam(id);
    const exam = asExam(data.exam);
    const questions: ExamQuestion[] = data.questions.map((q) => ({
      id: q.id,
      text: q.text,
      choices: q.choices,
      choiceIds: q.choiceIds,
      type: q.type || 'mcq',
      points: q.points,
      correctIndex: q.correctIndex ?? -1,
      explanation: q.explanation,
      difficulty: q.difficulty || 'medium',
    }));
    return { exam, questions };
  } catch {
    return null;
  }
}

export async function getExamResult(id: string) {
  return fetchStudentExamResult(id);
}

export async function getExamAttempts(): Promise<ExamAttempt[]> {
  const res = await fetchStudentResults();
  return res.examAttempts.map((a) => ({
    id: a.id,
    examId: a.examId,
    score: a.score,
    maxScore: a.maxScore,
    percent: a.percent,
    finishedAt: a.finishedAt,
    answers: {},
  }));
}

export async function saveExamAttempt(_attempt: ExamAttempt) {
  // Persisted via submitExam on the server
  return _attempt;
}

export async function submitExam(
  examId: string,
  answersByQuestionIndex: Record<string, number>,
  questions: ExamQuestion[],
  writtenByQuestion?: Record<string, string>,
) {
  const payload = questions.map((q) => {
    if (q.type === 'written') {
      return {
        question_id: Number(q.id),
        choice_id: null,
        written_answer: writtenByQuestion?.[q.id]?.trim() || null,
      };
    }
    const idx = answersByQuestionIndex[q.id];
    const choiceId =
      idx != null && q.choiceIds?.[idx] != null
        ? Number(q.choiceIds[idx])
        : null;
    return {
      question_id: Number(q.id),
      choice_id: choiceId,
      written_answer: null,
    };
  });
  return submitStudentExam(examId, payload);
}

export function gradeExam(
  examQuestions: ExamQuestion[],
  answers: Record<string, number>,
): { score: number; maxScore: number; percent: number } {
  let score = 0;
  let maxScore = 0;
  for (const q of examQuestions) {
    const pts = q.points ?? 1;
    maxScore += pts;
    if (q.correctIndex >= 0 && answers[q.id] === q.correctIndex) score += pts;
  }
  const percent = maxScore ? Math.round((score / maxScore) * 100) : 0;
  return { score, maxScore, percent };
}

export async function getStudentResults() {
  const res = await fetchStudentResults();
  const subjects = await getStudentSubjects();
  return {
    attempts: res.examAttempts.map((a) => ({
      id: a.id,
      examId: a.examId,
      examTitle: a.examTitle,
      subjectId: a.subjectId,
      subjectName: a.subjectName,
      score: a.score,
      maxScore: a.maxScore,
      percent: a.percent,
      finishedAt: a.finishedAt,
      answers: {},
    })),
    taskGrades: res.taskGrades,
    term: [],
    subjects,
  };
}

function mapNotifKind(kind: string): NotificationKind {
  if (kind === 'lesson') return 'lecture';
  if (kind === 'task') return 'assignment';
  if (kind === 'grade') return 'result';
  if (kind === 'exam') return 'exam';
  if (kind === 'announcement') return 'announcement';
  return 'announcement';
}

export async function getStudentNotifications(): Promise<StudentNotification[]> {
  const res = await fetchStudentNotifications();
  return res.notifications.map((n) => ({
    id: n.id,
    kind: mapNotifKind(n.kind),
    title: n.title,
    body: n.body,
    at: n.at,
    read: n.read,
    href: n.href || undefined,
  }));
}

export async function markNotificationRead(id: string) {
  await markStudentNotificationRead(id);
  return getStudentNotifications();
}

export async function markAllNotificationsRead() {
  await markAllStudentNotificationsRead();
  return getStudentNotifications();
}

type ChatStore = { threads: ChatThread[]; messages: ChatMessage[] };
const emptyChat: ChatStore = { threads: [], messages: [] };

/** Threads the student started from real teachers (local draft until chat API exists). */
export async function getConversations(): Promise<ChatThread[]> {
  const subjects = await getStudentSubjects();
  const store = await readJson<ChatStore>(CHAT_KEY, emptyChat);
  const byTeacher = new Map<string, ChatThread>();
  for (const t of store.threads) byTeacher.set(t.teacherId, t);

  const threads: ChatThread[] = [];
  const seen = new Set<string>();
  for (const s of subjects) {
    if (!s.teacherId || seen.has(s.teacherId)) continue;
    seen.add(s.teacherId);
    const existing = byTeacher.get(s.teacherId);
    threads.push(
      existing || {
        id: `c-${s.teacherId}`,
        teacherId: s.teacherId,
        lastMessage: 'لا رسائل بعد — ابدأ المحادثة',
        lastAt: new Date().toISOString(),
        unread: 0,
      },
    );
  }
  return threads.sort((a, b) => b.lastAt.localeCompare(a.lastAt));
}

export async function getConversationMessages(threadId: string) {
  const data = await readJson<ChatStore>(CHAT_KEY, emptyChat);
  return data.messages
    .filter((m) => m.threadId === threadId)
    .sort((a, b) => a.at.localeCompare(b.at));
}

export async function sendChatMessage(threadId: string, text: string) {
  const data = await readJson<ChatStore>(CHAT_KEY, emptyChat);
  const msg: ChatMessage = {
    id: `m-${Date.now()}`,
    threadId,
    from: 'student',
    text: text.trim(),
    at: new Date().toISOString(),
    read: true,
  };
  let threads = data.threads;
  if (!threads.some((t) => t.id === threadId)) {
    const teacherId = threadId.replace(/^c-/, '');
    threads = [
      {
        id: threadId,
        teacherId,
        lastMessage: msg.text,
        lastAt: msg.at,
        unread: 0,
      },
      ...threads,
    ];
  } else {
    threads = threads.map((t) =>
      t.id === threadId
        ? { ...t, lastMessage: msg.text, lastAt: msg.at, unread: 0 }
        : t,
    );
  }
  await writeJson(CHAT_KEY, {
    threads,
    messages: [...data.messages, msg],
  });
  return msg;
}

export async function ensureThreadForTeacher(
  teacherId: string,
): Promise<ChatThread> {
  const data = await readJson<ChatStore>(CHAT_KEY, emptyChat);
  const existing = data.threads.find((t) => t.teacherId === teacherId);
  if (existing) return existing;
  const thread: ChatThread = {
    id: `c-${teacherId}`,
    teacherId,
    lastMessage: 'لا رسائل بعد — ابدأ المحادثة',
    lastAt: new Date().toISOString(),
    unread: 0,
  };
  await writeJson(CHAT_KEY, {
    threads: [thread, ...data.threads],
    messages: data.messages,
  });
  return thread;
}

/** Personal study planner — empty by default (student-created only). */
export async function getStudyPlan(): Promise<StudySession[]> {
  return readJson(PLAN_KEY, []);
}

export async function saveStudyPlan(sessions: StudySession[]) {
  await writeJson(PLAN_KEY, sessions);
  return sessions;
}

export async function upsertStudySession(session: StudySession) {
  const list = await getStudyPlan();
  const idx = list.findIndex((s) => s.id === session.id);
  const next =
    idx >= 0
      ? list.map((s) => (s.id === session.id ? session : s))
      : [session, ...list];
  return saveStudyPlan(next);
}

export async function deleteStudySession(id: string) {
  const list = await getStudyPlan();
  return saveStudyPlan(list.filter((s) => s.id !== id));
}

export async function setStudySessionStatus(
  id: string,
  status: StudySessionStatus,
) {
  const list = await getStudyPlan();
  const next = list.map((s) => (s.id === id ? { ...s, status } : s));
  return saveStudyPlan(next);
}

/** Competitions are not wired to the school API yet. */
export async function getCompetitions(): Promise<Competition[]> {
  return [];
}

export async function joinCompetition(_id: string) {
  return null;
}

/** Points derived from real exam/task grades — no seeded badges/leaderboard. */
export async function getGamification() {
  const res = await fetchStudentResults();
  const pointsLog: PointsEntry[] = [
    ...res.examAttempts.map((a) => ({
      id: `exam-${a.id}`,
      title: `امتحان: ${a.examTitle}`,
      points: a.percent,
      at: a.finishedAt,
    })),
    ...res.taskGrades.map((g) => ({
      id: `task-${g.id}`,
      title: `واجب: ${g.taskTitle}`,
      points:
        g.maxScore > 0 ? Math.round((g.score / g.maxScore) * 100) : g.score,
      at: g.gradedAt || new Date().toISOString(),
    })),
  ].sort((a, b) => b.at.localeCompare(a.at));

  const points =
    pointsLog.length > 0
      ? Math.round(
          pointsLog.reduce((s, p) => s + p.points, 0) / pointsLog.length,
        )
      : 0;

  const badges: BadgeItem[] = [];
  if (res.examAttempts.length >= 1) {
    badges.push({
      id: 'first-exam',
      title: 'أول امتحان',
      description: 'أتممت امتحاناً منشوراً من المدرس',
      earned: true,
      icon: 'ClipboardCheck',
    });
  }
  if (res.taskGrades.length >= 1) {
    badges.push({
      id: 'first-task',
      title: 'أول واجب مصحح',
      description: 'حصلت على درجة واجب من المدرس',
      earned: true,
      icon: 'FileText',
    });
  }

  const session = await loadSession();
  const meName = session?.user?.name || 'أنت';

  return {
    points,
    pointsLog,
    badges,
    leaderboard: points > 0
      ? [{ rank: 1, name: meName, points, isMe: true }]
      : [],
    competitions: [] as Competition[],
  };
}

/** AI assistant is not connected to a model yet. */
export async function sendAiMessage(
  _text: string,
  _history: AiMessage[],
  subjectId?: string | null,
): Promise<AiMessage> {
  return {
    id: `ai-${Date.now()}`,
    role: 'assistant',
    text: 'مساعد الذكاء الاصطناعي غير مفعّل حالياً. استخدم الدروس والواجبات والامتحانات المنشورة من مدرسيك للمذاكرة.',
    at: new Date().toISOString(),
    subjectId: subjectId ?? null,
  };
}

export const AI_SUGGESTIONS = [
  'أين أجد واجباتي؟',
  'كيف أبدأ امتحاناً؟',
  'أين تظهر نتائجي؟',
];

export { teachersCache as teachers, subjectsCache as subjects };
