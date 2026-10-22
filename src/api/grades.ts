import { apiFetch } from '@/api/client';
import type {
  GradePayload,
  GradesListResponse,
  GradeUpdatePayload,
  SchoolGrade,
} from '@/types/grades';

export async function listGrades(params: {
  search?: string;
  limit?: number;
  skip?: number;
  is_active?: boolean;
  include_deleted?: boolean;
} = {}) {
  const q = new URLSearchParams();
  if (params.search) q.set('search', params.search);
  q.set('limit', String(params.limit ?? 50));
  q.set('skip', String(params.skip ?? 0));
  if (typeof params.is_active === 'boolean') {
    q.set('is_active', String(params.is_active));
  }
  if (params.include_deleted) q.set('include_deleted', 'true');
  const qs = q.toString();
  return apiFetch<GradesListResponse>(`/school/grades?${qs}`);
}

export async function getGrade(id: number) {
  return apiFetch<{ grade: SchoolGrade }>(`/school/grades/${id}`);
}

export async function createGrade(body: GradePayload) {
  return apiFetch<{ message: string; grade: SchoolGrade }>('/school/grades', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function updateGrade(id: number, body: GradeUpdatePayload) {
  return apiFetch<{ message: string; grade: SchoolGrade }>(`/school/grades/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export async function reorderGrades(items: { id: number; position: number }[]) {
  return apiFetch<{ message: string }>('/school/grades/reorder', {
    method: 'PATCH',
    body: JSON.stringify({ items }),
  });
}

export async function deleteGrade(id: number, hard = false) {
  const qs = hard ? '?hard=true' : '';
  return apiFetch<{ message: string }>(`/school/grades/${id}${qs}`, {
    method: 'DELETE',
  });
}
