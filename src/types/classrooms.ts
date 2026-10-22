export interface SchoolClassroom {
  id: number;
  school_id: number;
  grade_id: number;
  grade_name: string;
  name: string;
  description: string | null;
  capacity: number | null;
  is_active: boolean;
  position: number;
  created_at: string;
  deleted_at: string | null;
}

export interface ClassroomsListResponse {
  classrooms: SchoolClassroom[];
  total: number;
  limit: number;
  skip: number;
}

export interface ClassroomPayload {
  grade_id: number;
  name: string;
  description?: string;
  capacity?: number | null;
  position?: number;
  is_active?: boolean;
}

export interface ClassroomUpdatePayload {
  grade_id?: number;
  name?: string;
  description?: string | null;
  capacity?: number | null;
  position?: number;
  is_active?: boolean;
}
