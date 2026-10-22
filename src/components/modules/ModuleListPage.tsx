import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ModulePage, SectionTitle } from '@/components/modules/ModulePage';
import { Badge, Button, DataTable, FilterBar, statusTone, useToast } from '@/components/ui';
import {
  classes,
  complaints,
  employees,
  grades,
  installments,
  notifications,
  overduePayments,
  parents,
  payrollRows,
  subjects,
  teachers,
  upcomingEvents,
} from '@/data/mock';
import { colors, fonts, spacing } from '@/theme/tokens';
import { formatCurrency } from '@/utils/format';

export type ModuleType =
  | 'grades'
  | 'classes'
  | 'subjects'
  | 'teachers'
  | 'employees'
  | 'parents'
  | 'complaints'
  | 'installments'
  | 'overdue'
  | 'payroll'
  | 'notifications'
  | 'calendar'
  | 'attendance'
  | 'timetable'
  | 'ai'
  | 'finance'
  | 'reports'
  | 'analytics'
  | 'settings'
  | 'messages'
  | 'lessons'
  | 'assignments'
  | 'questions'
  | 'generic';

interface ModuleListPageProps {
  title: string;
  subtitle: string;
  group: string;
  type: ModuleType;
  entity?: string;
}

export function ModuleListPage({ title, subtitle, group, type, entity }: ModuleListPageProps) {
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('الكل');
  const label = entity ?? title;
  const rows = useMemo(() => buildRows(type, label, search, filter), [type, label, search, filter]);

  return (
    <ModulePage
      title={title}
      subtitle={subtitle}
      breadcrumbs={[group, title]}
      metrics={buildMetrics(type)}
      primaryAction={{
        label: 'إضافة',
        icon: 'Plus',
        onPress: () => showToast('تم فتح نموذج الإضافة (واجهة تجريبية بدون حفظ خلفي)', 'info'),
      }}
      secondaryAction={{
        label: 'تصدير',
        icon: 'Download',
        onPress: () => showToast('تم تجهيز التصدير محلياً للعرض', 'success'),
      }}
    >
      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={`بحث في ${label}...`}
        filters={[
          {
            key: 'f',
            label: 'تصفية',
            value: filter,
            onChange: setFilter,
            options: [
              { label: 'الكل', value: 'الكل' },
              { label: 'نشط', value: 'نشط' },
              { label: 'يحتاج متابعة', value: 'متابعة' },
            ],
          },
        ]}
      />

      <SectionTitle title={label} hint={`${rows.length} عنصر`} />
      <DataTable
        data={rows}
        columns={buildColumns(type)}
        onRowPress={() => showToast('تم فتح تفاصيل السجل في وضع العرض', 'info')}
      />

      <View style={styles.footer}>
        <Text style={styles.hint}>جميع الإجراءات هنا واجهة أمامية ببيانات تجريبية واقعية.</Text>
        <Button
          label="تحديث البيانات"
          variant="outline"
          size="sm"
          onPress={() => showToast('تم تحديث العرض', 'success')}
        />
      </View>
    </ModulePage>
  );
}

function buildMetrics(type: ModuleType) {
  if (type === 'finance' || type === 'installments' || type === 'overdue' || type === 'payroll') {
    return [
      {
        id: '1',
        label: 'المحصل',
        value: '٢٫٨٤ م',
        delta: '٧٨٪ من المستهدف',
        trend: 'up' as const,
        icon: 'Banknote',
        accent: 'success' as const,
      },
      {
        id: '2',
        label: 'المتأخر',
        value: '٤١٨ ألف',
        delta: '٦٣ حالة',
        trend: 'down' as const,
        icon: 'AlertCircle',
        accent: 'danger' as const,
      },
      {
        id: '3',
        label: 'اليوم',
        value: '٤٢ ألف',
        delta: 'تحصيل اليوم',
        trend: 'up' as const,
        icon: 'Wallet',
        accent: 'primary' as const,
      },
    ];
  }
  if (type === 'ai') {
    return [
      {
        id: '1',
        label: 'المحادثات',
        value: '٣٬٢٤٠',
        delta: '+١٢٪',
        trend: 'up' as const,
        icon: 'MessagesSquare',
        accent: 'primary' as const,
      },
      {
        id: '2',
        label: 'بدون إجابة',
        value: '٢٧',
        delta: 'تحتاج مراجعة',
        trend: 'down' as const,
        icon: 'AlertCircle',
        accent: 'warning' as const,
      },
      {
        id: '3',
        label: 'رضا الطلاب',
        value: '٤٫٦',
        delta: 'من ٥',
        trend: 'up' as const,
        icon: 'Sparkles',
        accent: 'secondary' as const,
      },
    ];
  }
  return [
    {
      id: '1',
      label: 'إجمالي السجلات',
      value: '١٢٨',
      delta: 'هذا الأسبوع',
      trend: 'up' as const,
      icon: 'BarChart3',
      accent: 'primary' as const,
    },
    {
      id: '2',
      label: 'يحتاج متابعة',
      value: '١٨',
      delta: 'حالات مفتوحة',
      trend: 'down' as const,
      icon: 'AlertCircle',
      accent: 'secondary' as const,
    },
    {
      id: '3',
      label: 'مكتمل / معتمد',
      value: '٧٤٪',
      delta: 'معدل الإنجاز',
      trend: 'up' as const,
      icon: 'Check',
      accent: 'success' as const,
    },
  ];
}

