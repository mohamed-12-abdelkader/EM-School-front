import { useState } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Card, Input, PageHeader, useToast } from '@/components/ui';
import { createSchool } from '@/api/schools';
import { ApiError } from '@/api/client';
import { colors, fonts, spacing } from '@/theme/tokens';

export default function CreateSchoolPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [description, setDescription] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const pickLogo = () => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      showToast('رفع اللوجو متاح حالياً من نسخة الويب', 'info');
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files?.[0] || null;
      if (file && file.size > 5 * 1024 * 1024) {
        showToast('حجم الصورة يجب ألا يتجاوز 5MB', 'warning');
        return;
      }
      setLogoFile(file);
    };
    input.click();
  };

  const submit = async () => {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = 'اسم المدرسة مطلوب';
    if (!email.trim()) next.email = 'الإيميل مطلوب';
    if (password.length < 6) next.password = 'كلمة المرور 6 أحرف على الأقل';
    if (password !== confirm) next.confirm = 'كلمتا المرور غير متطابقتين';
    setErrors(next);
    if (Object.keys(next).length) return;

    const form = new FormData();
    form.append('name', name.trim());
    form.append('email', email.trim());
    form.append('password', password);
    form.append('confirm_password', confirm);
    if (description.trim()) form.append('description', description.trim());
    if (logoFile) form.append('logo', logoFile);

    setSubmitting(true);
    try {
      const res = await createSchool(form);
      showToast(res.message || 'تم إنشاء المدرسة', 'success');
      router.replace('/(admin)' as never);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'فشل إنشاء المدرسة', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <PageHeader
        title="إضافة مدرسة"
        subtitle="إنشاء مدرسة مع حساب school_admin"
        breadcrumbs={['المسؤول', 'المدارس', 'إضافة']}
        actions={<Button label="رجوع" variant="outline" onPress={() => router.back()} />}
      />

      <Card style={styles.card}>
        <Input label="اسم المدرسة" value={name} onChangeText={setName} error={errors.name} />
        <Input
          label="إيميل حساب الإدارة"
          value={email}
          onChangeText={setEmail}
          error={errors.email}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <Input
          label="كلمة المرور"
          value={password}
          onChangeText={setPassword}
          error={errors.password}
          secureTextEntry
        />
        <Input
          label="تأكيد كلمة المرور"
          value={confirm}
          onChangeText={setConfirm}
          error={errors.confirm}
          secureTextEntry
        />
        <Input
          label="الوصف (اختياري)"
          value={description}
          onChangeText={setDescription}
          placeholder="نبذة عن المدرسة"
        />

        <View style={styles.logoRow}>
          <Button
            label={logoFile ? `لوجو: ${logoFile.name}` : 'اختيار لوجو (اختياري)'}
            variant="outline"
            icon="Upload"
            onPress={pickLogo}
          />
          {logoFile ? (
            <Button label="إزالة" variant="ghost" onPress={() => setLogoFile(null)} />
          ) : null}
        </View>

        <View style={styles.actions}>
          <Button
            label={submitting ? 'جارٍ الحفظ...' : 'إنشاء المدرسة'}
            onPress={submit}
            disabled={submitting}
          />
          <Button label="إلغاء" variant="outline" onPress={() => router.back()} />
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing['2xl'], paddingBottom: spacing['4xl'], gap: spacing.lg },
  card: { gap: spacing.lg, maxWidth: 640 },
  logoRow: { flexDirection: 'row-reverse', gap: spacing.sm, flexWrap: 'wrap' },
  actions: { flexDirection: 'row-reverse', gap: spacing.md, marginTop: spacing.sm },
});
