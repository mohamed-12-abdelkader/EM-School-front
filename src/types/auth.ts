export type UserRole = 'admin' | 'school_admin' | 'student' | 'parent' | 'teacher';

export interface AuthUser {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  role: UserRole;
  school_id: number | null;
  login_code?: string | null;
  avatar?: string | null;
}

export interface LoginResponse {
  user: AuthUser;
  token: string;
}

export interface StudentLoginSchool {
  id: number;
  name: string;
  login_code: string;
}

export interface StudentLoginProfile {
  status: string;
  academic_year: string;
  grade_id: number | null;
  grade_name: string | null;
  classroom_id: number | null;
  classroom_name: string | null;
  seat_number?: string | null;
}

export interface StudentLoginResponse {
  user: AuthUser;
  school: StudentLoginSchool;
  profile: StudentLoginProfile;
  token: string;
}

export interface School {
  id: number;
  name: string;
  logo: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
  deleted_at: string | null;
  admin_user_id: number;
  email: string;
}

export interface SchoolsListResponse {
  schools: School[];
  total: number;
  limit: number;
  skip: number;
}
