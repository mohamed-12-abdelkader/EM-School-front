export interface TeacherClass {
  classroom_id: number;
  classroom_name: string;
  grade_id: number;
  grade_name: string;
  subject_id: number;
  subject_name: string;
  weekly_slots: number;
  students_count: number;
}

export interface TeacherDashboardData {
  teacher: {
    id: number;
    name: string | null;
    email: string | null;
    school_id: number;
  };
  school: { id: number; name: string } | null;
  stats: {
    classes: number;
    lessons: number;
    exams: number;
    tasks: number;
  };
}

export interface TeacherLesson {
  id: number;
  classroom_id: number;
  subject_id: number;
  title: string;
  description: string | null;
  classroom_name?: string;
  grade_name?: string;
  subject_name?: string;
  attachments_count?: number;
  created_at: string;
}

export interface TeacherAttachment {
  id: number;
  lesson_id?: number;
  task_id?: number;
  kind: 'video' | 'pdf';
  title: string;
  file_url: string;
  filename: string | null;
  created_at: string;
}

export type ExamQuestionType = 'mcq' | 'written';
export type ExamStatus = 'draft' | 'published' | 'closed';

export interface TeacherExamChoice {
  id?: number;
  text: string;
  is_correct: boolean;
  position?: number;
}

export interface TeacherExamQuestion {
  id?: number;
  type: ExamQuestionType;
  text: string;
  points: number;
  model_answer?: string | null;
  choices?: TeacherExamChoice[];
}

export interface TeacherExam {
  id: number;
  classroom_id: number;
  subject_id: number;
  title: string;
  description: string | null;
  status: ExamStatus;
  duration_minutes: number | null;
  total_points: number | string;
  classroom_name?: string;
  grade_name?: string;
  subject_name?: string;
  questions_count?: number;
  created_at: string;
}

export interface TeacherTask {
  id: number;
  classroom_id: number;
  subject_id: number;
  title: string;
  description: string | null;
  max_grade: number | string;
  due_at: string | null;
  classroom_name?: string;
  grade_name?: string;
  subject_name?: string;
  graded_count?: number;
  students_count?: number;
  created_at: string;
}

export interface TeacherTaskStudent {
  student_id: number;
  student_name: string;
  grade_id: number | null;
  grade: number | string | null;
  review: string | null;
  graded_at: string | null;
}
