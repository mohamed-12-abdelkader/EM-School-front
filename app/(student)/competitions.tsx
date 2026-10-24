import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Badge, EmptyState } from '@/components/ui';
import {
  LoadingBlock,
  ListRow,
  SectionTitle,
  StudentPageShell,
  formatShortDate,
  rowRtl,
} from '@/components/student/ui';
import { studentTheme as t } from '@/components/student/theme';
import { getGamification } from '@/services/studentPortal';
import type {
  BadgeItem,
  Competition,
  LeaderboardRow,
  PointsEntry,
} from '@/types/studentPortal';


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
    <StudentPageShell
      title="النقاط والمسابقات"
      subtitle="رتبتك وشاراتك"
      icon="Trophy"
    >
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
    </StudentPageShell>
  );
}

const styles = StyleSheet.create({
  points: {
    backgroundColor: t.brandSoft,
    borderRadius: t.radius.xl,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    padding: t.space.lg,
    alignItems: 'center',
    ...t.shadow.card,
  },
  pointsLabel: {
    fontFamily: t.fonts.medium,
    fontSize: 13,
    color: t.brandDeep,
  },
  pointsValue: {
    fontFamily: t.fonts.bold,
    fontSize: 36,
    color: t.brandDeep,
    fontVariant: ['tabular-nums'],
  },
  boardRow: {
    flexDirection: rowRtl,
    alignItems: 'center',
    gap: t.space.md,
    paddingVertical: t.space.sm,
    paddingHorizontal: t.space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: t.line,
  },
  boardMe: {
    backgroundColor: t.brandSoft,
    borderRadius: t.radius.md,
  },
  rank: {
    fontFamily: t.fonts.bold,
    fontSize: 13,
    color: t.brand,
    width: 36,
    textAlign: 'center',
  },
  boardName: {
    flex: 1,
    fontFamily: t.fonts.medium,
    fontSize: 14,
    color: t.ink,
    textAlign: 'right',
  },
  boardPts: {
    fontFamily: t.fonts.semiBold,
    fontSize: 13,
    color: t.inkSoft,
  },
  plus: {
    fontFamily: t.fonts.semiBold,
    fontSize: 13,
    color: t.success,
  },
});
