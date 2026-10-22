export type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary' | 'secondary';

export type EnrollmentStatus = 'نشط' | 'موقوف' | 'متخرج' | 'منسحب';
export type Gender = 'ذكر' | 'أنثى';
export type AttendanceMark = 'حاضر' | 'غائب' | 'متأخر' | 'بعذر';
export type PaymentStatus = 'مدفوع' | 'جزئي' | 'متأخر' | 'معلق';
export type ComplaintStatus = 'جديد' | 'قيد المراجعة' | 'جارٍ المعالجة' | 'تم الحل' | 'مغلق';
export type Priority = 'منخفض' | 'متوسط' | 'عالي' | 'عاجل';

export interface Student {
  id: string;
  code: string;
  name: string;
  grade: string;
  className: string;
  gender: Gender;
  nationalId: string;
  guardianName: string;
  guardianPhone: string;
  enrollmentStatus: EnrollmentStatus;
  attendanceToday: AttendanceMark;
  outstandingBalance: number;
  gpa: number;
  avatarColor: string;
}

export interface Teacher {
  id: string;
  code: string;
  name: string;
  subjects: string[];
  grades: string[];
  phone: string;
  email: string;
  status: 'نشط' | 'إجازة' | 'موقوف';
  experienceYears: number;
  salary: number;
  rating: number;
}

export interface Employee {
  id: string;
  code: string;
  name: string;
  title: string;
  department: string;
  phone: string;
  status: 'نشط' | 'إجازة' | 'منتهي';
  joinDate: string;
  salary: number;
}

export interface Parent {
  id: string;
  name: string;
  phone: string;
  email: string;
  children: string[];
  balance: number;
  lastContact: string;
}

export interface Complaint {
  id: string;
  title: string;
  category: string;
  priority: Priority;
  status: ComplaintStatus;
  parentName: string;
  studentName?: string;
  assignee: string;
  createdAt: string;
  updatedAt: string;
}

export interface NavItem {
  label: string;
  href: string;
  icon: string;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

export interface MetricCardData {
  id: string;
  label: string;
  value: string;
  delta: string;
  trend: 'up' | 'down' | 'neutral';
  icon: string;
  accent?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
}

export interface TableColumn<T> {
  key: string;
  label: string;
  width?: number | string;
  render?: (row: T) => import('react').ReactNode;
  sortable?: boolean;
}
