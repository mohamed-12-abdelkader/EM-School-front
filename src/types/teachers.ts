export interface SchoolTeacher {
  id: number;
  school_id: number;
  name: string;
  email: string;
  is_active: boolean;
  created_at: string;
  deleted_at: string | null;
  subject_id: number;
  subject_name: string;
  subject_code: string | null;
}

export interface TeachersListResponse {
  teachers: SchoolTeacher[];
  total: number;
  limit: number;
  skip: number;
}

export interface TeacherCreatePayload {
  name: string;
  email: string;
  password: string;
  confirm_password: string;
  subject_id: number;
}

export interface TeacherUpdatePayload {
  name?: string;
  email?: string;
  subject_id?: number;
  password?: string;
  confirm_password?: string;
  is_active?: boolean;
}
