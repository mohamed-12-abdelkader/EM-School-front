import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Icon } from '@/components/ui';
import {
  FadeIn,
  StudentPageShell,
  rowRtl,
} from '@/components/student/ui';
import { studentTheme as t } from '@/components/student/theme';

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
    a: 'المحادثات مع المدرس حقيقية وتظهر في لوحة المدرس. مساعد AI غير مفعّل بعد.',
  },
];

export default function MoreScreen() {
  const router = useRouter();

  return (
    <StudentPageShell
      title="المزيد"
      subtitle="أدوات ومساعدة"
      icon="Menu"
    >
      <Text style={styles.sectionTitle}>الأقسام</Text>
      <View style={styles.grid}>
        {LINKS.map((l, i) => (
          <FadeIn key={l.href} delay={i * 30}>
            <Pressable
              style={({ pressed }) => [
                styles.link,
                pressed && { opacity: 0.92 },
              ]}
              onPress={() => router.push(l.href as never)}
            >
              <View style={styles.linkIcon}>
                <Icon name={l.icon} size={20} color={t.brand} />
              </View>
              <Text style={styles.linkLabel}>{l.label}</Text>
              <Icon name="ChevronLeft" size={16} color={t.inkMute} />
            </Pressable>
          </FadeIn>
        ))}
      </View>

      <Text style={styles.sectionTitle}>الأسئلة الشائعة</Text>
      <View style={styles.faqList}>
        {FAQ.map((f) => (
          <View key={f.q} style={styles.faq}>
            <Text style={styles.q}>{f.q}</Text>
            <Text style={styles.a}>{f.a}</Text>
          </View>
        ))}
      </View>
    </StudentPageShell>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontFamily: t.fonts.bold,
    fontSize: 15,
    color: t.ink,
    textAlign: 'right',
  },
  grid: { gap: 8 },
  link: {
    flexDirection: rowRtl,
    alignItems: 'center',
    gap: 12,
    backgroundColor: t.card,
    borderRadius: t.radius.lg,
    borderWidth: 1,
    borderColor: t.line,
    padding: t.space.md,
    ...t.shadow.card,
  },
  linkIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: t.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkLabel: {
    flex: 1,
    fontFamily: t.fonts.semiBold,
    fontSize: 14,
    color: t.ink,
    textAlign: 'right',
  },
  faqList: { gap: 10 },
  faq: {
    gap: 6,
    backgroundColor: t.card,
    borderRadius: t.radius.lg,
    borderWidth: 1,
    borderColor: t.line,
    padding: t.space.md,
  },
  q: {
    fontFamily: t.fonts.semiBold,
    fontSize: 14,
    color: t.ink,
    textAlign: 'right',
  },
  a: {
    fontFamily: t.fonts.regular,
    fontSize: 13,
    color: t.inkSoft,
    textAlign: 'right',
    lineHeight: 20,
  },
});
