import { apiFetch } from '@/api/client';

export function fetchStudentDashboard() {
  return apiFetch<Record<string, unknown>>('/student/portal/dashboard');
}

export function fetchStudentSubjects() {
  return apiFetch<{ subjects: unknown[] }>('/student/portal/subjects');
}

export function fetchSubjectDetail(id: string) {
  return apiFetch<{
    subject: unknown;
    teacher: unknown;
    lectures: unknown[];
    assignments: unknown[];
    exams: unknown[];
    announcements: string[];
  }>(`/student/portal/subjects/${id}`);
}

export function fetchStudentLessons(subjectId?: string) {
  const q = subjectId ? `?subject_id=${subjectId}` : '';
  return apiFetch<{ lessons: unknown[] }>(`/student/portal/lessons${q}`);
}

export function fetchStudentLesson(id: string) {
  return apiFetch<{
    lesson: unknown;
    attachments: Array<{
      id: string;
      kind: 'video' | 'pdf';
      title: string;
      fileUrl: string;
      filename?: string | null;
    }>;
  }>(`/student/portal/lessons/${id}`);
}

export function fetchStudentTasks(subjectId?: string) {
  const q = subjectId ? `?subject_id=${subjectId}` : '';
  return apiFetch<{ tasks: unknown[] }>(`/student/portal/tasks${q}`);
}

export function fetchStudentTask(id: string) {
  return apiFetch<{
    task: Record<string, unknown>;
    attachments: Array<{
      id: string;
      kind: string;
      title: string;
      fileUrl: string;
      filename?: string | null;
    }>;
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
  }>(`/student/portal/tasks/${id}`);
}

export function submitStudentTask(
  id: string,
  body: {
    submission_note?: string | null;
    answers: Array<{
      question_id: number;
      choice_id?: number | null;
      written_answer?: string | null;
    }>;
  },
) {
  return apiFetch<{
    message: string;
    auto_scored: boolean;
    score: number | null;
    max_score: number;
  }>(`/student/portal/tasks/${id}/submit`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function fetchStudentExams(subjectId?: string) {
  const q = subjectId ? `?subject_id=${subjectId}` : '';
  return apiFetch<{ exams: unknown[] }>(`/student/portal/exams${q}`);
}

export function fetchStudentExam(id: string) {
  return apiFetch<{
    exam: Record<string, unknown>;
    questions: Array<{
      id: string;
      type?: 'mcq' | 'written';
      text: string;
      points?: number;
      choices: string[];
      choiceIds?: string[];
      correctIndex: number;
      explanation?: string;
      difficulty?: 'easy' | 'medium' | 'hard';
    }>;
  }>(`/student/portal/exams/${id}`);
}

export function submitStudentExam(
  id: string,
  answers: Array<{
    question_id: number;
    choice_id?: number | null;
    written_answer?: string | null;
  }>,
) {
  return apiFetch<{
    attempt: {
      id: string;
      examId: string;
      score: number;
      maxScore: number;
      percent: number;
      finishedAt: string;
    };
  }>(`/student/portal/exams/${id}/submit`, {
    method: 'POST',
    body: JSON.stringify({ answers }),
  });
}

export function fetchStudentExamResult(id: string) {
  return apiFetch<{
    attempt: {
      id: string;
      examId: string;
      score: number;
      maxScore: number;
      percent: number;
      finishedAt: string;
      answers: Record<string, number>;
    };
    exam: { id: string; title: string; subjectName: string };
    questions: Array<{
      id: string;
      type: string;
      text: string;
      points: number;
      choices: string[];
      choiceIds: string[];
      correctIndex: number;
      explanation?: string;
      difficulty: 'easy' | 'medium' | 'hard';
      isCorrect: boolean | null;
      pointsAwarded: number;
      yourChoiceId: string | null;
      yourWritten: string | null;
    }>;
  }>(`/student/portal/exams/${id}/result`);
}

export function fetchStudentResults() {
  return apiFetch<{
    examAttempts: Array<{
      id: string;
      examId: string;
      examTitle: string;
      subjectId: string;
      subjectName: string;
      score: number;
      maxScore: number;
      percent: number;
      finishedAt: string;
    }>;
    taskGrades: Array<{
      id: string;
      taskId: string;
      taskTitle: string;
      subjectId: string;
      subjectName: string;
      score: number;
      maxScore: number;
      review: string | null;
      gradedAt: string | null;
    }>;
  }>('/student/portal/results');
}

export function fetchStudentTimetable(day?: number) {
  const q = day != null ? `?day=${day}` : '';
  return apiFetch<{
    classroomId: string;
    classroomName: string | null;
    gradeName: string | null;
    academicYear: string | null;
    slots: Array<{
      id: string;
      day: number;
      periodNumber: number;
      start: string;
      end: string;
      slotType: 'lesson' | 'break' | 'activity' | 'reserve';
      subjectId: string;
      subjectName: string | null;
      teacherId: string;
      teacherName: string | null;
      notes: string | null;
      room: string | null;
      color: string;
    }>;
  }>(`/student/portal/timetable${q}`);
}

export function fetchStudentNotifications() {
  return apiFetch<{
    notifications: Array<{
      id: string;
      kind: string;
      title: string;
      body: string;
      at: string;
      read: boolean;
      href?: string | null;
    }>;
  }>('/student/portal/notifications');
}

export function markStudentNotificationRead(id: string) {
  return apiFetch<{ message: string }>(`/student/portal/notifications/${id}/read`, {
    method: 'POST',
  });
}

export function markAllStudentNotificationsRead() {
  return apiFetch<{ message: string }>('/student/portal/notifications/read-all', {
    method: 'POST',
  });
}
