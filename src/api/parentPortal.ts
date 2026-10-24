import { apiFetch } from '@/api/client';
import type {
  ParentChild,
  ParentChildOverview,
  ParentDashboardData,
  ParentExamResult,
  ParentLesson,
  ParentLessonDetail,
  ParentMaterial,
  ParentMaterialDetail,
  ParentTaskGrade,
  TeacherOpinion,
  AttendanceRecord,
  AttendanceSummary,
} from '@/types/parentPortal';

export function fetchParentDashboard() {
  return apiFetch<ParentDashboardData>('/parent/portal/dashboard');
}

export function fetchParentChildren() {
  return apiFetch<{ children: ParentChild[] }>('/parent/portal/children');
}

export function fetchParentChildOverview(childId: string) {
  return apiFetch<ParentChildOverview>(`/parent/portal/children/${childId}`);
}

export function fetchParentChildAttendance(
  childId: string,
  opts?: { dateFrom?: string; dateTo?: string },
) {
  const q = new URLSearchParams();
  if (opts?.dateFrom) q.set('date_from', opts.dateFrom);
  if (opts?.dateTo) q.set('date_to', opts.dateTo);
  const qs = q.toString();
  return apiFetch<{
    child: { id: string; name: string; gradeName: string | null; classroomName: string | null };
    summary: AttendanceSummary;
    records: AttendanceRecord[];
  }>(`/parent/portal/children/${childId}/attendance${qs ? `?${qs}` : ''}`);
}

export function fetchParentChildExams(childId: string) {
  return apiFetch<{
    child: { id: string; name: string };
    exams: ParentExamResult[];
  }>(`/parent/portal/children/${childId}/exams`);
}

export function fetchParentChildTasks(childId: string) {
  return apiFetch<{
    child: { id: string; name: string };
    tasks: ParentTaskGrade[];
  }>(`/parent/portal/children/${childId}/tasks`);
}

export function fetchParentChildOpinions(childId: string) {
  return apiFetch<{
    child: { id: string; name: string };
    opinions: TeacherOpinion[];
  }>(`/parent/portal/children/${childId}/opinions`);
}

export function fetchParentChildLessons(childId: string, subjectId?: string) {
  const q = subjectId ? `?subject_id=${subjectId}` : '';
  return apiFetch<{
    child: { id: string; name: string };
    lessons: ParentLesson[];
  }>(`/parent/portal/children/${childId}/lessons${q}`);
}

export function fetchParentChildMaterials(childId: string) {
  return apiFetch<{
    child: { id: string; name: string };
    materials: ParentMaterial[];
  }>(`/parent/portal/children/${childId}/materials`);
}

export function fetchParentChildMaterial(childId: string, subjectId: string) {
  return apiFetch<ParentMaterialDetail>(
    `/parent/portal/children/${childId}/materials/${subjectId}`,
  );
}

export function fetchParentChildLesson(childId: string, lessonId: string) {
  return apiFetch<ParentLessonDetail>(
    `/parent/portal/children/${childId}/lessons/${lessonId}`,
  );
}
