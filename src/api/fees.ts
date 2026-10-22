import { apiFetch } from '@/api/client';
import type {
  FeeCategory,
  FeeDiscount,
  FeeStructure,
  FeeStructureCreatePayload,
  FeeStructuresListResponse,
  FeeStructureUpdatePayload,
  FeesSummaryReport,
  Installment,
  OverdueListResponse,
  Payment,
  PaymentMethod,
  PaymentsListResponse,
  StudentFeeAccountResponse,
  StudentFeeItem,
} from '@/types/fees';

function qs(params: Record<string, string | number | boolean | undefined | null>) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v == null || v === '') continue;
    q.set(k, String(v));
  }
  return q.toString();
}

export async function listFeeCategories() {
  return apiFetch<{ categories: FeeCategory[] }>('/school/fees/categories');
}

export async function createFeeCategory(body: { name: string; description?: string | null }) {
  return apiFetch<{ message: string; category: FeeCategory }>('/school/fees/categories', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function listFeeStructures(params: {
  academic_year?: string;
  is_active?: boolean;
  limit?: number;
  skip?: number;
} = {}) {
  const query = qs({
    academic_year: params.academic_year,
    is_active: params.is_active,
    limit: params.limit ?? 50,
    skip: params.skip ?? 0,
  });
  return apiFetch<FeeStructuresListResponse>(`/school/fees/structures?${query}`);
}

export async function createFeeStructure(body: FeeStructureCreatePayload) {
  return apiFetch<{ message: string; structure: FeeStructure }>('/school/fees/structures', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function updateFeeStructure(id: number, body: FeeStructureUpdatePayload) {
  return apiFetch<{ message: string; structure: FeeStructure }>(
    `/school/fees/structures/${id}`,
    { method: 'PATCH', body: JSON.stringify(body) },
  );
}

export async function deleteFeeStructure(id: number) {
  return apiFetch<{ message: string; id: number }>(`/school/fees/structures/${id}`, {
    method: 'DELETE',
  });
}

export async function assignFeeStructure(body: {
  fee_structure_id: number;
  student_ids?: number[];
}) {
  return apiFetch<{ message: string; assigned_count?: number }>('/school/fees/assign', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function assignDirectFee(body: {
  student_id: number;
  academic_year: string;
  name: string;
  amount: number;
  description?: string | null;
  due_date?: string | null;
  is_mandatory?: boolean;
  fee_structure_id?: number | null;
}) {
  return apiFetch<{ message: string; item: StudentFeeItem }>('/school/fees/assign-direct', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function createInstallmentPlan(body: {
  student_id: number;
  academic_year: string;
  title?: string | null;
  total_amount?: number;
  count?: number;
  amounts?: number[];
  first_due_date: string;
  interval_days?: number;
  due_dates?: string[];
}) {
  return apiFetch<{ message: string; plan?: unknown; installments?: Installment[] }>(
    '/school/fees/installment-plans',
    { method: 'POST', body: JSON.stringify(body) },
  );
}

export async function updateInstallmentDueDate(id: number, due_date: string) {
  return apiFetch<{ message: string; installment: Installment }>(
    `/school/fees/installments/${id}/due-date`,
    { method: 'PATCH', body: JSON.stringify({ due_date }) },
  );
}

export async function cancelInstallment(id: number, reason: string) {
  return apiFetch<{ message: string }>(`/school/fees/installments/${id}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export async function recordPayment(body: {
  student_id: number;
  academic_year: string;
  amount: number;
  method?: PaymentMethod;
  reference?: string | null;
  notes?: string | null;
  installment_ids?: number[];
  idempotency_key?: string | null;
}) {
  return apiFetch<{
    message: string;
    payment?: Payment;
    idempotent_replay?: boolean;
  }>('/school/fees/payments', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function listPayments(params: {
  student_id?: number;
  method?: PaymentMethod;
  from?: string;
  to?: string;
  limit?: number;
  skip?: number;
} = {}) {
  const query = qs({
    student_id: params.student_id,
    method: params.method,
    from: params.from,
    to: params.to,
    limit: params.limit ?? 50,
    skip: params.skip ?? 0,
  });
  return apiFetch<PaymentsListResponse>(`/school/fees/payments?${query}`);
}

export async function reversePayment(id: number, reason: string) {
  return apiFetch<{ message: string; payment: Payment }>(
    `/school/fees/payments/${id}/reverse`,
    { method: 'POST', body: JSON.stringify({ reason }) },
  );
}

export async function applyDiscount(body: {
  student_id: number;
  academic_year: string;
  fee_item_id?: number | null;
  name: string;
  discount_type: 'fixed' | 'percent';
  value: number;
  reason?: string | null;
}) {
  return apiFetch<{ message: string; discount: FeeDiscount }>('/school/fees/discounts', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function getStudentFeeAccount(studentId: number, academicYear: string) {
  const query = qs({ academic_year: academicYear });
  return apiFetch<StudentFeeAccountResponse>(
    `/school/fees/accounts/${studentId}?${query}`,
  );
}

export async function getFeesSummary(params: { academic_year?: string } = {}) {
  const query = qs({ academic_year: params.academic_year });
  return apiFetch<{ summary?: FeesSummaryReport } & FeesSummaryReport>(
    `/school/fees/reports/summary?${query}`,
  );
}

export async function listOverdueInstallments(params: {
  academic_year?: string;
  grade_id?: number;
  classroom_id?: number;
  limit?: number;
  skip?: number;
} = {}) {
  const query = qs({
    academic_year: params.academic_year,
    grade_id: params.grade_id,
    classroom_id: params.classroom_id,
    limit: params.limit ?? 50,
    skip: params.skip ?? 0,
  });
  return apiFetch<OverdueListResponse>(`/school/fees/reports/overdue?${query}`);
}
