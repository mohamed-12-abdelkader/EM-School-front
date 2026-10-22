import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ModulePage, SectionTitle } from '@/components/modules/ModulePage';
import { Badge, Button, Card, Input, useToast } from '@/components/ui';
import { messageTemplates, parents } from '@/data/mock';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

export default function ParentMessagesPage() {
  const { showToast } = useToast();
  const [selected, setSelected] = useState(messageTemplates[0].id);
  const [audience, setAudience] = useState('فصل ٣/أ');
  const template = messageTemplates.find((t) => t.id === selected) ?? messageTemplates[0];

  return (
    <ModulePage
      title="رسائل أولياء الأمور"
      subtitle="قوالب جاهزة مع معاينة وحالة تسليم تجريبية"
      breadcrumbs={['التواصل وخدمة العملاء', 'رسائل أولياء الأمور']}
      metrics={[
        {
          id: '1',
          label: 'رسائل اليوم',
          value: '٤٨',
          delta: '١٢ بانتظار التسليم',
          trend: 'up',
          icon: 'MessageSquare',
          accent: 'primary',
        },
        {
          id: '2',
          label: 'نسبة التسليم',
          value: '٩٦٪',
          delta: 'خلال آخر ٧ أيام',
          trend: 'up',
          icon: 'Check',
          accent: 'success',
        },
        {
          id: '3',
          label: 'أولياء مستهدفون',
          value: String(parents.length),
          delta: 'من الدليل الحالي',
          trend: 'neutral',
          icon: 'Contact',
          accent: 'secondary',
        },
      ]}
      primaryAction={{
        label: 'إرسال تجريبي',
        icon: 'Mails',
        onPress: () =>
          showToast(`تم تجهيز رسالة «${template.title}» للجمهور: ${audience} (بدون إرسال فعلي)`, 'success'),
      }}
    >
      <SectionTitle title="اختر قالباً" hint="قوالب شائعة للتواصل المدرسي" />
      <View style={styles.templates}>
        {messageTemplates.map((item) => {
          const active = item.id === selected;
          return (
            <Pressable
              key={item.id}
              onPress={() => setSelected(item.id)}
              style={[styles.template, active && styles.templateActive]}
            >
              <Text style={[styles.templateTitle, active && styles.templateTitleActive]}>{item.title}</Text>
              <Badge label={item.category} tone={active ? 'primary' : 'neutral'} />
            </Pressable>
          );
        })}
      </View>

      <View style={styles.composer}>
        <Input label="الجمهور المستهدف" value={audience} onChangeText={setAudience} />
        <Card style={styles.preview}>
          <Text style={styles.previewLabel}>معاينة الرسالة</Text>
          <Text style={styles.previewTitle}>{template.title}</Text>
          <Text style={styles.previewBody}>{template.body}</Text>
          <Text style={styles.previewMeta}>سيتم العرض فقط لأولياء الأمور المرتبطين — بيانات تجريبية</Text>
        </Card>
        <Button
          label="إرسال للفصل"
          icon="MessageSquare"
          onPress={() => showToast('تم وضع الرسالة في قائمة الإرسال التجريبية', 'info')}
        />
      </View>
    </ModulePage>
  );
}

const styles = StyleSheet.create({
  templates: { gap: spacing.sm, marginBottom: spacing.lg },
  template: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  templateActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  templateTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: colors.text,
    textAlign: 'right',
  },
  templateTitleActive: {
    color: colors.primary,
  },
  composer: { gap: spacing.md },
  preview: { gap: spacing.sm },
  previewLabel: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'right',
  },
  previewTitle: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.text,
    textAlign: 'right',
  },
  previewBody: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'right',
    lineHeight: 24,
  },
  previewMeta: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'right',
  },
});
