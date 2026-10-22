export type AssignmentScope = 'school' | 'grade' | 'students';
export type PaymentMethod = 'cash' | 'bank_transfer' | 'card' | 'online' | 'other';
export type InstallmentStatus = 'pending' | 'partial' | 'paid' | 'overdue' | 'cancelled';
export type DiscountType = 'fixed' | 'percent';

export interface FeeCategory {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export interface FeeStructure {
  id: number;
  school_id: number;
  category_id: number | null;
  category_name?: string | null;
  name: string;
  description: string | null;
  amount: number | string;
  academic_year: string;
  grade_id: number | null;
  grade_name?: string | null;
  is_mandatory: boolean;
  due_date: string | null;
  assignment_scope: AssignmentScope;
  is_active: boolean;
  created_at?: string;
  deleted_at?: string | null;
}

export interface FeeStructuresListResponse {
  structures: FeeStructure[];
  total: number;
  limit: number;
  skip: number;
}

export interface FeeStructureCreatePayload {
  category_id?: number | null;
  name: string;
  description?: string | null;
  amount: number;
  academic_year: string;
  grade_id?: number | null;
  is_mandatory?: boolean;
  due_date?: string | null;
  assignment_scope?: AssignmentScope;
}

export interface FeeStructureUpdatePayload {
  name?: string;
  description?: string | null;
  amount?: number;
  due_date?: string | null;
  is_mandatory?: boolean;
  is_active?: boolean;
  grade_id?: number | null;
  assignment_scope?: AssignmentScope;
}

export interface StudentFeeAccount {
  id: number;
  school_id: number;
  student_id: number;
  academic_year: string;
  total_fees?: number | string;
  total_paid?: number | string;
  total_discounts?: number | string;
  total_discount?: number | string;
  balance_due?: number | string;
  balance?: number | string;
  overdue_amount?: number | string;
  [key: string]: unknown;
}

export interface StudentFeeItem {
  id: number;
  account_id: number;
  name: string;
  amount?: number | string;
  original_amount?: number | string;
  net_amount?: number | string;
  remaining_amount?: number | string;
  paid_amount?: number | string;
  due_date?: string | null;
  is_mandatory?: boolean;
  [key: string]: unknown;
}

export interface Installment {
  id: number;
  plan_id?: number;
  account_id?: number;
  student_id: number;
  sequence_no?: number;
  amount: number | string;
  paid_amount: number | string;
  due_date: string;
  status: InstallmentStatus | string;
  plan_title?: string | null;
  student_name?: string;
  grade_name?: string;
  classroom_name?: string;
  academic_year?: string;
  remaining?: number | string;
  [key: string]: unknown;
}

export interface Payment {
  id: number;
  student_id: number;
  student_name?: string;
  amount: number | string;
  method: PaymentMethod | string;
  status?: string;
  receipt_number?: string | null;
  reference?: string | null;
  notes?: string | null;
  paid_at?: string;
  recorded_by_name?: string | null;
  academic_year?: string;
  [key: string]: unknown;
}

export interface FeeDiscount {
  id: number;
  name: string;
  discount_type: DiscountType | string;
  value: number | string;
  reason?: string | null;
  [key: string]: unknown;
}

export interface StudentFeeAccountResponse {
  account: StudentFeeAccount;
  items: StudentFeeItem[];
  installments: Installment[];
  payments: Payment[];
  discounts: FeeDiscount[];
}

export interface PaymentsListResponse {
  payments: Payment[];
  total: number;
  limit: number;
  skip: number;
}

export interface OverdueListResponse {
  overdue: Installment[];
  total: number;
  limit: number;
  skip: number;
}

export interface FeesSummaryReport {
  total_fees?: number | string;
  total_paid?: number | string;
  total_outstanding?: number | string;
  total_overdue?: number | string;
  [key: string]: unknown;
}
