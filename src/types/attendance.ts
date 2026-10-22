export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';
export type CheckInMethod = 'qr' | 'manual';

export interface AttendanceRecord {
  id: number;
  school_id: number;
  student_id: number;
  attendance_date: string;
  status: AttendanceStatus;
  check_in_time: string | null;
  check_in_method: CheckInMethod | null;
  absence_reason: string | null;
  notes: string | null;
  excuse_approved: boolean | null;
  recorded_by: number | null;
  updated_by: number | null;
  edit_reason: string | null;
  created_at: string;
  updated_at: string;
  student_name?: string;
  grade_id?: number;
  grade_name?: string;
  classroom_id?: number;
  classroom_name?: string;
}

export interface AttendanceListResponse {
  records: AttendanceRecord[];
  total: number;
  limit: number;
  skip: number;
}

export interface UnrecordedStudent {
  id: number;
  name: string;
  login_code: string;
  grade_id: number;
  grade_name: string;
  classroom_id: number;
  classroom_name: string;
}

export interface DailyAttendanceSummary {
  date: string;
  total_students: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  not_recorded: number;
  recorded: number;
  attendance_rate: number;
  attendance_rate_basis: string;
}

export interface ManualAttendancePayload {
  student_id: number;
  date?: string;
  status: AttendanceStatus;
  absence_reason?: string | null;
  notes?: string | null;
  excuse_approved?: boolean | null;
  edit_reason?: string | null;
}

export interface BulkAttendanceItem {
  student_id: number;
  status: AttendanceStatus;
  absence_reason?: string | null;
  notes?: string | null;
  excuse_approved?: boolean | null;
}

export interface BulkAttendancePayload {
  date?: string;
  grade_id?: number;
  classroom_id?: number;
  items: BulkAttendanceItem[];
}

export interface BulkAttendanceResult {
  student_id: number;
  success: boolean;
  created?: boolean;
  attendance?: AttendanceRecord;
  error?: string;
}

export interface BulkAttendanceResponse {
  message: string;
  date: string;
  total: number;
  success_count: number;
  failed_count: number;
  results: BulkAttendanceResult[];
}

export interface QrCheckInResponse {
  message: string;
  already_recorded: boolean;
  created: boolean;
  student: {
    id: number;
    name: string;
    grade_id: number;
    grade_name: string;
    classroom_id: number;
    classroom_name: string;
  };
  attendance: AttendanceRecord;
}
