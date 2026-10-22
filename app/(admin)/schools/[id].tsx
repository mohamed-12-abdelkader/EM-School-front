import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Badge, Button, Card, Input, PageHeader, useToast } from '@/components/ui';
import { getSchool, updateSchool } from '@/api/schools';
import { ApiError } from '@/api/client';
import type { School } from '@/types/auth';
import { colors, fonts, spacing } from '@/theme/tokens';
import { formatDate } from '@/utils/format';

export default function EditSchoolPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();
  const schoolId = Number(id);

  const [school, setSchool] = useState<School | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [description, setDescription] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await getSchool(schoolId);
        setSchool(res.school);
        setName(res.school.name);
        setEmail(res.school.email);
        setDescription(res.school.description || '');
        setIsActive(res.school.is_active);
      } catch (err) {
        showToast(err instanceof ApiError ? err.message : 'تعذر جلب المدرسة', 'danger');
        router.replace('/(admin)' as never);
      } finally {
        setLoading(false);
      }
    })();
  }, [schoolId, router, showToast]);

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
    if (password && password !== confirm) {
      showToast('كلمتا المرور غير متطابقتين', 'warning');
      return;
    }
    if (password && password.length < 6) {
      showToast('كلمة المرور 6 أحرف على الأقل', 'warning');
      return;
    }

    const form = new FormData();
    if (name.trim()) form.append('name', name.trim());
    if (email.trim()) form.append('email', email.trim());
    form.append('description', description.trim());
    form.append('is_active', String(isActive));
    if (password) {
      form.append('password', password);
      form.append('confirm_password', confirm);
    }
    if (logoFile) form.append('logo', logoFile);

    setSubmitting(true);
    try {
      const res = await updateSchool(schoolId, form);
      showToast(res.message || 'تم التحديث', 'success');
      setSchool(res.school);
      setPassword('');
      setConfirm('');
      setLogoFile(null);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'فشل التحديث', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <PageHeader
        title={school?.name || 'تعديل مدرسة'}
        subtitle={school ? `منذ ${formatDate(school.created_at)}` : undefined}
        breadcrumbs={['المسؤول', 'المدارس', 'تعديل']}
        actions={
          <>
            <Badge
              label={school?.is_active ? 'مفعّلة' : 'معطّلة'}
              tone={school?.is_active ? 'success' : 'warning'}
            />
            <Button label="رجوع" variant="outline" onPress={() => router.push('/(admin)' as never)} />
          </>
        }
      />

      <Card style={styles.card}>
        <Input label="اسم المدرسة" value={name} onChangeText={setName} />
        <Input
          label="إيميل حساب الإدارة"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <Input
          label="الوصف"
          value={description}
          onChangeText={setDescription}
          placeholder="نبذة عن المدرسة"
        />
        <Input
          label="كلمة مرور جديدة (اختياري)"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="اتركها فارغة إن لم تتغير"
        />
        <Input
          label="تأكيد كلمة المرور"
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
        />

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>المدرسة مفعّلة</Text>
          <Switch
            value={isActive}
            onValueChange={setIsActive}
            trackColor={{ true: colors.primary, false: colors.border }}
          />
        </View>

        <View style={styles.logoRow}>
          <Button
            label={logoFile ? `لوجو: ${logoFile.name}` : 'تغيير اللوجو'}
            variant="outline"
            icon="Upload"
            onPress={pickLogo}
          />
          {school?.logo ? (
            <Text style={styles.logoHint} numberOfLines={1}>
              الحالي: {school.logo}
            </Text>
          ) : null}
        </View>

        <View style={styles.actions}>
          <Button
            label={submitting ? 'جارٍ الحفظ...' : 'حفظ التعديلات'}
            onPress={submit}
            disabled={submitting}
          />
          <Button label="إلغاء" variant="outline" onPress={() => router.push('/(admin)' as never)} />
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing['2xl'], paddingBottom: spacing['4xl'], gap: spacing.lg },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: { gap: spacing.lg, maxWidth: 640 },
  switchRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  switchLabel: { fontFamily: fonts.semiBold, fontSize: 14, color: colors.text },
  logoRow: { gap: spacing.sm },
  logoHint: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted, textAlign: 'right' },
  actions: { flexDirection: 'row-reverse', gap: spacing.md },
});
