import { apiFetch } from '@/api/client';
import { API_BASE_URL } from '@/api/config';
import { getToken } from '@/auth/storage';
import type {
  TeacherAttachment,
  TeacherClass,
  TeacherDashboardData,
  TeacherExam,
  TeacherExamQuestion,
  TeacherLesson,
  TeacherTask,
  TeacherTaskStudent,
  ExamStatus,
} from '@/types/teacherPortal';

export function getTeacherDashboard() {
  return apiFetch<TeacherDashboardData>('/teacher/portal/dashboard');
}

export function getTeacherClasses() {
  return apiFetch<{ classes: TeacherClass[] }>('/teacher/portal/classes');
}

export function getTeacherClassDetail(classroomId: number, subjectId?: number) {
  const q = subjectId ? `?subject_id=${subjectId}` : '';
  return apiFetch<{
    classroom: { id: number; name: string; grade_id: number; grade_name: string };
    subjects: Array<{ id: number; name: string }>;
    students: Array<{
      id: number;
      name: string;
      email: string | null;
      phone: string | null;
      seat_number: string | null;
      status: string | null;
    }>;
    slots: Array<{
      day_of_week: number;
      period_number: number;
      start_time: string;
      end_time: string;
      subject_name: string;
      subject_id: number;
    }>;
  }>(`/teacher/portal/classes/${classroomId}${q}`);
}

export function getTeacherLessons(classroomId?: number) {
  const q = classroomId ? `?classroom_id=${classroomId}` : '';
  return apiFetch<{ lessons: TeacherLesson[] }>(`/teacher/portal/lessons${q}`);
}

export function getTeacherLesson(id: number) {
  return apiFetch<{ lesson: TeacherLesson; attachments: TeacherAttachment[] }>(
    `/teacher/portal/lessons/${id}`,
  );
}

