import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Badge, EmptyState } from '@/components/ui';
import {
  LoadingBlock,
  ListRow,
  SectionTitle,
  StudentScreen,
  formatShortDate,
  rowRtl,
} from '@/components/student/ui';
import { getGamification } from '@/services/studentPortal';
import type {
  BadgeItem,
  Competition,
  LeaderboardRow,
  PointsEntry,
} from '@/types/studentPortal';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

export default function CompetitionsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [points, setPoints] = useState(0);
  const [comps, setComps] = useState<Competition[]>([]);
  const [board, setBoard] = useState<LeaderboardRow[]>([]);
  const [badges, setBadges] = useState<BadgeItem[]>([]);
  const [log, setLog] = useState<PointsEntry[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const g = await getGamification();
    setPoints(g.points);
    setComps(g.competitions);
    setBoard(g.leaderboard);
    setBadges(g.badges);
    setLog(g.pointsLog);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <StudentScreen title="النقاط والمسابقات" onBack hero>
      {loading ? (
        <LoadingBlock />
      ) : (
        <>
          <View style={styles.points}>
            <Text style={styles.pointsLabel}>نقاطك</Text>
            <Text style={styles.pointsValue}>{points}</Text>
          </View>

          <SectionTitle title="مسابقات" />
          {comps.length === 0 ? (
            <EmptyState icon="Trophy" title="لا مسابقات" />
          ) : (
            comps.map((c) => (
              <ListRow
                key={c.id}
                title={c.title}
                meta={`${c.rewardPoints} نقطة · ينتهي ${formatShortDate(c.endsAt)} · ${c.participants} مشارك`}
                onPress={() =>
                  router.push(`/(student)/competition/${c.id}` as never)
                }
                right={
                  <Badge
                    label={
                      c.status === 'open'
                        ? 'متاحة'
                        : c.status === 'joined'
                          ? 'مشترك'
                          : 'منتهية'
                    }
                    tone={
                      c.status === 'open'
                        ? 'success'
                        : c.status === 'joined'
                          ? 'primary'
                          : 'neutral'
                    }
                  />
                }
              />
            ))
          )}

          <SectionTitle title="أداؤك" />
          {board.length === 0 ? (
            <EmptyState
              icon="Trophy"
              title="لا نقاط بعد"
              description="النقاط تُحسب من درجات امتحاناتك وواجباتك بعد التصحيح"
            />
          ) : (
            board.map((row) => (
              <View
                key={row.rank}
                style={[styles.boardRow, row.isMe && styles.boardMe]}
              >
                <Text style={styles.rank}>#{row.rank}</Text>
                <Text style={styles.boardName}>
                  {row.name}
                  {row.isMe ? ' (أنت)' : ''}
                </Text>
                <Text style={styles.boardPts}>{row.points}</Text>
              </View>
            ))
          )}

          <SectionTitle title="سجل الدرجات" />
          {log.length === 0 ? (
            <EmptyState
              icon="FileBarChart"
              title="لا درجات مسجّلة"
              description="بعد تسليم امتحان أو تصحيح واجب تظهر هنا"
            />
          ) : (
            log.map((p) => (
              <ListRow
                key={p.id}
                title={p.title}
                meta={formatShortDate(p.at)}
                right={<Text style={styles.plus}>{p.points}%</Text>}
              />
            ))
          )}

          <SectionTitle title="الشارات" />
          {badges.length === 0 ? (
            <EmptyState
              icon="Sparkles"
              title="لا شارات بعد"
              description="أكمل امتحاناً أو احصل على درجة واجب لفتح شارة"
            />
          ) : (
            badges.map((b) => (
              <ListRow
                key={b.id}
                title={b.title}
                meta={b.description}
                right={
                  <Badge
                    label={b.earned ? 'مكتسبة' : 'مقفلة'}
                    tone={b.earned ? 'success' : 'neutral'}
                  />
                }
              />
            ))
          )}
        </>
      )}
    </StudentScreen>
  );
}

const styles = StyleSheet.create({
  points: {
    backgroundColor: colors.secondarySoft,
    borderRadius: radii.lg,
    padding: spacing.lg,
    alignItems: 'center',
  },
  pointsLabel: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.secondary,
  },
  pointsValue: {
    fontFamily: fonts.bold,
    fontSize: 34,
    color: colors.secondary,
  },
  boardRow: {
    flexDirection: rowRtl,
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  boardMe: { backgroundColor: colors.primarySoft, borderRadius: radii.sm },
  rank: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.primary,
    width: 36,
    textAlign: 'center',
  },
  boardName: {
    flex: 1,
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.text,
    textAlign: 'right',
  },
  boardPts: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: colors.textSecondary,
  },
  plus: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: colors.success,
  },
});
