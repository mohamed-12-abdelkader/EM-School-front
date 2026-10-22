export type TimetableStatus = 'draft' | 'published';
export type SlotType = 'lesson' | 'break' | 'activity' | 'reserve';

export interface TimetableSettings {
  school_id: number;
  working_days: number[];
  periods_per_day: number;
  default_period_minutes: number;
  day_start_time: string;
  day_end_time: string;
  allow_teacher_conflicts: boolean;
  updated_at?: string;
}

export interface PeriodTemplate {
  id?: number;
  school_id?: number;
  day_of_week: number | null;
  period_number: number;
  start_time: string;
  end_time: string;
  label: string | null;
  slot_type: SlotType;
}

export interface TimetableListItem {
  id: number;
  school_id: number;
  classroom_id: number;
  classroom_name: string;
  grade_id: number;
  grade_name: string;
  academic_year: string;
  term: string;
  title: string | null;
  status: TimetableStatus;
  published_at: string | null;
  last_published_at: string | null;
  created_at: string;
  updated_at: string;
  slots_count: number;
}

export interface TimetableDetail extends Omit<TimetableListItem, 'slots_count'> {}

export interface TimetableSlot {
  id: number;
  timetable_id: number;
  day_of_week: number;
  period_number: number;
  start_time: string;
  end_time: string;
  slot_type: SlotType;
  subject_id: number | null;
  subject_name: string | null;
  subject_code: string | null;
  teacher_id: number | null;
  teacher_name: string | null;
  teacher_email: string | null;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface TimetableSlotInput {
  id?: number;
  day_of_week: number;
  period_number: number;
  start_time: string;
  end_time: string;
  slot_type: SlotType;
  subject_id?: number | null;
  teacher_id?: number | null;
  notes?: string | null;
}

export interface TimetableConflict {
  code: string;
  message?: string;
  [key: string]: unknown;
}

export interface TimetablesListResponse {
  timetables: TimetableListItem[];
  total: number;
  limit: number;
  skip: number;
}

export interface TimetableDetailResponse {
  timetable: TimetableDetail;
  slots: TimetableSlot[];
  settings: TimetableSettings;
}

export interface SettingsResponse {
  settings: TimetableSettings;
  period_templates: PeriodTemplate[];
}

export interface ClassroomSubjectOption {
  id: number;
  name: string;
  code: string | null;
  description?: string | null;
}

export interface SubjectTeacherOption {
  id: number;
  name: string;
  email: string;
}
