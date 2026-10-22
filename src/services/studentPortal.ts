import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  assignments as seedAssignments,
  badges,
  buildDashboard,
  chatMessages as seedMessages,
  chatThreads as seedThreads,
  competitions as seedCompetitions,
  examAttempts as seedAttempts,
  exams,
  lectures,
  leaderboard,
  notifications as seedNotifications,
  pointsLog,
  questions,
  schedule,
  STUDENT_PROFILE,
  subjectAnnouncements,
  subjects,
  teachers,
  termResults,
  studySessionsSeed,
} from '@/data/student/mockData';
import type {
  AiMessage,
  Assignment,
  ChatMessage,
  ChatThread,
  Competition,
  Exam,
  ExamAttempt,
  ExamQuestion,
  Lecture,
  StudentDashboardData,
  StudentNotification,
  StudentSubject,
  StudentTeacher,
  StudySession,
  StudySessionStatus,
} from '@/types/studentPortal';

const PLAN_KEY = 'em_student_study_plan';
const ASSIGN_KEY = 'em_student_assignments';
const CHAT_KEY = 'em_student_chats';
const NOTIF_KEY = 'em_student_notifs';
const COMP_KEY = 'em_student_comps';
const ATTEMPTS_KEY = 'em_student_attempts';

const delay = (ms = 180) => new Promise((r) => setTimeout(r, ms));

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

export function getTeacher(id: string): StudentTeacher | undefined {
  return teachers.find((t) => t.id === id);
}

export function getSubject(id: string): StudentSubject | undefined {
  return subjects.find((s) => s.id === id);
}

export async function getStudentProfile() {
  await delay();
  return STUDENT_PROFILE;
}

export async function getStudentDashboard(): Promise<StudentDashboardData> {
  await delay();
  return buildDashboard();
}

export async function getStudentSubjects() {
  await delay();
  return subjects;
}

export async function getSubjectDetail(id: string) {
  await delay();
  const subject = getSubject(id);
  if (!subject) return null;
  const teacher = getTeacher(subject.teacherId)!;
  return {
    subject,
    teacher,
    lectures: lectures.filter((l) => l.subjectId === id),
    assignments: (await getAssignments()).filter((a) => a.subjectId === id),
    exams: exams.filter((e) => e.subjectId === id),
    announcements: subjectAnnouncements[id] ?? [],
  };
}

export async function getStudentSchedule(day?: number) {
  await delay();
  if (day == null) return schedule;
  return schedule.filter((s) => s.day === day);
}

export async function getLectures(filters?: {
  subjectId?: string;
  status?: string;
  search?: string;
}) {
  await delay();
  let list = [...lectures];
  if (filters?.subjectId) list = list.filter((l) => l.subjectId === filters.subjectId);
  if (filters?.status && filters.status !== 'all') {
    list = list.filter((l) => l.status === filters.status);
  }
  if (filters?.search?.trim()) {
    const q = filters.search.trim().toLowerCase();
    list = list.filter((l) => l.title.toLowerCase().includes(q));
  }
  return list;
}

export async function getLecture(id: string): Promise<Lecture | null> {
  await delay();
  return lectures.find((l) => l.id === id) ?? null;
}

export async function getAssignments(): Promise<Assignment[]> {
  await delay();
  return readJson(ASSIGN_KEY, seedAssignments);
}

export async function getAssignment(id: string) {
  const list = await getAssignments();
  return list.find((a) => a.id === id) ?? null;
}

export async function updateAssignmentStatus(
  id: string,
  status: Assignment['status'],
): Promise<Assignment | null> {
  const list = await getAssignments();
  const next = list.map((a) =>
    a.id === id
      ? {
          ...a,
          status,
          startedAt:
            status === 'in_progress' ? a.startedAt || new Date().toISOString() : a.startedAt,
        }
      : a,
  );
  await writeJson(ASSIGN_KEY, next);
  return next.find((a) => a.id === id) ?? null;
}

export async function getExams(subjectId?: string): Promise<Exam[]> {
  await delay();
  if (!subjectId) return exams;
  return exams.filter((e) => e.subjectId === subjectId);
}

export async function getExam(id: string) {
  await delay();
  const exam = exams.find((e) => e.id === id);
  if (!exam) return null;
  const qs = exam.questionIds
    .map((qid) => questions.find((q) => q.id === qid))
    .filter(Boolean) as ExamQuestion[];
  return { exam, questions: qs };
}

