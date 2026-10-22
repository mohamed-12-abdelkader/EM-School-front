import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { Avatar, Badge, Button, Icon } from '@/components/ui';
import {
  FadeIn,
  IconBadge,
  LoadingBlock,
  ProgressBar,
  SectionTitle,
  SoftCard,
  StudentScreen,
  rowRtl,
} from '@/components/student/ui';
import { studentTheme as t } from '@/components/student/theme';
import { useAuth } from '@/auth/AuthContext';
import { getGamification, getStudentSubjects } from '@/services/studentPortal';
import type { BadgeItem, StudentSubject } from '@/types/studentPortal';

export default function AccountTab() {
  const { user, studentMeta, logout } = useAuth();
  const router = useRouter();
  const [points, setPoints] = useState(0);
  const [badges, setBadges] = useState<BadgeItem[]>([]);
  const [subjects, setSubjects] = useState<StudentSubject[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        setLoading(true);
        const [g, subs] = await Promise.all([
          getGamification(),
          getStudentSubjects(),
        ]);
        if (alive) {
          setPoints(g.points);
          setBadges(g.badges);
          setSubjects(subs);
          setLoading(false);
        }
      })();
      return () => {
        alive = false;
      };
    }, []),
  );

  const onLogout = async () => {
    await logout();
    router.replace('/login' as never);
  };

  return (
    <StudentScreen title="حسابي" hero>
      <FadeIn>
        <LinearGradient
          colors={[...t.heroGradient]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.profileCard}
        >
          <Avatar name={user?.name || 'طالب'} size={78} color={t.brand} />
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.meta}>
            {studentMeta?.profile.grade_name} ·{' '}
            {studentMeta?.profile.classroom_name}
          </Text>
          <View style={styles.codePill}>
            <Icon name="KeyRound" size={14} color="#fff" />
            <Text style={styles.codeText}>
              كود {user?.login_code || '—'}
            </Text>
          </View>
        </LinearGradient>
      </FadeIn>

      {loading ? (
        <LoadingBlock />
      ) : (
        <>
          <SoftCard>
            <View style={styles.pointsRow}>
              <IconBadge name="Trophy" color={t.accent} size={48} />
              <View style={styles.pointsText}>
                <Text style={styles.pointsLabel}>إجمالي النقاط</Text>
                <Text style={styles.pointsValue}>{points}</Text>
              </View>
              <Pressable
                onPress={() => router.push('/(student)/competitions' as never)}
                style={styles.linkBtn}
              >
                <Text style={styles.link}>المتصدرين</Text>
                <Icon name="ChevronLeft" size={16} color={t.brand} />
              </Pressable>
            </View>
          </SoftCard>

          <SectionTitle title="المواد المسجلة" icon="BookOpen" />
          {subjects.map((s) => (
            <SoftCard key={s.id} padded={false}>
              <View style={styles.subjectRow}>
                <IconBadge name={s.icon} color={s.color} size={36} />
                <Text style={styles.subjectName}>{s.name}</Text>
                <View style={styles.subjectProg}>
                  <ProgressBar value={s.progress} color={s.color} height={7} />
                </View>
                <Text style={styles.pct}>{s.progress}%</Text>
              </View>
            </SoftCard>
          ))}

          <SectionTitle title="الشارات" icon="Sparkles" />
          <View style={styles.badges}>
            {badges.map((b) => (
              <SoftCard
                key={b.id}
                style={!b.earned ? styles.badgeLocked : undefined}
              >
                <View style={styles.badgeHead}>
                  <IconBadge
                    name={b.icon}
                    color={b.earned ? t.accent : t.inkMute}
                    size={40}
                  />
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={styles.badgeTitle}>{b.title}</Text>
                    <Text style={styles.badgeDesc}>{b.description}</Text>
                  </View>
                  <Badge
                    label={b.earned ? 'مكتسبة' : 'مقفلة'}
                    tone={b.earned ? 'success' : 'neutral'}
                  />
                </View>
              </SoftCard>
            ))}
          </View>
        </>
      )}

      <SectionTitle title="الإعدادات" icon="Settings" />
      <SoftCard padded={false}>
        <Pressable
          style={styles.setting}
          onPress={() => router.push('/(student)/notifications' as never)}
        >
          <IconBadge name="Bell" size={36} />
          <Text style={styles.settingText}>الإشعارات داخل التطبيق</Text>
          <Icon name="ChevronLeft" size={18} color={t.inkMute} />
        </Pressable>
        <Pressable
          style={[styles.setting, styles.settingBorder]}
          onPress={() => router.push('/(student)/more' as never)}
        >
          <IconBadge name="LifeBuoy" size={36} color={t.success} />
          <Text style={styles.settingText}>المساعدة والأسئلة الشائعة</Text>
          <Icon name="ChevronLeft" size={18} color={t.inkMute} />
        </Pressable>
      </SoftCard>

      <Text style={styles.disclaimer}>
        بيانات الملف والأدوات التعليمية تجريبية. تسجيل الخروج يستخدم نظام
        المصادقة الحالي.
      </Text>

      <Button label="تسجيل الخروج" variant="outline" onPress={onLogout} />
    </StudentScreen>
  );
}