export function createTeacherLesson(body: {
  classroom_id: number;
  subject_id: number;
  title: string;
  description?: string | null;
}) {
  return apiFetch<{ lesson: TeacherLesson }>('/teacher/portal/lessons', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function deleteTeacherLesson(id: number) {
  return apiFetch<{ message: string }>(`/teacher/portal/lessons/${id}`, {
    method: 'DELETE',
  });
}

export function updateTeacherLesson(
  id: number,
  body: { title?: string; description?: string | null },
) {
  return apiFetch<{ lesson: TeacherLesson }>(`/teacher/portal/lessons/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export async function updateLessonAttachment(
  lessonId: number,
  attachmentId: number,
  payload: {
    kind?: 'video' | 'pdf';
    title?: string;
    file_url?: string;
    file?: File | null;
  },
) {
  const token = await getToken();
  const form = new FormData();
  if (payload.kind) form.append('kind', payload.kind);
  if (payload.title != null) form.append('title', payload.title);
  if (payload.file_url) form.append('file_url', payload.file_url);
  if (payload.file) form.append('file', payload.file);

  const res = await fetch(
    `${API_BASE_URL}/teacher/portal/lessons/${lessonId}/attachments/${attachmentId}`,
    {
      method: 'PATCH',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: form,
    },
  );
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.message || 'تعذر تحديث المرفق');
  }
  return (await res.json()) as { attachment: TeacherAttachment };
}

export async function addLessonAttachment(
  lessonId: number,
  payload: {
    kind: 'video' | 'pdf';
    title: string;
    file_url?: string;
    file?: { uri: string; name: string; type: string } | File | null;
  },
) {
  const token = await getToken();
  const form = new FormData();
  form.append('kind', payload.kind);
  form.append('title', payload.title);
  if (payload.file_url) form.append('file_url', payload.file_url);
  if (payload.file) {
    if (typeof File !== 'undefined' && payload.file instanceof File) {
      form.append('file', payload.file);
    } else {
      form.append('file', payload.file as unknown as Blob);
    }
  }

  const res = await fetch(`${API_BASE_URL}/teacher/portal/lessons/${lessonId}/attachments`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: form,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.message || 'تعذر رفع المرفق');
  }
  return (await res.json()) as { attachment: TeacherAttachment };
}

export function deleteLessonAttachment(lessonId: number, attachmentId: number) {
  return apiFetch<{ message: string }>(
    `/teacher/portal/lessons/${Number(lessonId)}/attachments/${Number(attachmentId)}`,
    { method: 'DELETE' },
  );
}

export function getTeacherExams() {
  return apiFetch<{ exams: TeacherExam[] }>('/teacher/portal/exams');
}

export function getTeacherExam(id: number) {
  return apiFetch<{ exam: TeacherExam; questions: TeacherExamQuestion[] }>(
    `/teacher/portal/exams/${id}`,
  );
}

export function createTeacherExam(body: {
  classroom_id: number;
  subject_id: number;
  title: string;
  description?: string | null;
  duration_minutes?: number | null;
  status?: ExamStatus;
  questions: TeacherExamQuestion[];
}) {
  return apiFetch<{ exam: TeacherExam }>('/teacher/portal/exams', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function updateTeacherExam(
  id: number,
  body: Partial<{
    title: string;
    description: string | null;
    duration_minutes: number | null;
    status: ExamStatus;
    questions: TeacherExamQuestion[];
  }>,
) {
  return apiFetch<{ exam: TeacherExam }>(`/teacher/portal/exams/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function deleteTeacherExam(id: number) {
  return apiFetch<{ message: string }>(`/teacher/portal/exams/${id}`, {
    method: 'DELETE',
  });
}

export function getTeacherTasks() {
  return apiFetch<{ tasks: TeacherTask[] }>('/teacher/portal/tasks');
}

export function getTeacherTask(id: number) {
  return apiFetch<{
    task: TeacherTask;
    students: TeacherTaskStudent[];
    attachments: TeacherAttachment[];
    questions: TeacherExamQuestion[];
  }>(`/teacher/portal/tasks/${id}`);
}

export function createTeacherTask(body: {
  classroom_id: number;
  subject_id: number;
  title: string;
  description?: string | null;
  max_grade?: number;
  due_at?: string | null;
  submission_mode?: 'questions' | 'pdf';
  questions?: TeacherExamQuestion[];
}) {
  return apiFetch<{ task: TeacherTask }>('/teacher/portal/tasks', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function addTaskAttachment(
  taskId: number,
  payload: {
    title: string;
    file_url?: string;
    file?: File | null;
  },
) {
  const token = await getToken();
  const form = new FormData();
  form.append('kind', 'pdf');
  form.append('title', payload.title);
  if (payload.file_url) form.append('file_url', payload.file_url);
  if (payload.file) form.append('file', payload.file);

  const res = await fetch(`${API_BASE_URL}/teacher/portal/tasks/${taskId}/attachments`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: form,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.message || 'تعذر رفع ملف PDF');
  }
  return (await res.json()) as { attachment: TeacherAttachment };
}

export function deleteTeacherTask(id: number) {
  return apiFetch<{ message: string }>(`/teacher/portal/tasks/${id}`, {
    method: 'DELETE',
  });
}

export function upsertTaskGrade(
  taskId: number,
  body: { student_id: number; grade?: number | null; review?: string | null },
) {
  return apiFetch<{ grade: unknown }>(`/teacher/portal/tasks/${taskId}/grades`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export function getTeacherChats() {
  return apiFetch<{
    threads: Array<{
      id: string;
      teacherId: string;
      studentId: string;
      studentName: string;
      classroomName?: string | null;
      lastMessage: string;
      lastAt: string;
      unread: number;
    }>;
  }>('/teacher/portal/chats');
}

export function ensureTeacherChatWithStudent(studentId: number | string) {
  return apiFetch<{
    thread: {
      id: string;
      teacherId: string;
      studentId: string;
      studentName: string;
      classroomName?: string | null;
      lastMessage: string;
      lastAt: string;
      unread: number;
    };
  }>('/teacher/portal/chats', {
    method: 'POST',
    body: JSON.stringify({ student_id: Number(studentId) }),
  });
}

export function getTeacherChatMessages(threadId: string) {
  return apiFetch<{
    messages: Array<{
      id: string;
      threadId: string;
      from: 'student' | 'teacher';
      text: string;
      at: string;
      read: boolean;
    }>;
  }>(`/teacher/portal/chats/${threadId}/messages`);
}

export function sendTeacherChatMessage(threadId: string, text: string) {
  return apiFetch<{
    message: {
      id: string;
      threadId: string;
      from: 'student' | 'teacher';
      text: string;
      at: string;
      read: boolean;
    };
  }>(`/teacher/portal/chats/${threadId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
}

export type TeacherStudentOpinion = {
  id: number;
  title: string | null;
  body: string;
  subject_id: number | null;
  subject_name: string | null;
  classroom_id: number | null;
  created_at: string;
  updated_at: string;
};

export function listTeacherStudentOpinions(studentId: number, classroomId: number) {
  return apiFetch<{
    student: { id: number; name: string; classroom_id: number };
    opinions: TeacherStudentOpinion[];
  }>(`/teacher/portal/students/${studentId}/opinions?classroom_id=${classroomId}`);
}

export function createTeacherStudentOpinion(body: {
  student_id: number;
  classroom_id: number;
  subject_id?: number | null;
  title?: string | null;
  body: string;
}) {
  return apiFetch<{ opinion: TeacherStudentOpinion }>('/teacher/portal/opinions', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function deleteTeacherStudentOpinion(id: number) {
  return apiFetch<{ message: string }>(`/teacher/portal/opinions/${id}`, {
    method: 'DELETE',
  });
}
