import { apiFetch } from '@/api/client';
import type {
  ClassroomPayload,
  ClassroomsListResponse,
  ClassroomUpdatePayload,
  SchoolClassroom,
} from '@/types/classrooms';

export async function listClassrooms(params: {
  grade_id?: number;
  search?: string;
  limit?: number;
  skip?: number;
  is_active?: boolean;
  include_deleted?: boolean;
} = {}) {
  const q = new URLSearchParams();
  if (params.grade_id != null) q.set('grade_id', String(params.grade_id));
  if (params.search) q.set('search', params.search);
  q.set('limit', String(params.limit ?? 50));
  q.set('skip', String(params.skip ?? 0));
  if (typeof params.is_active === 'boolean') {
    q.set('is_active', String(params.is_active));
  }
  if (params.include_deleted) q.set('include_deleted', 'true');
  const qs = q.toString();
  return apiFetch<ClassroomsListResponse>(`/school/classrooms?${qs}`);
}

export async function getClassroom(id: number) {
  return apiFetch<{ classroom: SchoolClassroom }>(`/school/classrooms/${id}`);
}

export async function createClassroom(body: ClassroomPayload) {
  return apiFetch<{ message: string; classroom: SchoolClassroom }>(
    '/school/classrooms',
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
  );
}

export async function updateClassroom(id: number, body: ClassroomUpdatePayload) {
  return apiFetch<{ message: string; classroom: SchoolClassroom }>(
    `/school/classrooms/${id}`,
    {
      method: 'PUT',
      body: JSON.stringify(body),
    },
  );
}

export async function reorderClassrooms(items: { id: number; position: number }[]) {
  return apiFetch<{ message: string }>('/school/classrooms/reorder', {
    method: 'PATCH',
    body: JSON.stringify({ items }),
  });
}

export async function deleteClassroom(id: number, hard = false) {
  const qs = hard ? '?hard=true' : '';
  return apiFetch<{ message: string }>(`/school/classrooms/${id}${qs}`, {
    method: 'DELETE',
  });
}
