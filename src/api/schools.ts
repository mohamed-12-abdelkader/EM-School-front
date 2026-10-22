import { apiFetch } from '@/api/client';
import type { School, SchoolsListResponse } from '@/types/auth';

export async function listSchools(params: {
  search?: string;
  limit?: number;
  skip?: number;
  include_deleted?: boolean;
} = {}) {
  const q = new URLSearchParams();
  if (params.search) q.set('search', params.search);
  q.set('limit', String(params.limit ?? 10));
  q.set('skip', String(params.skip ?? 0));
  if (params.include_deleted) q.set('include_deleted', 'true');
  const qs = q.toString();
  return apiFetch<SchoolsListResponse>(`/schools?${qs}`);
}

export async function getSchool(id: number) {
  return apiFetch<{ school: School }>(`/schools/${id}`);
}

export async function createSchool(form: FormData) {
  return apiFetch<{ message: string; school: School }>('/schools', {
    method: 'POST',
    formData: true,
    body: form,
  });
}

export async function updateSchool(id: number, form: FormData) {
  return apiFetch<{ message: string; school: School }>(`/schools/${id}`, {
    method: 'PUT',
    formData: true,
    body: form,
  });
}

export async function deleteSchool(id: number) {
  return apiFetch<{ message: string; school: { id: number; name: string } }>(
    `/schools/${id}`,
    { method: 'DELETE' },
  );
}
