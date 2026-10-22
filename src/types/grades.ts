export interface SchoolGrade {
  id: number;
  school_id: number;
  name: string;
  description: string | null;
  is_active: boolean;
  position: number;
  created_at: string;
  deleted_at: string | null;
}

export interface GradesListResponse {
  grades: SchoolGrade[];
  total: number;
  limit: number;
  skip: number;
}

export interface GradePayload {
  name: string;
  description?: string;
  position?: number;
  is_active?: boolean;
}

export interface GradeUpdatePayload {
  name?: string;
  description?: string | null;
  position?: number;
  is_active?: boolean;
}
