import { apiFetch } from '@/api/client';
import type {
  SchoolSubject,
  SubjectPayload,
  SubjectsListResponse,
  SubjectUpdatePayload,
} from '@/types/subjects';

export async function listSubjects(params: {
  search?: string;
  grade_id?: number;
  limit?: number;
  skip?: number;
  is_active?: boolean;
  include_deleted?: boolean;
} = {}) {
  const q = new URLSearchParams();
  if (params.search) q.set('search', params.search);
  if (params.grade_id != null) q.set('grade_id', String(params.grade_id));
  q.set('limit', String(params.limit ?? 50));
  q.set('skip', String(params.skip ?? 0));
  if (typeof params.is_active === 'boolean') {
    q.set('is_active', String(params.is_active));
  }
  if (params.include_deleted) q.set('include_deleted', 'true');
  const qs = q.toString();
  return apiFetch<SubjectsListResponse>(`/school/subjects?${qs}`);
}

export async function getSubject(id: number) {
  return apiFetch<{ subject: SchoolSubject }>(`/school/subjects/${id}`);
}

export async function createSubject(body: SubjectPayload) {
  return apiFetch<{ message: string; subject: SchoolSubject }>('/school/subjects', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function updateSubject(id: number, body: SubjectUpdatePayload) {
  return apiFetch<{ message: string; subject: SchoolSubject }>(
    `/school/subjects/${id}`,
    {
      method: 'PUT',
      body: JSON.stringify(body),
    },
  );
}

export async function reorderSubjects(items: { id: number; position: number }[]) {
  return apiFetch<{ message: string }>('/school/subjects/reorder', {
    method: 'PATCH',
    body: JSON.stringify({ items }),
  });
}

export async function deleteSubject(id: number, hard = false) {
  const qs = hard ? '?hard=true' : '';
  return apiFetch<{ message: string }>(`/school/subjects/${id}${qs}`, {
    method: 'DELETE',
  });
}
