export type StudentStatus = 'active' | 'suspended' | 'archived';
export type ParentRelation = 'father' | 'mother' | 'guardian' | 'other';

export interface SchoolStudent {
  id: number;
  school_id: number;
  name: string;
  email: string | null;
  phone: string | null;
  avatar: string | null;
  login_code: string;
  qr_token: string | null;
  qr_issued_at: string | null;
  qr_payload?: string | null;
  is_active: boolean;
  created_at: string;
  deleted_at: string | null;
  national_id: string | null;
  birth_date: string | null;
  gender: string | null;
  address: string | null;
  academic_year: string;
  grade_id: number;
  grade_name: string;
  classroom_id: number;
  classroom_name: string;
  enrollment_date: string | null;
  seat_number: string | null;
  status: StudentStatus;
  notes: string | null;
  profile_updated_at?: string | null;
}

export interface StudentParentLink {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  login_code: string;
  is_active: boolean;
  national_id: string | null;
  secondary_phone: string | null;
  address: string | null;
  notes: string | null;
  relation: ParentRelation;
  is_primary: boolean;
}

export interface ClassroomStudentCount {
  grade_id: number;
  grade_name: string;
  classroom_id: number;
  classroom_name: string;
  students_count: number;
}

export interface StudentsListResponse {
  students: SchoolStudent[];
  total: number;
  limit: number;
  skip: number;
  counts_by_classroom: ClassroomStudentCount[];
}

export interface StudentAccessCodes {
  school_login_code: string;
  student_login_code: string;
  parent_login_code: string;
  parent_created: boolean;
}

export interface StudentParentInput {
  parent_id?: number;
  name?: string;
  phone?: string;
  email?: string;
  national_id?: string | null;
  secondary_phone?: string | null;
  address?: string | null;
  notes?: string | null;
  relation?: ParentRelation;
  is_primary?: boolean;
}

export interface StudentCreatePayload {
  name: string;
  academic_year: string;
  grade_id: number;
  classroom_id: number;
  birth_date?: string | null;
  gender?: string | null;
  phone?: string;
  email?: string;
  national_id?: string | null;
  address?: string | null;
  seat_number?: string | null;
  enrollment_date?: string | null;
  status?: StudentStatus;
  notes?: string | null;
  parent: StudentParentInput;
}

export interface StudentUpdatePayload {
  name?: string;
  national_id?: string | null;
  birth_date?: string | null;
  gender?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  seat_number?: string | null;
  notes?: string | null;
  status?: StudentStatus;
}

export interface StudentTransferPayload {
  grade_id: number;
  classroom_id: number;
  academic_year?: string;
}

export interface StudentCreateResponse {
  message: string;
  student: SchoolStudent;
  parents: StudentParentLink[];
  access: StudentAccessCodes;
  school: { id: number; name: string; login_code: string };
}

export interface StudentDetailResponse {
  student: SchoolStudent;
  parents: StudentParentLink[];
  school: { id: number; name: string; login_code: string };
}
