export type LectureStatus = 'upcoming' | 'live' | 'completed' | 'recorded';
export type LectureType = 'live' | 'recorded' | 'onsite';
export type AssignmentStatus = 'new' | 'in_progress' | 'submitted' | 'graded' | 'overdue';
export type StudySessionStatus = 'planned' | 'in_progress' | 'done';
export type StudyPriority = 'low' | 'medium' | 'high';
export type CompetitionStatus = 'open' | 'joined' | 'ended';
export type NotificationKind =
  | 'assignment'
  | 'lecture'
  | 'exam'
  | 'message'
  | 'competition'
  | 'announcement'
  | 'result';

export interface StudentTeacher {
  id: string;
  name: string;
  subjectIds: string[];
  avatarColor: string;
  title?: string;
}

export interface StudentSubject {
  id: string;
  name: string;
  icon: string;
  color: string;
  teacherId: string;
  progress: number;
  lecturesCount: number;
  assignmentsCount: number;
  lastExamScore?: number | null;
  lastExamMax?: number | null;
  description?: string;
}

export interface ScheduleSlot {
  id: string;
  day: number; // 0=Sunday ... 6=Saturday
  subjectId: string;
  teacherId: string;
  start: string; // HH:mm
  end: string;
  type: LectureType;
  status: LectureStatus;
  lectureId?: string;
  room?: string;
}

export interface Lecture {
  id: string;
  subjectId: string;
  teacherId: string;
  title: string;
  durationMin: number;
  date: string;
  type: LectureType;
  status: LectureStatus;
  watchProgress: number;
  summary?: string;
  completed: boolean;
}

export interface Assignment {
  id: string;
  subjectId: string;
  teacherId: string;
  title: string;
  dueAt: string;
  status: AssignmentStatus;
  tasksCount: number;
  score?: number | null;
  maxScore?: number | null;
  description?: string;
  startedAt?: string | null;
}

export interface ExamQuestion {
  id: string;
  text: string;
  choices: string[];
  correctIndex: number;
  explanation?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  unit?: string;
}

export interface Exam {
  id: string;
  subjectId: string;
  title: string;
  durationMin: number;
  questionIds: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  unit?: string;
  isOfficial?: boolean;
  date?: string;
}

export interface ExamAttempt {
  id: string;
  examId: string;
  score: number;
  maxScore: number;
  percent: number;
  finishedAt: string;
  answers: Record<string, number>;
}

export interface TermResult {
  subjectId: string;
  midterm?: number | null;
  final?: number | null;
  total?: number | null;
  maxTotal: number;
  status: 'available' | 'pending';
}

export interface ChatThread {
  id: string;
  teacherId: string;
  lastMessage: string;
  lastAt: string;
  unread: number;
}

export interface ChatMessage {
  id: string;
  threadId: string;
  from: 'student' | 'teacher';
  text: string;
  at: string;
  read: boolean;
}

export interface AiMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  at: string;
  subjectId?: string | null;
}

export interface StudySession {
  id: string;
  subjectId: string;
  title: string;
  date: string;
  start: string;
  end: string;
  goal: string;
  priority: StudyPriority;
  status: StudySessionStatus;
}

export interface Competition {
  id: string;
  title: string;
  description: string;
  subjectId?: string | null;
  status: CompetitionStatus;
  endsAt: string;
  rewardPoints: number;
  participants: number;
}

export interface BadgeItem {
  id: string;
  title: string;
  description: string;
  earned: boolean;
  icon: string;
}

export interface PointsEntry {
  id: string;
  title: string;
  points: number;
  at: string;
}

export interface LeaderboardRow {
  rank: number;
  name: string;
  points: number;
  isMe?: boolean;
}

export interface StudentNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  at: string;
  read: boolean;
  href?: string;
}

export interface StudentDashboardData {
  points: number;
  subjectsCount: number;
  pendingAssignments: number;
  upcomingLectures: number;
  completionRate: number;
  weekProgress: number[];
  todaySlots: ScheduleSlot[];
  upcomingLecturesList: Lecture[];
  dueAssignments: Assignment[];
  recentResults: ExamAttempt[];
  competitions: Competition[];
}