const styles = StyleSheet.create({
  profileCard: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 28,
    paddingHorizontal: 20,
    borderRadius: t.radius.xl,
    ...t.shadow.float,
  },
  name: {
    fontFamily: t.fonts.bold,
    fontSize: 22,
    color: '#fff',
    marginTop: 8,
  },
  meta: {
    fontFamily: t.fonts.regular,
    fontSize: 13,
    color: 'rgba(255,255,255,0.82)',
  },
  codePill: {
    flexDirection: rowRtl,
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    backgroundColor: 'rgba(255,255,255,0.16)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: t.radius.full,
  },
  codeText: {
    fontFamily: t.fonts.semiBold,
    fontSize: 13,
    color: '#fff',
  },
  pointsRow: {
    flexDirection: rowRtl,
    alignItems: 'center',
    gap: 12,
  },
  pointsText: { flex: 1, gap: 2 },
  pointsLabel: {
    fontFamily: t.fonts.medium,
    fontSize: 12,
    color: t.inkMute,
    textAlign: 'right',
  },
  pointsValue: {
    fontFamily: t.fonts.bold,
    fontSize: 28,
    color: t.accent,
    textAlign: 'right',
  },
  linkBtn: {
    flexDirection: rowRtl,
    alignItems: 'center',
    gap: 2,
  },
  link: {
    fontFamily: t.fonts.semiBold,
    fontSize: 13,
    color: t.brand,
  },
  subjectRow: {
    flexDirection: rowRtl,
    alignItems: 'center',
    gap: 10,
    padding: t.space.md,
  },
  subjectName: {
    fontFamily: t.fonts.semiBold,
    fontSize: 13,
    color: t.ink,
    width: 72,
    textAlign: 'right',
  },
  subjectProg: { flex: 1 },
  pct: {
    fontFamily: t.fonts.bold,
    fontSize: 12,
    color: t.inkSoft,
    width: 40,
    textAlign: 'left',
  },
  badges: { gap: 10 },
  badgeLocked: { opacity: 0.55 },
  badgeHead: {
    flexDirection: rowRtl,
    alignItems: 'center',
    gap: 12,
  },
  badgeTitle: {
    fontFamily: t.fonts.semiBold,
    fontSize: 14,
    color: t.ink,
    textAlign: 'right',
  },
  badgeDesc: {
    fontFamily: t.fonts.regular,
    fontSize: 12,
    color: t.inkSoft,
    textAlign: 'right',
  },
  setting: {
    flexDirection: rowRtl,
    alignItems: 'center',
    gap: 12,
    padding: t.space.md,
  },
  settingBorder: {
    borderTopWidth: 1,
    borderTopColor: t.line,
  },
  settingText: {
    flex: 1,
    fontFamily: t.fonts.semiBold,
    fontSize: 14,
    color: t.ink,
    textAlign: 'right',
  },
  disclaimer: {
    fontFamily: t.fonts.regular,
    fontSize: 12,
    color: t.inkMute,
    textAlign: 'center',
    lineHeight: 18,
    marginVertical: t.space.sm,
  },
});
