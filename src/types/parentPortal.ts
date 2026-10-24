export type ParentRelation = 'father' | 'mother' | 'guardian' | 'other' | string;

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export interface ParentChild {
  id: string;
  name: string;
  avatar: string | null;
  relation: ParentRelation;
  isPrimary: boolean;
  status: string;
  academicYear: string | null;
  gradeId: string | null;
  gradeName: string | null;
  classroomId: string | null;
  classroomName: string | null;
  seatNumber: string | null;
}

export interface AttendanceSummary {
  attendanceRate: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  excusedDays: number;
  recordedDays: number;
  dateFrom: string;
  dateTo: string;
}

export interface ParentChildStats extends AttendanceSummary {
  avgExamPercent: number;
  examAttempts: number;
  gradedTasks: number;
  teacherOpinions: number;
}

export interface ParentChildWithStats extends ParentChild {
  stats: ParentChildStats;
}

export interface ParentDashboardData {
  parent: { id: string; name: string; phone: string | null };
  school: {
    id: string;
    name: string;
    loginCode: string;
    logo: string | null;
  } | null;
  children: ParentChildWithStats[];
  attendanceWindow: { dateFrom: string; dateTo: string };
}

export interface AttendanceRecord {
  id: string;
  date: string;
  status: AttendanceStatus;
  checkInTime: string | null;
  checkInMethod?: string | null;
  notes: string | null;
}

export interface ParentExamResult {
  id: string;
  examId: string;
  title: string;
  subjectId: string;
  subjectName: string;
  teacherName: string | null;
  score: number;
  maxScore: number;
  percent: number;
  finishedAt: string;
}

export interface ParentTaskGrade {
  id: string;
  taskId: string;
  title: string;
  subjectId: string;
  subjectName: string;
  teacherName: string | null;
  score: number;
  maxScore: number;
  percent: number;
  review: string | null;
  gradedAt: string | null;
  submittedAt: string | null;
}

export interface TeacherOpinion {
  id: string;
  title: string | null;
  taskId: string | null;
  taskTitle: string | null;
  subjectId: string | null;
  subjectName: string | null;
  teacherId: string;
  teacherName: string;
  grade: number | null;
  maxGrade: number | null;
  review: string;
  gradedAt: string | null;
}

export interface ParentLesson {
  id: string;
  title: string;
  description: string | null;
  subjectId: string;
  subjectName: string;
  teacherName: string;
  createdAt: string;
  attachmentsCount: number;
}

export interface ParentMaterial {
  id: string;
  subjectId: string;
  subjectName: string;
  teacherId: string;
  teacherName: string;
  /** e.g. "اللغة العربية leo" */
  name: string;
  lessonsCount: number;
  attachmentsCount: number;
  lastPublishedAt: string | null;
}

export interface ParentMaterialAttachment {
  id: string;
  kind: 'video' | 'pdf';
  title: string;
  fileUrl: string;
  filename: string | null;
}

export interface ParentMaterialLesson {
  id: string;
  title: string;
  description: string | null;
  createdAt: string;
  attachments: ParentMaterialAttachment[];
}

export interface ParentMaterialDetail {
  child: { id: string; name: string };
  material: {
    id: string;
    subjectId: string;
    subjectName: string;
    teacherId: string;
    teacherName: string;
    name: string;
  };
  lessons: ParentMaterialLesson[];
}

export interface ParentLessonDetail {
  lesson: {
    id: string;
    title: string;
    description: string | null;
    subjectId: string;
    subjectName: string;
    teacherName: string;
    createdAt: string;
  };
  attachments: ParentMaterialAttachment[];
}

export interface ParentChildOverview {
  child: {
    id: string;
    name: string;
    avatar: string | null;
    relation: ParentRelation;
    isPrimary: boolean;
    academicYear: string | null;
    gradeName: string | null;
    classroomName: string | null;
  };
  stats: ParentChildStats;
  recentAttendance: AttendanceRecord[];
  recentExams: ParentExamResult[];
  recentTasks: ParentTaskGrade[];
  recentOpinions: TeacherOpinion[];
}
