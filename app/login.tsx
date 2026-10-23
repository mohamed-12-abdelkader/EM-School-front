import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Input, useToast } from '@/components/ui';
import { SegmentControl } from '@/components/admin';
import { useAuth } from '@/auth/AuthContext';
import { loadRememberedEmail } from '@/auth/storage';
import { ApiError } from '@/api/client';
import { colors, fonts, radii, shadows, spacing } from '@/theme/tokens';

type LoginMode = 'staff' | 'student';

export default function LoginScreen() {
  const { login, loginStudent, user, loading } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();
  const [mode, setMode] = useState<LoginMode>('staff');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginCode, setLoginCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      const remembered = await loadRememberedEmail();
      if (mounted && remembered) setEmail(remembered);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <View style={styles.boot}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.bootText}>جارٍ استعادة الجلسة...</Text>
      </View>
    );
  }

  if (user) {
    if (user.role === 'admin') return <Redirect href={'/(admin)' as never} />;
    if (user.role === 'student') return <Redirect href={'/(student)' as never} />;
    if (user.role === 'teacher') return <Redirect href={'/teacher' as never} />;
    if (user.role === 'school_admin') return <Redirect href={'/(dashboard)' as never} />;
    return <Redirect href={'/login' as never} />;
  }

  const mapLoginError = (err: unknown) => {
    if (!(err instanceof ApiError)) return 'تعذر تسجيل الدخول';
    if (err.status === 403) {
      return mode === 'student'
        ? 'حساب الطالب أو المدرسة غير مفعّل'
        : 'حساب المدرسة غير مفعّل أو محذوف';
    }
    if (err.status === 429) return 'محاولات كثيرة فاشلة. حاول لاحقاً';
    if (err.status === 400) {
      return mode === 'student'
        ? 'كود الدخول غير صحيح'
        : 'بيانات الدخول غير صحيحة';
    }
    return err.message;
  };

  const onSubmitStaff = async () => {
    setError('');
    if (!email.trim() || !password) {
      setError('يرجى إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }
    setSubmitting(true);
    try {
      const logged = await login(email, password);
      showToast(`مرحباً ${logged.name}`, 'success');
      if (logged.role === 'admin') {
        router.replace('/(admin)' as never);
      } else if (logged.role === 'school_admin') {
        router.replace('/(dashboard)' as never);
      } else if (logged.role === 'teacher') {
        router.replace('/teacher' as never);
      } else {
        setError('هذا الحساب غير مصرح له بالدخول إلى اللوحة');
      }
    } catch (err) {
      const message = mapLoginError(err);
      setError(message);
      showToast(message, 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  const onSubmitStudent = async () => {
    setError('');
    const code = loginCode.trim();
    if (!code) {
      setError('يرجى إدخال كود الدخول');
      return;
    }
    setSubmitting(true);
    try {
      const logged = await loginStudent(code);
      showToast(`مرحباً ${logged.name}`, 'success');
      router.replace('/(student)' as never);
    } catch (err) {
      const message = mapLoginError(err);
      setError(message);
      showToast(message, 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>EM</Text>
            </View>
            <Text style={styles.title}>تسجيل الدخول</Text>
            <Text style={styles.subtitle}>
              {mode === 'staff'
                ? 'ادخل بحساب المسؤول أو إدارة المدرسة أو المعلّم'
                : 'ادخل بكود الطالب فقط'}
            </Text>

            <SegmentControl
              value={mode}
              options={[
                { key: 'staff', label: 'إدارة' },
                { key: 'student', label: 'طالب' },
              ]}
              onChange={(next) => {
                setMode(next);
                setError('');
              }}
            />

            <View style={styles.form}>
              {mode === 'staff' ? (
                <>
                  <Input
                    label="البريد الإلكتروني"
                    value={email}
                    onChangeText={setEmail}
                    placeholder="name@example.com"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    textContentType="emailAddress"
                  />
                  <Input
                    label="كلمة المرور"
                    value={password}
                    onChangeText={setPassword}
                    placeholder="••••••••"
                    secureTextEntry
                    textContentType="password"
                  />
                </>
              ) : (
                <Input
                  label="كود الدخول"
                  value={loginCode}
                  onChangeText={setLoginCode}
                  placeholder="58317"
                  autoCapitalize="none"
                  keyboardType="number-pad"
                  textContentType="oneTimeCode"
                />
              )}

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <Button
                label={submitting ? 'جارٍ الدخول...' : 'دخول'}
                onPress={mode === 'staff' ? onSubmitStaff : onSubmitStudent}
                disabled={submitting}
                style={styles.submit}
              />

              {submitting ? (
                <ActivityIndicator color={colors.primary} style={{ marginTop: 8 }} />
              ) : null}
            </View>

            {mode === 'staff' ? (
              <View style={styles.hints}>
                <Text style={styles.hintTitle}>حسابات تجريبية من الـ API</Text>
                <Pressable
                  onPress={() => {
                    setEmail('abdelrahman.mh3@gmail.com');
                    setPassword('changethis');
                  }}
                >
                  <Text style={styles.hint}>Admin: abdelrahman.mh3@gmail.com</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setEmail('school.alpha@example.com');
                    setPassword('secret12');
                  }}
                >
                  <Text style={styles.hint}>مدرسة: school.alpha@example.com</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setEmail('leo@gmail.com');
                    setPassword('teacher123');
                  }}
                >
                  <Text style={styles.hint}>معلّم: leo@gmail.com / teacher123</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.hints}>
                <Text style={styles.hintTitle}>دخول الطالب</Text>
                <Text style={styles.hintMuted}>
                  استخدم كود الدخول الظاهر في ملف الطالب لدى إدارة المدرسة.
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: colors.background,
  },
  bootText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.textSecondary,
  },
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing['2xl'],
    gap: spacing.lg,
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
    ...shadows.md,
  },
  logo: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  logoText: {
    color: colors.onBrand,
    fontFamily: fonts.bold,
    fontSize: 20,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 24,
    color: colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: -8,
    lineHeight: 22,
  },
  form: {
    gap: spacing.lg,
  },
  error: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.danger,
    textAlign: 'right',
    backgroundColor: colors.dangerSoft,
    padding: spacing.md,
    borderRadius: radii.md,
  },
  submit: {
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  hints: {
    gap: 6,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  hintTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'right',
  },
  hint: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.primary,
    textAlign: 'right',
  },
  hintMuted: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'right',
    lineHeight: 18,
  },
});
