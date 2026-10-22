import { apiFetch } from '@/api/client';
import type {
  StudentCreatePayload,
  StudentCreateResponse,
  StudentDetailResponse,
  StudentsListResponse,
  StudentStatus,
  StudentTransferPayload,
  StudentUpdatePayload,
  SchoolStudent,
} from '@/types/students';

export async function listStudents(params: {
  search?: string;
  grade_id?: number;
  classroom_id?: number;
  status?: StudentStatus;
  academic_year?: string;
  limit?: number;
  skip?: number;
  include_deleted?: boolean;
} = {}) {
  const q = new URLSearchParams();
  if (params.search) q.set('search', params.search);
  if (params.grade_id != null) q.set('grade_id', String(params.grade_id));
  if (params.classroom_id != null) q.set('classroom_id', String(params.classroom_id));
  if (params.status) q.set('status', params.status);
  if (params.academic_year) q.set('academic_year', params.academic_year);
  q.set('limit', String(params.limit ?? 50));
  q.set('skip', String(params.skip ?? 0));
  if (params.include_deleted) q.set('include_deleted', 'true');
  return apiFetch<StudentsListResponse>(`/school/students?${q.toString()}`);
}

export async function getStudent(id: number) {
  return apiFetch<StudentDetailResponse>(`/school/students/${id}`);
}

export async function createStudent(body: StudentCreatePayload) {
  return apiFetch<StudentCreateResponse>('/school/students', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function updateStudent(id: number, body: StudentUpdatePayload) {
  return apiFetch<{ message: string; student: SchoolStudent }>(
    `/school/students/${id}`,
    {
      method: 'PUT',
      body: JSON.stringify(body),
    },
  );
}

export async function transferStudent(id: number, body: StudentTransferPayload) {
  return apiFetch<{ message: string; student: SchoolStudent }>(
    `/school/students/${id}/transfer`,
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
  );
}

export async function updateStudentStatus(id: number, status: StudentStatus) {
  return apiFetch<{ message: string; student: SchoolStudent }>(
    `/school/students/${id}/status`,
    {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    },
  );
}

export async function regenerateStudentLoginCode(id: number) {
  return apiFetch<{ message: string; login_code: string }>(
    `/school/students/${id}/regenerate-login-code`,
    { method: 'POST' },
  );
}

export async function regenerateStudentQr(id: number) {
  return apiFetch<{
    message: string;
    qr_token: string;
    qr_payload: string;
  }>(`/school/students/${id}/regenerate-qr`, { method: 'POST' });
}

export async function deleteStudent(id: number) {
  return apiFetch<{ message: string; student: SchoolStudent }>(
    `/school/students/${id}`,
    { method: 'DELETE' },
  );
}
