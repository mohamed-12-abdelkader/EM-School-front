import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Avatar,
  Badge,
  Button,
  Card,
  PageHeader,
  Tabs,
  statusTone,
  useToast,
} from '@/components/ui';
import { students } from '@/data/mock';
import { colors, fonts, spacing } from '@/theme/tokens';
import { formatCurrency, formatDate } from '@/utils/format';

const tabs = [
  { key: 'overview', label: 'نظرة عامة' },
  { key: 'personal', label: 'البيانات الشخصية' },
  { key: 'guardian', label: 'ولي الأمر' },
  { key: 'academic', label: 'السجل الأكاديمي' },
  { key: 'attendance', label: 'الحضور' },
  { key: 'finance', label: 'الحساب المالي' },
  { key: 'exams', label: 'الامتحانات والدرجات' },
  { key: 'homework', label: 'الواجبات' },
  { key: 'behavior', label: 'السلوك' },
  { key: 'documents', label: 'المستندات' },
  { key: 'comms', label: 'سجل التواصل' },
];

export default function StudentProfilePage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();
  const [tab, setTab] = useState('overview');
  const student = useMemo(() => students.find((s) => s.id === id) ?? students[0], [id]);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <PageHeader
        title={student.name}
        subtitle={`${student.code} • ${student.grade} • فصل ${student.className}`}
        breadcrumbs={['الإدارة الأكاديمية', 'إدارة الطلاب', 'ملف الطالب']}
        actions={
          <>
            <Button label="رجوع" variant="outline" onPress={() => router.push('/students')} />
            <Button
              label="تعديل"
              icon="FileText"
              onPress={() => showToast('نموذج التعديل جاهز للربط مع واجهة الحفظ', 'info')}
            />
          </>
        }
      />

      <Card style={styles.summary}>
        <Avatar name={student.name} color={student.avatarColor} size={72} />
        <View style={styles.summaryText}>
          <Text style={styles.name}>{student.name}</Text>
          <Text style={styles.meta}>ولي الأمر: {student.guardianName} — {student.guardianPhone}</Text>
          <View style={styles.badges}>
            <Badge label={student.enrollmentStatus} tone={statusTone(student.enrollmentStatus)} />
            <Badge label={student.attendanceToday} tone={statusTone(student.attendanceToday)} />
            <Badge label={`المعدل ${student.gpa}`} tone="primary" />
          </View>
        </View>
        <View style={styles.kpis}>
          <Kpi label="المستحقات" value={student.outstandingBalance ? formatCurrency(student.outstandingBalance) : 'مسدد'} />
          <Kpi label="المعدل" value={`${student.gpa}%`} />
          <Kpi label="الجنس" value={student.gender} />
        </View>
      </Card>

      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      <Card>
        {tab === 'overview' && (
          <View style={styles.stack}>
            <Text style={styles.section}>ملخص سريع</Text>
            <Text style={styles.body}>
              طالب منتظم في {student.grade} ضمن فصل {student.className}. آخر تحديث للحضور اليوم بحالة
              «{student.attendanceToday}»، والرصيد المالي الحالي{' '}
              {student.outstandingBalance ? formatCurrency(student.outstandingBalance) : 'مسدد بالكامل'}.
            </Text>
            <Text style={styles.section}>الجدول الزمني</Text>
            {[
              { title: 'تسجيل القيد', date: '2025-09-01', detail: 'تم قبول الطالب وبدء العام الدراسي' },
              { title: 'سداد قسط', date: '2026-01-15', detail: 'تسجيل دفعة جزئية عبر تحويل بنكي' },
              { title: 'ملاحظة أكاديمية', date: '2026-03-10', detail: 'تميز في مسابقة الرياضيات المدرسية' },
            ].map((item) => (
              <View key={item.title} style={styles.timeline}>
                <View style={styles.timelineDot} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  <Text style={styles.meta}>{formatDate(item.date)} — {item.detail}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
        {tab === 'personal' && (
          <InfoGrid
            items={[
              ['الاسم الكامل', student.name],
              ['كود الطالب', student.code],
              ['الرقم القومي', student.nationalId],
              ['الجنس', student.gender],
              ['الصف', student.grade],
              ['الفصل', student.className],
            ]}
          />
        )}
        {tab === 'guardian' && (
          <InfoGrid
            items={[
              ['اسم ولي الأمر', student.guardianName],
              ['رقم الهاتف', student.guardianPhone],
              ['صلة القرابة', 'الأب'],
              ['جهة اتصال طوارئ', '01000000000'],
            ]}
          />
        )}
        {tab === 'academic' && (
          <InfoGrid
            items={[
              ['المعدل التراكمي', `${student.gpa}%`],
              ['الترتيب الفصلي', '٥ من ٣١'],
              ['مواد التميز', 'رياضيات — علوم'],
              ['احتياج دعم', 'لا يوجد'],
            ]}
          />
        )}
        {tab === 'attendance' && (
          <InfoGrid
            items={[
              ['حضور اليوم', student.attendanceToday],
              ['نسبة الحضور الشهرية', '٩٤٪'],
              ['أيام الغياب', '٣'],
              ['تأخيرات', '٢'],
            ]}
          />
        )}
        {tab === 'finance' && (
          <InfoGrid
            items={[
              ['الرصيد المستحق', student.outstandingBalance ? formatCurrency(student.outstandingBalance) : '٠'],
              ['آخر دفعة', '١٥ يناير ٢٠٢٦'],
              ['طريقة الدفع', 'تحويل بنكي'],
              ['خطة الأقساط', '٣ أقساط سنوية'],
            ]}
          />
        )}
        {['exams', 'homework', 'behavior', 'documents', 'comms'].includes(tab) && (
          <Text style={styles.body}>
            بيانات تبويب «{tabs.find((t) => t.key === tab)?.label}» معبأة بواجهة جاهزة للربط مع مصادر
            البيانات الفعلية، مع الحفاظ على نفس نمط العرض والتفاعل.
          </Text>
        )}
      </Card>
    </ScrollView>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.kpi}>
      <Text style={styles.meta}>{label}</Text>
      <Text style={styles.kpiValue}>{value}</Text>
    </View>
  );
}

function InfoGrid({ items }: { items: [string, string][] }) {
  return (
    <View style={styles.grid}>
      {items.map(([label, value]) => (
        <View key={label} style={styles.gridItem}>
          <Text style={styles.meta}>{label}</Text>
          <Text style={styles.itemTitle}>{value}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing['2xl'], paddingBottom: spacing['4xl'], gap: spacing.lg },
  summary: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: spacing.xl, alignItems: 'center' },
  summaryText: { flex: 1, minWidth: 220, gap: 6 },
  name: { fontFamily: fonts.bold, fontSize: 22, color: colors.text, textAlign: 'right' },
  meta: { fontFamily: fonts.regular, fontSize: 12, color: colors.textSecondary, textAlign: 'right' },
  badges: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  kpis: { flexDirection: 'row-reverse', gap: spacing.lg, flexWrap: 'wrap' },
  kpi: { minWidth: 110, gap: 4 },
  kpiValue: { fontFamily: fonts.bold, fontSize: 16, color: colors.text, textAlign: 'right' },
  stack: { gap: spacing.md },
  section: { fontFamily: fonts.semiBold, fontSize: 15, color: colors.text, textAlign: 'right' },
  body: { fontFamily: fonts.regular, fontSize: 14, color: colors.textSecondary, textAlign: 'right', lineHeight: 24 },
  timeline: { flexDirection: 'row-reverse', gap: spacing.md, paddingVertical: spacing.sm },
  timelineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary, marginTop: 6 },
  itemTitle: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.text, textAlign: 'right' },
  grid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: spacing.lg },
  gridItem: { width: '45%', minWidth: 160, gap: 4, padding: spacing.md, backgroundColor: colors.background, borderRadius: 12 },
});