type Row = { id: string; c1: string; c2: string; c3: string; c4: string; c5: string };

function buildRows(type: ModuleType, entity: string, search: string, filter: string): Row[] {
  const q = search.trim();
  let data: Row[] = [];

  if (type === 'grades') {
    data = grades.map((g) => ({
      id: g.id,
      c1: g.name,
      c2: String(g.sections),
      c3: `${g.students}/${g.capacity}`,
      c4: `${Math.round((g.students / g.capacity) * 100)}%`,
      c5: 'نشط',
    }));
  } else if (type === 'classes') {
    data = classes.map((c) => ({
      id: c.id,
      c1: c.name,
      c2: c.supervisor,
      c3: `${c.students}/${c.capacity}`,
      c4: c.room,
      c5: 'نشط',
    }));
  } else if (type === 'subjects') {
    data = subjects.map((s) => ({
      id: s.id,
      c1: s.name,
      c2: s.grades,
      c3: String(s.weekly),
      c4: String(s.teachers),
      c5: 'نشط',
    }));
  } else if (type === 'teachers') {
    data = teachers.map((t) => ({
      id: t.id,
      c1: t.name,
      c2: t.subjects.join('، '),
      c3: t.grades.join('، '),
      c4: t.phone,
      c5: t.status,
    }));
  } else if (type === 'employees') {
    data = employees.map((e) => ({
      id: e.id,
      c1: e.name,
      c2: e.title,
      c3: e.department,
      c4: formatCurrency(e.salary),
      c5: e.status,
    }));
  } else if (type === 'parents') {
    data = parents.map((p) => ({
      id: p.id,
      c1: p.name,
      c2: p.phone,
      c3: p.children.join('، '),
      c4: p.balance ? formatCurrency(p.balance) : 'مسدد',
      c5: p.balance ? 'متابعة' : 'نشط',
    }));
  } else if (type === 'complaints') {
    data = complaints.map((c) => ({
      id: c.id,
      c1: c.title,
      c2: c.category,
      c3: c.priority,
      c4: c.assignee,
      c5: c.status,
    }));
  } else if (type === 'installments') {
    data = installments.map((i) => ({
      id: i.id,
      c1: i.student,
      c2: i.grade,
      c3: formatCurrency(i.amount),
      c4: i.dueDate,
      c5: i.status,
    }));
  } else if (type === 'overdue') {
    data = overduePayments.map((o) => ({
      id: o.id,
      c1: o.student,
      c2: formatCurrency(o.amount),
      c3: o.due,
      c4: 'متابعة مالية',
      c5: 'متأخر',
    }));
  } else if (type === 'payroll') {
    data = payrollRows.map((p) => ({
      id: p.id,
      c1: p.name,
      c2: p.role,
      c3: formatCurrency(p.base),
      c4: formatCurrency(p.net),
      c5: p.status,
    }));
  } else if (type === 'notifications') {
    data = notifications.map((n) => ({
      id: n.id,
      c1: n.title,
      c2: n.category,
      c3: n.body,
      c4: n.time,
      c5: n.unread ? 'جديد' : 'مقروء',
    }));
  } else if (type === 'calendar') {
    data = upcomingEvents.map((e) => ({
      id: e.id,
      c1: e.title,
      c2: e.type,
      c3: e.date,
      c4: 'مجدول',
      c5: 'نشط',
    }));
  } else if (type === 'attendance') {
    data = classes.map((c) => ({
      id: c.id,
      c1: c.name,
      c2: c.supervisor,
      c3: String(c.students),
      c4: '٩٤٪',
      c5: 'نشط',
    }));
  } else if (type === 'timetable') {
    data = [
      { id: '1', c1: 'السبت', c2: 'الحصة ١', c3: 'رياضيات — ٣/أ', c4: 'أ. محمد', c5: 'نشط' },
      { id: '2', c1: 'السبت', c2: 'الحصة ٢', c3: 'عربي — ٢/أ', c4: 'أ. نادية', c5: 'نشط' },
      { id: '3', c1: 'الأحد', c2: 'الحصة ١', c3: 'فيزياء — ٣ ثانوي', c4: 'أ. حسام', c5: 'تعارض' },
      { id: '4', c1: 'الاثنين', c2: 'الحصة ٣', c3: 'إنجليزي — ١/ب', c4: 'أ. داليا', c5: 'نشط' },
    ];
  } else if (type === 'ai') {
    data = [
      { id: '1', c1: 'محادثة رياضيات', c2: 'يوسف أحمد', c3: '٣ إعدادي', c4: 'ممتاز', c5: 'نشط' },
      { id: '2', c1: 'سؤال فيزياء بلا إجابة', c2: 'مريم خالد', c3: '١ ثانوي', c4: 'يحتاج مراجعة', c5: 'متابعة' },
      { id: '3', c1: 'شرح علوم', c2: 'عمر محمود', c3: '٦ ابتدائي', c4: 'جيد', c5: 'نشط' },
    ];
  } else {
    data = [
      { id: '1', c1: `${entity} #١`, c2: 'قسم أ', c3: '١٢ سجل', c4: 'اليوم', c5: 'نشط' },
      { id: '2', c1: `${entity} #٢`, c2: 'قسم ب', c3: '٨ سجلات', c4: 'أمس', c5: 'متابعة' },
      { id: '3', c1: `${entity} #٣`, c2: 'قسم ج', c3: '٢١ سجل', c4: 'هذا الأسبوع', c5: 'نشط' },
      { id: '4', c1: `${entity} #٤`, c2: 'قسم د', c3: '٥ سجلات', c4: 'هذا الشهر', c5: 'متابعة' },
    ];
  }

  return data.filter((row) => {
    const matchesSearch = !q || Object.values(row).some((v) => String(v).includes(q));
    const matchesFilter =
      filter === 'الكل' ||
      (filter === 'نشط' && ['نشط', 'مدفوع', 'معتمد', 'مقروء', 'تم الحل'].includes(row.c5)) ||
      (filter === 'متابعة' &&
        ['متابعة', 'متأخر', 'جديد', 'تعارض', 'معلق', 'جارٍ المعالجة', 'قيد المراجعة'].includes(row.c5));
    return matchesSearch && matchesFilter;
  });
}

