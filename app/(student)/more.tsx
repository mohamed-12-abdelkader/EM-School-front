import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ListRow, SectionTitle, StudentScreen } from '@/components/student/ui';
import { colors, fonts, spacing } from '@/theme/tokens';

const LINKS = [
  { label: 'الجدول الدراسي', href: '/(student)/timetable', icon: 'CalendarClock' },
  { label: 'المحاضرات', href: '/(student)/lectures', icon: 'Presentation' },
  { label: 'الواجبات', href: '/(student)/assignments', icon: 'FileText' },
  { label: 'الامتحانات', href: '/(student)/exams', icon: 'ClipboardList' },
  { label: 'جدول المذاكرة', href: '/(student)/planner', icon: 'CalendarDays' },
  { label: 'النتائج', href: '/(student)/results', icon: 'FileBarChart' },
  { label: 'المسابقات والنقاط', href: '/(student)/competitions', icon: 'Trophy' },
  { label: 'الإشعارات', href: '/(student)/notifications', icon: 'Bell' },
];

const FAQ = [
  {
    q: 'من أين تأتي الواجبات والامتحانات؟',
    a: 'من لوحة المدرس فقط — تظهر بعد نشر المدرس للواجب أو الامتحان لفصلك.',
  },
  {
    q: 'هل النتائج رسمية؟',
    a: 'نعم ضمن المنصة: درجات الامتحانات والواجبات المعتمدة من المدرس تظهر في النتائج.',
  },
  {
    q: 'هل المحادثات ومساعد AI جاهزان؟',
    a: 'قائمة المدرسين حقيقية من موادك؛ إرسال الرسائل محلي مؤقتاً. مساعد AI غير مفعّل بعد.',
  },
];

export default function MoreScreen() {
  const router = useRouter();

  return (
    <StudentScreen title="المزيد" subtitle="أدوات ومساعدة" onBack hero>
      <SectionTitle title="الأقسام" />
      {LINKS.map((l) => (
        <ListRow
          key={l.href}
          title={l.label}
          onPress={() => router.push(l.href as never)}
        />
      ))}

      <SectionTitle title="الأسئلة الشائعة" />
      {FAQ.map((f) => (
        <View key={f.q} style={styles.faq}>
          <Text style={styles.q}>{f.q}</Text>
          <Text style={styles.a}>{f.a}</Text>
        </View>
      ))}
    </StudentScreen>
  );
}

const styles = StyleSheet.create({
  faq: {
    gap: 4,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  q: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: colors.text,
    textAlign: 'right',
  },
  a: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'right',
    lineHeight: 20,
  },
});