export async function getExamAttempts(): Promise<ExamAttempt[]> {
  await delay();
  return readJson(ATTEMPTS_KEY, seedAttempts);
}

export async function saveExamAttempt(attempt: ExamAttempt) {
  const list = await getExamAttempts();
  const next = [attempt, ...list];
  await writeJson(ATTEMPTS_KEY, next);
  return attempt;
}

export function gradeExam(
  examQuestions: ExamQuestion[],
  answers: Record<string, number>,
): { score: number; maxScore: number; percent: number } {
  let score = 0;
  for (const q of examQuestions) {
    if (answers[q.id] === q.correctIndex) score += 1;
  }
  const maxScore = examQuestions.length;
  const percent = maxScore ? Math.round((score / maxScore) * 100) : 0;
  return { score, maxScore, percent };
}

export async function getStudentResults() {
  await delay();
  return {
    attempts: await getExamAttempts(),
    term: termResults,
    subjects,
  };
}

export async function getStudentNotifications(): Promise<StudentNotification[]> {
  await delay();
  return readJson(NOTIF_KEY, seedNotifications);
}

export async function markNotificationRead(id: string) {
  const list = await getStudentNotifications();
  const next = list.map((n) => (n.id === id ? { ...n, read: true } : n));
  await writeJson(NOTIF_KEY, next);
  return next;
}

export async function markAllNotificationsRead() {
  const list = await getStudentNotifications();
  const next = list.map((n) => ({ ...n, read: true }));
  await writeJson(NOTIF_KEY, next);
  return next;
}

export async function getConversations(): Promise<ChatThread[]> {
  await delay();
  const data = await readJson<{ threads: ChatThread[]; messages: ChatMessage[] }>(CHAT_KEY, {
    threads: seedThreads,
    messages: seedMessages,
  });
  return data.threads;
}

export async function getConversationMessages(threadId: string) {
  await delay();
  const data = await readJson<{ threads: ChatThread[]; messages: ChatMessage[] }>(CHAT_KEY, {
    threads: seedThreads,
    messages: seedMessages,
  });
  return data.messages
    .filter((m) => m.threadId === threadId)
    .sort((a, b) => a.at.localeCompare(b.at));
}

export async function sendChatMessage(threadId: string, text: string) {
  const data = await readJson<{ threads: ChatThread[]; messages: ChatMessage[] }>(CHAT_KEY, {
    threads: seedThreads,
    messages: seedMessages,
  });
  const msg: ChatMessage = {
    id: `m-${Date.now()}`,
    threadId,
    from: 'student',
    text: text.trim(),
    at: new Date().toISOString(),
    read: true,
  };
  const messages = [...data.messages, msg];
  const threads = data.threads.map((t) =>
    t.id === threadId
      ? { ...t, lastMessage: msg.text, lastAt: msg.at, unread: 0 }
      : t,
  );
  await writeJson(CHAT_KEY, { threads, messages });

  // Simulated teacher reply (local mock)
  setTimeout(async () => {
    const latest = await readJson<{ threads: ChatThread[]; messages: ChatMessage[] }>(CHAT_KEY, {
      threads,
      messages,
    });
    const reply: ChatMessage = {
      id: `m-${Date.now()}-r`,
      threadId,
      from: 'teacher',
      text: 'وصلتني رسالتك. سأرد عليك بالتفصيل بعد مراجعة الدرس. (رد تجريبي)',
      at: new Date().toISOString(),
      read: false,
    };
    const nextMessages = [...latest.messages, reply];
    const nextThreads = latest.threads.map((t) =>
      t.id === threadId
        ? {
            ...t,
            lastMessage: reply.text,
            lastAt: reply.at,
            unread: t.unread + 1,
          }
        : t,
    );
    await writeJson(CHAT_KEY, { threads: nextThreads, messages: nextMessages });
  }, 1200);

  return msg;
}

export async function ensureThreadForTeacher(teacherId: string): Promise<ChatThread> {
  const data = await readJson<{ threads: ChatThread[]; messages: ChatMessage[] }>(CHAT_KEY, {
    threads: seedThreads,
    messages: seedMessages,
  });
  const existing = data.threads.find((t) => t.teacherId === teacherId);
  if (existing) return existing;
  const thread: ChatThread = {
    id: `c-${teacherId}`,
    teacherId,
    lastMessage: 'ابدأ المحادثة مع المدرس',
    lastAt: new Date().toISOString(),
    unread: 0,
  };
  await writeJson(CHAT_KEY, {
    threads: [thread, ...data.threads],
    messages: data.messages,
  });
  return thread;
}

