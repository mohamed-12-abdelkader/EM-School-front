import { apiFetch } from '@/api/client';
import type {
  ClassroomSubjectOption,
  PeriodTemplate,
  SettingsResponse,
  SubjectTeacherOption,
  TimetableDetailResponse,
  TimetableListItem,
  TimetableSettings,
  TimetableSlot,
  TimetableSlotInput,
  TimetableConflict,
  TimetablesListResponse,
} from '@/types/timetables';

export async function getTimetableSettings() {
  return apiFetch<SettingsResponse>('/school/timetables/settings');
}

export async function updateTimetableSettings(
  body: Partial<{
    working_days: number[];
    periods_per_day: number;
    default_period_minutes: number;
    day_start_time: string;
    day_end_time: string;
    allow_teacher_conflicts: boolean;
  }>,
) {
  return apiFetch<{ message: string; settings: TimetableSettings }>(
    '/school/timetables/settings',
    { method: 'PUT', body: JSON.stringify(body) },
  );
}

export async function updatePeriodTemplates(
  periods: Omit<PeriodTemplate, 'id' | 'school_id'>[],
) {
  return apiFetch<{ message: string; period_templates: PeriodTemplate[] }>(
    '/school/timetables/period-templates',
    { method: 'PUT', body: JSON.stringify({ periods }) },
  );
}

export async function listSubjectsForClassroom(classroomId: number) {
  return apiFetch<{
    classroom_id: number;
    grade_id: number;
    subjects: ClassroomSubjectOption[];
  }>(`/school/timetables/subjects-for-classroom/${classroomId}`);
}

export async function listTeachersForSubject(subjectId: number) {
  return apiFetch<{
    subject_id: number;
    subject_name: string;
    teachers: SubjectTeacherOption[];
  }>(`/school/timetables/teachers-for-subject/${subjectId}`);
}

export async function listTimetables(params: {
  classroom_id?: number;
  grade_id?: number;
  academic_year?: string;
  term?: string;
  status?: 'draft' | 'published';
  limit?: number;
  skip?: number;
} = {}) {
  const q = new URLSearchParams();
  if (params.classroom_id != null) q.set('classroom_id', String(params.classroom_id));
  if (params.grade_id != null) q.set('grade_id', String(params.grade_id));
  if (params.academic_year) q.set('academic_year', params.academic_year);
  if (params.term) q.set('term', params.term);
  if (params.status) q.set('status', params.status);
  q.set('limit', String(params.limit ?? 50));
  q.set('skip', String(params.skip ?? 0));
  return apiFetch<TimetablesListResponse>(`/school/timetables?${q}`);
}

export async function getTimetable(id: number) {
  return apiFetch<TimetableDetailResponse>(`/school/timetables/${id}`);
}

export async function createTimetable(body: {
  classroom_id: number;
  academic_year: string;
  term?: string;
  title?: string | null;
  slots?: TimetableSlotInput[];
  skip_conflict_check?: boolean;
}) {
  return apiFetch<{
    message: string;
    timetable: TimetableListItem;
    slots: TimetableSlot[];
  }>('/school/timetables', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function updateTimetableMeta(
  id: number,
  body: {
    title?: string | null;
    academic_year?: string;
    term?: string;
  },
) {
  return apiFetch<{ message: string; timetable: Partial<TimetableListItem> }>(
    `/school/timetables/${id}`,
    { method: 'PUT', body: JSON.stringify(body) },
  );
}

export async function deleteTimetable(id: number, hard = false) {
  const qs = hard ? '?hard=true' : '';
  return apiFetch<{ message: string }>(`/school/timetables/${id}${qs}`, {
    method: 'DELETE',
  });
}

export async function replaceTimetableSlots(
  id: number,
  slots: TimetableSlotInput[],
  skip_conflict_check = false,
) {
  return apiFetch<{
    message: string;
    timetable: { id: number; status: string; updated_at: string };
    slots: TimetableSlot[];
  }>(`/school/timetables/${id}/slots`, {
    method: 'PUT',
    body: JSON.stringify({ slots, skip_conflict_check }),
  });
}

export async function upsertTimetableSlot(id: number, slot: TimetableSlotInput) {
  return apiFetch<{ message: string; slot: TimetableSlot }>(
    `/school/timetables/${id}/slots`,
    { method: 'POST', body: JSON.stringify(slot) },
  );
}

export async function deleteTimetableSlot(id: number, slotId: number) {
  return apiFetch<{ message: string }>(`/school/timetables/${id}/slots/${slotId}`, {
    method: 'DELETE',
  });
}

export async function validateTimetable(id: number) {
  return apiFetch<{ valid: boolean; conflicts: TimetableConflict[] }>(
    `/school/timetables/${id}/validate`,
    { method: 'POST' },
  );
}

export async function publishTimetable(id: number, force = false) {
  return apiFetch<{ message: string; timetable: Partial<TimetableListItem> }>(
    `/school/timetables/${id}/publish`,
    { method: 'POST', body: JSON.stringify({ force }) },
  );
}

export async function unpublishTimetable(id: number) {
  return apiFetch<{ message: string; timetable: Partial<TimetableListItem> }>(
    `/school/timetables/${id}/unpublish`,
    { method: 'POST' },
  );
}

export async function copyTimetable(
  id: number,
  body: {
    target_classroom_id: number;
    academic_year?: string;
    term?: string;
    title?: string | null;
    replace_existing?: boolean;
    skip_conflict_check?: boolean;
  },
) {
  return apiFetch<{ message: string; timetable: TimetableListItem }>(
    `/school/timetables/${id}/copy`,
    { method: 'POST', body: JSON.stringify(body) },
  );
}

export function extractConflicts(err: unknown): TimetableConflict[] {
  if (!err || typeof err !== 'object') return [];
  const details = (err as { details?: { conflicts?: TimetableConflict[] } }).details;
  return Array.isArray(details?.conflicts) ? details.conflicts : [];
}
