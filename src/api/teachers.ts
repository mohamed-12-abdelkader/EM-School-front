import { apiFetch } from '@/api/client';
import type {
  SchoolTeacher,
  TeacherCreatePayload,
  TeachersListResponse,
  TeacherUpdatePayload,
} from '@/types/teachers';

export async function listTeachers(params: {
  search?: string;
  subject_id?: number;
  limit?: number;
  skip?: number;
  is_active?: boolean;
  include_deleted?: boolean;
} = {}) {
  const q = new URLSearchParams();
  if (params.search) q.set('search', params.search);
  if (params.subject_id != null) q.set('subject_id', String(params.subject_id));
  q.set('limit', String(params.limit ?? 50));
  q.set('skip', String(params.skip ?? 0));
  if (typeof params.is_active === 'boolean') {
    q.set('is_active', String(params.is_active));
  }
  if (params.include_deleted) q.set('include_deleted', 'true');
  const qs = q.toString();
  return apiFetch<TeachersListResponse>(`/school/teachers?${qs}`);
}

export async function getTeacher(id: number) {
  return apiFetch<{ teacher: SchoolTeacher }>(`/school/teachers/${id}`);
}

export async function createTeacher(body: TeacherCreatePayload) {
  return apiFetch<{ message: string; teacher: SchoolTeacher }>('/school/teachers', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function updateTeacher(id: number, body: TeacherUpdatePayload) {
  return apiFetch<{ message: string; teacher: SchoolTeacher }>(
    `/school/teachers/${id}`,
    {
      method: 'PUT',
      body: JSON.stringify(body),
    },
  );
}

export async function deleteTeacher(id: number) {
  return apiFetch<{ message: string }>(`/school/teachers/${id}`, {
    method: 'DELETE',
  });
}