export async function getStudyPlan(): Promise<StudySession[]> {
  await delay();
  return readJson(PLAN_KEY, studySessionsSeed);
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

export async function setStudySessionStatus(id: string, status: StudySessionStatus) {
  const list = await getStudyPlan();
  const next = list.map((s) => (s.id === id ? { ...s, status } : s));
  return saveStudyPlan(next);
}

export async function getCompetitions(): Promise<Competition[]> {
  await delay();
  return readJson(COMP_KEY, seedCompetitions);
}

export async function joinCompetition(id: string) {
  const list = await getCompetitions();
  const next = list.map((c) =>
    c.id === id && c.status === 'open'
      ? { ...c, status: 'joined' as const, participants: c.participants + 1 }
      : c,
  );
  await writeJson(COMP_KEY, next);
  return next.find((c) => c.id === id) ?? null;
}

export async function getGamification() {
  await delay();
  return {
    points: pointsLog.reduce((s, p) => s + p.points, 0) + 740,
    pointsLog,
    badges,
    leaderboard,
    competitions: await getCompetitions(),
  };
}

/** Mock AI — deterministic local replies, not a real model */
export async function sendAiMessage(
  text: string,
  history: AiMessage[],
  subjectId?: string | null,
): Promise<AiMessage> {
  await delay(600);
  const subject = subjectId ? getSubject(subjectId) : null;
  const lower = text.toLowerCase();
  let reply =
    'هذه إجابة تجريبية من مساعد المذاكرة. اشرح سؤالك بمزيد من التفصيل أو اختر مادة لأركز عليها.';

  if (/معادل|تربيعي|رياضيات|س²|س2/.test(lower) || subject?.id === 's1') {
    reply =
      'للمعادلات التربيعية: رتّب الحدود على الصورة أس² + بس + ج = 0، ثم احسب المميز Δ = ب² − 4أج. إذا كان Δ موجباً فهناك حلّان حقيقيان. (رد تجريبي محلي)';
  } else if (/نيوتن|قوة|فيزياء|تسارع/.test(lower) || subject?.id === 's2') {
    reply =
      'قانون نيوتن الثاني: ق = ك × ت. تأكد من توحيد الوحدات (كجم، م/ث²، نيوتن). (رد تجريبي محلي)';
  } else if (/نحو|شرط|عربي/.test(lower) || subject?.id === 's3') {
    reply =
      'أسلوب الشرط يربط جملة الشرط بجملة الجواب بأدوات مثل إنْ وإذا. راجع أمثلة الكتاب في باب النحو. (رد تجريبي محلي)';
  } else if (/english|grammar|tense|perfect/.test(lower) || subject?.id === 's4') {
    reply =
      'Use Past Simple for finished time (yesterday). Use Present Perfect for experience without a finished time marker. (Mock reply)';
  } else if (/ذاكر|جدول|خط[ةه]/.test(lower)) {
    reply =
      'اقترح جلسة مركّزة 45 دقيقة: 10 مراجعة، 25 حل تمارين، 10 تلخيص. يمكنك إنشاءها من جدول المذاكرة. (رد تجريبي)';
  } else if (history.length === 0) {
    reply = subject
      ? `جاهز لمساعدتك في مادة ${subject.name}. اسأل عن مفهوم أو تمرين. (مساعد تجريبي)`
      : 'مرحباً! أنا مساعد المذاكرة التجريبي. اختر مادة أو اسأل سؤالك مباشرة.';
  }

  return {
    id: `ai-${Date.now()}`,
    role: 'assistant',
    text: reply,
    at: new Date().toISOString(),
    subjectId: subjectId ?? null,
  };
}

export const AI_SUGGESTIONS = [
  'كيف أحل معادلة تربيعية؟',
  'اشرح قانون نيوتن الثاني',
  'ساعدني أعمل جدول مذاكرة ليومين',
  'ما الفرق بين Present Perfect و Past Simple؟',
];

export { teachers, subjects, lectures, exams, questions };
