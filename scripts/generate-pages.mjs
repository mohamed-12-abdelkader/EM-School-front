import fs from 'fs';
import path from 'path';

const root = path.join('d:', 'EM School', 'app', '(dashboard)');

const pages = [
  { file: 'notifications.tsx', title: 'مركز الإشعارات', group: 'الرئيسية', subtitle: 'إدارة التنبيهات والتنبيهات العاجلة للمدرسة', type: 'notifications' },
  { file: 'calendar.tsx', title: 'التقويم المدرسي', group: 'الرئيسية', subtitle: 'مواعيد الامتحانات والاجتماعات والاستحقاقات', type: 'calendar' },
  { file: 'grades.tsx', title: 'الصفوف الدراسية', group: 'الإدارة الأكاديمية', subtitle: 'إدارة الصفوف والطاقة الاستيعابية والترقية', type: 'grades' },
  { file: 'classes.tsx', title: 'الفصول والشعب', group: 'الإدارة الأكاديمية', subtitle: 'توزيع الطلاب والمشرفين والقاعات', type: 'classes' },
  { file: 'subjects.tsx', title: 'المواد الدراسية', group: 'الإدارة الأكاديمية', subtitle: 'ربط المواد بالمراحل والمدرسين', type: 'subjects' },
  { file: 'teachers.tsx', title: 'إدارة المدرسين', group: 'الإدارة الأكاديمية', subtitle: 'دليل المدرسين والجداول والأداء', type: 'teachers' },
  { file: 'timetable.tsx', title: 'الجدول المدرسي', group: 'الإدارة الأكاديمية', subtitle: 'عرض أسبوعي مع تنبيهات التعارض', type: 'timetable' },
  { file: 'lessons.tsx', title: 'المحاضرات والدروس', group: 'الإدارة الأكاديمية', subtitle: 'تخطيط الدروس والمرفقات التعليمية', type: 'lessons' },
  { file: 'assignments.tsx', title: 'الواجبات والامتحانات', group: 'الإدارة الأكاديمية', subtitle: 'متابعة التسليمات والتصحيح', type: 'assignments' },
  { file: 'question-bank.tsx', title: 'بنك الأسئلة', group: 'الإدارة الأكاديمية', subtitle: 'تصنيف الأسئلة حسب المادة والصعوبة', type: 'questions' },
  { file: 'attendance.tsx', title: 'الحضور والغياب', group: 'شؤون الطلاب', subtitle: 'تسجيل يومي سريع حسب الفصل', type: 'attendance' },
  { file: 'lateness.tsx', title: 'التأخير والانصراف', group: 'شؤون الطلاب', subtitle: 'متابعة التأخير والانصراف المبكر', type: 'generic', entity: 'سجلات التأخير' },
  { file: 'student-progress.tsx', title: 'متابعة مستوى الطلاب', group: 'شؤون الطلاب', subtitle: 'مؤشرات الأداء المبكر للطلاب', type: 'generic', entity: 'مؤشرات التقدم' },
  { file: 'discipline.tsx', title: 'السلوك والانضباط', group: 'شؤون الطلاب', subtitle: 'الحوادث الإيجابية والإجراءات التأديبية', type: 'generic', entity: 'سجلات السلوك' },
  { file: 'activities.tsx', title: 'الأنشطة والمسابقات', group: 'شؤون الطلاب', subtitle: 'إدارة الأنشطة الطلابية والمسابقات', type: 'generic', entity: 'الأنشطة' },
  { file: 'student-files.tsx', title: 'ملفات الطلاب', group: 'شؤون الطلاب', subtitle: 'المستندات والمرفقات الرسمية', type: 'generic', entity: 'الملفات' },
  { file: 'admissions.tsx', title: 'القبول والتسجيل', group: 'شؤون الطلاب', subtitle: 'طلبات الالتحاق ومراحل الاعتماد', type: 'generic', entity: 'طلبات القبول' },
  { file: 'employees.tsx', title: 'الموظفون والإداريون', group: 'إدارة الموظفين', subtitle: 'دليل الموظفين والعقود والأقسام', type: 'employees' },
  { file: 'employee-attendance.tsx', title: 'حضور الموظفين', group: 'إدارة الموظفين', subtitle: 'تسجيل الحضور والانصراف الإداري', type: 'generic', entity: 'حضور الموظفين' },
  { file: 'leaves.tsx', title: 'الإجازات والأذونات', group: 'إدارة الموظفين', subtitle: 'طلبات الإجازة وسير الاعتماد', type: 'generic', entity: 'طلبات الإجازة' },
  { file: 'contracts.tsx', title: 'العقود والبيانات', group: 'إدارة الموظفين', subtitle: 'العقود والملفات الوظيفية', type: 'generic', entity: 'العقود' },
  { file: 'finance.tsx', title: 'لوحة المالية', group: 'المالية والحسابات', subtitle: 'ملخص الإيرادات والمصروفات والتحصيل', type: 'finance' },
  { file: 'tuition.tsx', title: 'المصروفات الدراسية', group: 'المالية والحسابات', subtitle: 'تعريف الرسوم حسب الصف والعام', type: 'generic', entity: 'خطط الرسوم' },
  { file: 'installments.tsx', title: 'الأقساط والمدفوعات', group: 'المالية والحسابات', subtitle: 'تسجيل الدفعات ومتابعة الأقساط', type: 'installments' },
  { file: 'overdue.tsx', title: 'المتأخرات والمستحقات', group: 'المالية والحسابات', subtitle: 'قوائم المتابعة للأقساط المتأخرة', type: 'overdue' },
  { file: 'expenses.tsx', title: 'المصروفات التشغيلية', group: 'المالية والحسابات', subtitle: 'تسجيل وتصنيف مصروفات التشغيل', type: 'generic', entity: 'المصروفات' },
  { file: 'payroll.tsx', title: 'الرواتب والمكافآت', group: 'المالية والحسابات', subtitle: 'مسير الرواتب الشهري والاعتماد', type: 'payroll' },
  { file: 'accounts.tsx', title: 'الخزينة والحسابات', group: 'المالية والحسابات', subtitle: 'الحسابات النقدية والتحركات', type: 'generic', entity: 'الحسابات' },
  { file: 'discounts.tsx', title: 'الخصومات والمنح', group: 'المالية والحسابات', subtitle: 'المنح والإعفاءات والحالات الخاصة', type: 'generic', entity: 'الخصومات' },
  { file: 'parents.tsx', title: 'أولياء الأمور', group: 'التواصل وخدمة العملاء', subtitle: 'دليل أولياء الأمور والأبناء المرتبطين', type: 'parents' },
  { file: 'parent-messages.tsx', title: 'رسائل أولياء الأمور', group: 'التواصل وخدمة العملاء', subtitle: 'قوالب المراسلة وحالة التسليم', type: 'messages' },
  { file: 'complaints.tsx', title: 'الشكاوى والاقتراحات', group: 'التواصل وخدمة العملاء', subtitle: 'صندوق الوارد وسير المعالجة', type: 'complaints' },
  { file: 'support.tsx', title: 'طلبات الدعم', group: 'التواصل وخدمة العملاء', subtitle: 'تذاكر الدعم الداخلي', type: 'generic', entity: 'تذاكر الدعم' },
  { file: 'correspondence.tsx', title: 'المراسلات المدرسية', group: 'التواصل وخدمة العملاء', subtitle: 'الخطابات والمراسلات الرسمية', type: 'generic', entity: 'المراسلات' },
  { file: 'reports.tsx', title: 'مركز التقارير', group: 'التقارير والتحليلات', subtitle: 'تقارير مصنفة جاهزة للتصفية والتصدير', type: 'reports' },
  { file: 'reports/finance.tsx', title: 'التقارير المالية', group: 'التقارير والتحليلات', subtitle: 'تحصيل، مصروفات، وأرصدة', type: 'reports' },
  { file: 'reports/academic.tsx', title: 'التقارير الأكاديمية', group: 'التقارير والتحليلات', subtitle: 'الأداء والنتائج حسب الصف والمادة', type: 'reports' },
  { file: 'reports/attendance.tsx', title: 'تقارير الحضور', group: 'التقارير والتحليلات', subtitle: 'حضور الطلاب والموظفين', type: 'reports' },
  { file: 'reports/school.tsx', title: 'تقارير أداء المدرسة', group: 'التقارير والتحليلات', subtitle: 'مؤشرات تشغيلية شاملة', type: 'reports' },
  { file: 'analytics.tsx', title: 'تحليلات الأداء', group: 'التقارير والتحليلات', subtitle: 'اكتشاف الطلاب المعرضين للتعثر مبكراً', type: 'analytics' },
  { file: 'ai/index.tsx', title: 'المساعد العلمي الذكي', group: 'الذكاء الاصطناعي', subtitle: 'نظرة عامة على استخدام المساعد التعليمي', type: 'ai' },
  { file: 'ai/chatbot.tsx', title: 'إدارة الشات بوت', group: 'الذكاء الاصطناعي', subtitle: 'المحادثات وقاعدة المعرفة والتصعيد', type: 'ai' },
  { file: 'ai/insights.tsx', title: 'تحليلات مستوى الطلاب', group: 'الذكاء الاصطناعي', subtitle: 'رؤى مدعومة بالذكاء الاصطناعي', type: 'analytics' },
  { file: 'ai/exams.tsx', title: 'إنشاء الامتحانات بالذكاء', group: 'الذكاء الاصطناعي', subtitle: 'توليد أسئلة وامتحانات بمساعدة AI', type: 'ai' },
  { file: 'ai/admin.tsx', title: 'المساعد الإداري الذكي', group: 'الذكاء الاصطناعي', subtitle: 'اقتراحات تشغيلية للإدارة', type: 'ai' },
  { file: 'buses.tsx', title: 'النقل المدرسي', group: 'وحدات إضافية', subtitle: 'الحافلات والمسارات وتوزيع الطلاب', type: 'generic', entity: 'الحافلات' },
  { file: 'library.tsx', title: 'المكتبة', group: 'وحدات إضافية', subtitle: 'الكتب والإعارة والمتأخرات', type: 'generic', entity: 'الكتب' },
  { file: 'inventory.tsx', title: 'الأصول والمخزون', group: 'وحدات إضافية', subtitle: 'الأصول والصيانة وحركة المخزون', type: 'generic', entity: 'الأصول' },
  { file: 'settings/index.tsx', title: 'إعدادات المدرسة', group: 'إعدادات النظام', subtitle: 'البيانات الأساسية وقواعد التشغيل', type: 'settings' },
  { file: 'settings/academic-year.tsx', title: 'العام الدراسي', group: 'إعدادات النظام', subtitle: 'الأعوام والفصول الدراسية', type: 'settings' },
  { file: 'settings/users.tsx', title: 'المستخدمون والصلاحيات', group: 'إعدادات النظام', subtitle: 'حسابات المستخدمين وصلاحيات الوصول', type: 'settings' },
  { file: 'settings/roles.tsx', title: 'الأدوار الإدارية', group: 'إعدادات النظام', subtitle: 'أدوار مثل المدير والمحاسب والمسجل', type: 'settings' },
  { file: 'settings/audit.tsx', title: 'سجل النشاطات', group: 'إعدادات النظام', subtitle: 'تتبع العمليات الحساسة والتعديلات', type: 'settings' },
  { file: 'settings/notifications.tsx', title: 'إعدادات الإشعارات', group: 'إعدادات النظام', subtitle: 'تفضيلات القنوات والتنبيهات', type: 'settings' },
  { file: 'settings/branding.tsx', title: 'الهوية البصرية', group: 'إعدادات النظام', subtitle: 'الشعار والألوان والواجهة', type: 'settings' },
];

for (const p of pages) {
  const entityProp = p.entity ? `\n      entity="${p.entity}"` : '';
  const content = `import { ModuleListPage } from '@/components/modules/ModuleListPage';

export default function Page() {
  return (
    <ModuleListPage
      title="${p.title}"
      subtitle="${p.subtitle}"
      group="${p.group}"
      type="${p.type}"${entityProp}
    />
  );
}
`;
  const full = path.join(root, p.file);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, 'utf8');
  console.log('wrote', p.file);
}

console.log('done', pages.length);