function buildColumns(type: ModuleType) {
  const labels =
    type === 'teachers'
      ? ['المدرس', 'المواد', 'المراحل', 'الهاتف', 'الحالة']
      : type === 'employees'
        ? ['الموظف', 'المسمى', 'القسم', 'الراتب', 'الحالة']
        : type === 'parents'
          ? ['ولي الأمر', 'الهاتف', 'الأبناء', 'الرصيد', 'الحالة']
          : type === 'complaints'
            ? ['الشكوى', 'التصنيف', 'الأولوية', 'المسؤول', 'الحالة']
            : type === 'installments' || type === 'overdue'
              ? ['الطالب', 'التفاصيل', 'المبلغ/الموعد', 'مرجع', 'الحالة']
              : type === 'payroll'
                ? ['الاسم', 'الدور', 'الأساسي', 'الصافي', 'الحالة']
                : type === 'grades'
                  ? ['الصف', 'الشعب', 'الطلاب/السعة', 'الإشغال', 'الحالة']
                  : type === 'classes'
                    ? ['الفصل', 'المشرف', 'الطلاب/السعة', 'القاعة', 'الحالة']
                    : type === 'subjects'
                      ? ['المادة', 'المراحل', 'حصص أسبوعياً', 'المدرسون', 'الحالة']
                      : type === 'attendance'
                        ? ['الفصل', 'المشرف', 'عدد الطلاب', 'نسبة الحضور', 'الحالة']
                        : type === 'timetable'
                          ? ['اليوم', 'الحصة', 'المادة/الفصل', 'المدرس', 'الحالة']
                          : type === 'notifications'
                            ? ['العنوان', 'التصنيف', 'التفاصيل', 'الوقت', 'الحالة']
                            : type === 'calendar'
                              ? ['الحدث', 'النوع', 'التاريخ', 'التنظيم', 'الحالة']
                              : type === 'ai'
                                ? ['الموضوع', 'الطالب', 'الصف', 'التقييم', 'الحالة']
                                : ['البند', 'التصنيف', 'العدد/التفاصيل', 'الزمن', 'الحالة'];

  return [
    { key: 'c1', label: labels[0], width: 200, primary: true, getValue: (r: Row) => r.c1 },
    { key: 'c2', label: labels[1], width: 160, getValue: (r: Row) => r.c2 },
    { key: 'c3', label: labels[2], width: 150, getValue: (r: Row) => r.c3 },
    { key: 'c4', label: labels[3], width: 140, getValue: (r: Row) => r.c4 },
    {
      key: 'c5',
      label: labels[4],
      width: 110,
      render: (r: Row) => <Badge label={r.c5} tone={statusTone(r.c5)} />,
    },
  ];
}

const styles = StyleSheet.create({
  footer: {
    marginTop: spacing.xl,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  hint: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'right',
    flex: 1,
  },
});
