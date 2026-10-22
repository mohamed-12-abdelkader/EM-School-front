import type { NavGroup } from '@/types';

export const navGroups: NavGroup[] = [
  {
    title: 'الرئيسية',
    items: [
      { label: 'لوحة التحكم', href: '/', icon: 'LayoutDashboard' },
      { label: 'مركز الإشعارات', href: '/notifications', icon: 'Bell' },
      { label: 'التقويم المدرسي', href: '/calendar', icon: 'CalendarDays' },
    ],
  },
  {
    title: 'الإدارة الأكاديمية',
    items: [
      { label: 'إدارة الطلاب', href: '/students', icon: 'GraduationCap' },
      { label: 'الصفوف الدراسية', href: '/grades', icon: 'Layers' },
      { label: 'الفصول والشعب', href: '/classes', icon: 'School' },
      { label: 'المواد الدراسية', href: '/subjects', icon: 'BookOpen' },
      { label: 'إدارة المدرسين', href: '/teachers', icon: 'Users' },
      { label: 'الجدول المدرسي', href: '/timetable', icon: 'CalendarClock' },
      { label: 'المحاضرات والدروس', href: '/lessons', icon: 'Presentation' },
      { label: 'الواجبات والامتحانات', href: '/assignments', icon: 'ClipboardList' },
      { label: 'بنك الأسئلة', href: '/question-bank', icon: 'Library' },
    ],
  },
  {
    title: 'شؤون الطلاب',
    items: [
      { label: 'الحضور والغياب', href: '/attendance', icon: 'ClipboardCheck' },
      { label: 'التأخير والانصراف', href: '/lateness', icon: 'Clock' },
      { label: 'متابعة مستوى الطلاب', href: '/student-progress', icon: 'TrendingUp' },
      { label: 'السلوك والانضباط', href: '/discipline', icon: 'ShieldAlert' },
      { label: 'الأنشطة والمسابقات', href: '/activities', icon: 'Trophy' },
      { label: 'ملفات الطلاب', href: '/student-files', icon: 'FolderOpen' },
      { label: 'القبول والتسجيل', href: '/admissions', icon: 'UserPlus' },
    ],
  },
  {
    title: 'إدارة الموظفين',
    items: [
      { label: 'الموظفون والإداريون', href: '/employees', icon: 'Briefcase' },
      { label: 'حضور الموظفين', href: '/employee-attendance', icon: 'UserCheck' },
      { label: 'الإجازات والأذونات', href: '/leaves', icon: 'Palmtree' },
      { label: 'العقود والبيانات', href: '/contracts', icon: 'FileText' },
    ],
  },
  {
    title: 'المالية والحسابات',
    items: [
      { label: 'لوحة المالية', href: '/finance', icon: 'Wallet' },
      { label: 'المصروفات الدراسية', href: '/tuition', icon: 'Banknote' },
      { label: 'الأقساط والمدفوعات', href: '/installments', icon: 'Receipt' },
      { label: 'المتأخرات والمستحقات', href: '/overdue', icon: 'AlertCircle' },
      { label: 'المصروفات التشغيلية', href: '/expenses', icon: 'ArrowDownCircle' },
      { label: 'الرواتب والمكافآت', href: '/payroll', icon: 'HandCoins' },
      { label: 'الخزينة والحسابات', href: '/accounts', icon: 'Landmark' },
      { label: 'الخصومات والمنح', href: '/discounts', icon: 'BadgePercent' },
      { label: 'التقارير المالية', href: '/reports/finance', icon: 'PieChart' },
    ],
  },
  {
    title: 'التواصل وخدمة العملاء',
    items: [
      { label: 'أولياء الأمور', href: '/parents', icon: 'Contact' },
      { label: 'رسائل أولياء الأمور', href: '/parent-messages', icon: 'MessageSquare' },
      { label: 'الشكاوى والاقتراحات', href: '/complaints', icon: 'MessageCircleWarning' },
      { label: 'طلبات الدعم', href: '/support', icon: 'LifeBuoy' },
      { label: 'المراسلات المدرسية', href: '/correspondence', icon: 'Mails' },
    ],
  },
  {
    title: 'التقارير والتحليلات',
    items: [
      { label: 'مركز التقارير', href: '/reports', icon: 'BarChart3' },
      { label: 'التقارير الأكاديمية', href: '/reports/academic', icon: 'FileBarChart' },
      { label: 'تقارير الحضور', href: '/reports/attendance', icon: 'CalendarCheck' },
      { label: 'تحليلات الأداء', href: '/analytics', icon: 'LineChart' },
      { label: 'تقارير أداء المدرسة', href: '/reports/school', icon: 'Building2' },
    ],
  },
  {
    title: 'الذكاء الاصطناعي',
    items: [
      { label: 'المساعد العلمي الذكي', href: '/ai', icon: 'Bot' },
      { label: 'إدارة الشات بوت', href: '/ai/chatbot', icon: 'MessagesSquare' },
      { label: 'تحليلات مستوى الطلاب', href: '/ai/insights', icon: 'Sparkles' },
      { label: 'إنشاء الامتحانات بالذكاء', href: '/ai/exams', icon: 'Wand2' },
      { label: 'المساعد الإداري الذكي', href: '/ai/admin', icon: 'Brain' },
    ],
  },
  {
    title: 'وحدات إضافية',
    items: [
      { label: 'النقل المدرسي', href: '/buses', icon: 'Bus' },
      { label: 'المكتبة', href: '/library', icon: 'BookMarked' },
      { label: 'الأصول والمخزون', href: '/inventory', icon: 'Boxes' },
    ],
  },
  {
    title: 'إعدادات النظام',
    items: [
      { label: 'إعدادات المدرسة', href: '/settings', icon: 'Settings' },
      { label: 'العام الدراسي', href: '/settings/academic-year', icon: 'CalendarRange' },
      { label: 'المستخدمون والصلاحيات', href: '/settings/users', icon: 'UserCog' },
      { label: 'الأدوار الإدارية', href: '/settings/roles', icon: 'KeyRound' },
      { label: 'سجل النشاطات', href: '/settings/audit', icon: 'ScrollText' },
      { label: 'إعدادات الإشعارات', href: '/settings/notifications', icon: 'BellRing' },
      { label: 'الهوية البصرية', href: '/settings/branding', icon: 'Palette' },
    ],
  },
];

export const academicYears = ['2025 / 2026', '2024 / 2025', '2023 / 2024'];
export const schoolName = 'مدارس EM الخاصة';
export const currentUser = {
  name: 'أ. سارة محمود',
  role: 'مديرة المدرسة',
  email: 'sara@emschool.edu.eg',
};
