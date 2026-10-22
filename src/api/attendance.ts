import { apiFetch, ApiError } from '@/api/client';
import { API_BASE_URL } from '@/api/config';
import { getToken } from '@/auth/storage';
import type {
  AttendanceListResponse,
  AttendanceRecord,
  AttendanceStatus,
  BulkAttendancePayload,
  BulkAttendanceResponse,
  DailyAttendanceSummary,
  ManualAttendancePayload,
  QrCheckInResponse,
  UnrecordedStudent,
} from '@/types/attendance';

function qs(params: Record<string, string | number | undefined | null>) {
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value == null || value === '') continue;
    q.set(key, String(value));
  }
  return q.toString();
}

export async function listAttendance(params: {
  date?: string;
  date_from?: string;
  date_to?: string;
  grade_id?: number;
  classroom_id?: number;
  student_id?: number;
  status?: AttendanceStatus;
  limit?: number;
  skip?: number;
} = {}) {
  const query = qs({
    date: params.date,
    date_from: params.date_from,
    date_to: params.date_to,
    grade_id: params.grade_id,
    classroom_id: params.classroom_id,
    student_id: params.student_id,
    status: params.status,
    limit: params.limit ?? 200,
    skip: params.skip ?? 0,
  });
  return apiFetch<AttendanceListResponse>(`/school/attendance?${query}`);
}

export async function getAttendance(id: number) {
  return apiFetch<{ attendance: AttendanceRecord }>(`/school/attendance/${id}`);
}

export async function getDailyAttendanceSummary(params: {
  date?: string;
  grade_id?: number;
  classroom_id?: number;
} = {}) {
  const query = qs({
    date: params.date,
    grade_id: params.grade_id,
    classroom_id: params.classroom_id,
  });
  return apiFetch<{ summary: DailyAttendanceSummary }>(
    `/school/attendance/summary/daily?${query}`,
  );
}

export async function listUnrecordedStudents(params: {
  date?: string;
  grade_id?: number;
  classroom_id?: number;
} = {}) {
  const query = qs({
    date: params.date,
    grade_id: params.grade_id,
    classroom_id: params.classroom_id,
  });
  return apiFetch<{ date: string; students: UnrecordedStudent[]; total: number }>(
    `/school/attendance/unrecorded?${query}`,
  );
}

export async function checkInByQr(body: { qr_payload?: string; qr_token?: string }) {
  return apiFetch<QrCheckInResponse>('/school/attendance/check-in/qr', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function markAttendanceManual(body: ManualAttendancePayload) {
  return apiFetch<{
    message: string;
    created: boolean;
    attendance: AttendanceRecord;
  }>('/school/attendance/manual', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function markAttendanceBulk(body: BulkAttendancePayload) {
  return apiFetch<BulkAttendanceResponse>('/school/attendance/bulk', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function updateAttendance(
  id: number,
  body: {
    status?: AttendanceStatus;
    absence_reason?: string | null;
    notes?: string | null;
    excuse_approved?: boolean | null;
    edit_reason: string;
  },
) {
  return apiFetch<{ message: string; attendance: AttendanceRecord }>(
    `/school/attendance/${id}`,
    {
      method: 'PUT',
      body: JSON.stringify(body),
    },
  );
}

export async function cancelAttendance(id: number, reason?: string) {
  return apiFetch<{ message: string; id: number; cancelled: boolean }>(
    `/school/attendance/${id}`,
    {
      method: 'DELETE',
      body: JSON.stringify({ reason: reason || null }),
    },
  );
}

export async function exportAttendanceCsv(params: {
  date?: string;
  date_from?: string;
  date_to?: string;
  grade_id?: number;
  classroom_id?: number;
  student_id?: number;
  status?: AttendanceStatus;
} = {}) {
  const query = qs({
    date: params.date,
    date_from: params.date_from,
    date_to: params.date_to,
    grade_id: params.grade_id,
    classroom_id: params.classroom_id,
    student_id: params.student_id,
    status: params.status,
  });
  const token = await getToken();
  const res = await fetch(`${API_BASE_URL}/school/attendance/export.csv?${query}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) {
    let message = 'تعذر تصدير الحضور';
    try {
      const data = await res.json();
      message = data?.message || data?.detail || message;
    } catch {
      // ignore
    }
    throw new ApiError(message, res.status);
  }
  return res.text();
}
