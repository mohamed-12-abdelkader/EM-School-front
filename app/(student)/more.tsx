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
    q: 'هل النتائج رسمية؟',
    a: 'لا — النتائج والامتحانات الحالية تجريبية ومحلية حتى ربط الـ Backend.',
  },
  {
    q: 'هل رسائل المدرس حقيقية؟',
    a: 'المحادثات محفوظة على الجهاز فقط مع ردود محاكاة.',
  },
  {
    q: 'هل مساعد AI نموذج حقيقي؟',
    a: 'لا — الردود محددة مسبقاً داخل التطبيق وقابلة للاستبدال لاحقاً.',
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
