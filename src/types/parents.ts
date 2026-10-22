export interface SchoolParent {
  id: number;
  school_id: number;
  name: string;
  email: string | null;
  phone: string | null;
  login_code: string;
  is_active: boolean;
  created_at: string;
  deleted_at: string | null;
  national_id: string | null;
  secondary_phone: string | null;
  address: string | null;
  notes: string | null;
  students_count: number;
  profile_updated_at?: string | null;
}

export interface ParentsListResponse {
  parents: SchoolParent[];
  total: number;
  limit: number;
  skip: number;
}
