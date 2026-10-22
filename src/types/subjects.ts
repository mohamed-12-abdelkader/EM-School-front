export interface SubjectGradeRef {
  id: number;
  name: string;
}

export interface SchoolSubject {
  id: number;
  school_id: number;
  name: string;
  code: string | null;
  description: string | null;
  is_active: boolean;
  position: number;
  created_at: string;
  deleted_at: string | null;
  grades: SubjectGradeRef[];
}

export interface SubjectsListResponse {
  subjects: SchoolSubject[];
  total: number;
  limit: number;
  skip: number;
}

export interface SubjectPayload {
  name: string;
  code?: string;
  description?: string;
  grade_ids?: number[];
  position?: number;
  is_active?: boolean;
}

export interface SubjectUpdatePayload {
  name?: string;
  code?: string | null;
  description?: string | null;
  grade_ids?: number[];
  position?: number;
  is_active?: boolean;
}
