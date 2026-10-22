import { apiFetch } from '@/api/client';
import type { ParentsListResponse, SchoolParent } from '@/types/parents';

export async function listParents(params: {
  search?: string;
  limit?: number;
  skip?: number;
  include_deleted?: boolean;
} = {}) {
  const q = new URLSearchParams();
  if (params.search) q.set('search', params.search);
  q.set('limit', String(params.limit ?? 50));
  q.set('skip', String(params.skip ?? 0));
  if (params.include_deleted) q.set('include_deleted', 'true');
  return apiFetch<ParentsListResponse>(`/school/parents?${q.toString()}`);
}

export async function getParent(id: number) {
  return apiFetch<{ parent: SchoolParent; students: unknown[] }>(
    `/school/parents/${id}`,
  );
}
