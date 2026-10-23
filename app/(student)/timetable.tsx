import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { EmptyState, Icon } from '@/components/ui';
import {
  DAY_NAMES,
  FadeIn,
  LoadingBlock,
  SoftCard,
  StudentScreen,
  lectureStatusLabel,
  rowRtl,
} from '@/components/student/ui';
import { studentTheme as t } from '@/components/student/theme';
import {
  getStudentSchedule,
  getSubject,
  getTeacher,
} from '@/services/studentPortal';
import type { ScheduleSlot } from '@/types/studentPortal';

const DAY_SHORT = ['أحد', 'إثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت'];

function statusTone(status: ScheduleSlot['status']) {
  if (status === 'live') return { bg: '#FEE2E2', fg: t.danger, label: 'الآن' };
  if (status === 'completed')
    return { bg: t.successSoft, fg: t.success, label: 'انتهت' };
  return { bg: t.brandSoft, fg: t.brand, label: lectureStatusLabel.upcoming };
}

function slotKindLabel(slot: ScheduleSlot) {
  if (slot.slotType === 'break') return 'استراحة';
  if (slot.slotType === 'activity') return 'نشاط';
  if (slot.slotType === 'reserve') return 'احتياطي';
  if (slot.type === 'live') return 'مباشرة';
  if (slot.type === 'recorded') return 'مسجّلة';
  return 'حضورية';
}

function SlotCard({
  slot,
  index,
  onPress,
}: {
  slot: ScheduleSlot;
  index: number;
  onPress?: () => void;
}) {
  const sub = slot.subjectName || getSubject(slot.subjectId)?.name;
  const teacher =
    slot.teacherName || getTeacher(slot.teacherId)?.name || undefined;
  const color = slot.color || getSubject(slot.subjectId)?.color || t.brand;
  const tone = statusTone(slot.status);
  const isBreak = slot.slotType === 'break';
  const title = isBreak
    ? 'استراحة'
    : sub || (slot.slotType === 'activity' ? 'نشاط' : 'حصة');

  return (
    <FadeIn delay={index * 45}>
      <SoftCard
        onPress={onPress}
        padded={false}
        style={styles.slotCard}
      >
        <View style={[styles.accent, { backgroundColor: color }]} />
        <View style={styles.timeRail}>
          <Text style={styles.timeStart}>{slot.start}</Text>
          <View style={[styles.timeDot, { backgroundColor: color }]} />
          <Text style={styles.timeEnd}>{slot.end}</Text>
        </View>
        <View style={styles.slotBody}>
          <View style={styles.slotTop}>
            <View style={styles.slotTitles}>
              <Text style={styles.slotTitle} numberOfLines={2}>
                {title}
              </Text>
              {!isBreak && teacher ? (
                <Text style={styles.slotTeacher} numberOfLines={1}>
                  أ/{teacher}
                </Text>
              ) : null}
            </View>
            <View style={[styles.statusPill, { backgroundColor: tone.bg }]}>
              <Text style={[styles.statusText, { color: tone.fg }]}>
                {tone.label}
              </Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            {slot.periodNumber != null ? (
              <View style={styles.metaChip}>
                <Icon name="Layers" size={12} color={t.inkMute} />
                <Text style={styles.metaChipText}>
                  الحصة {slot.periodNumber}
                </Text>
              </View>
            ) : null}
            <View style={styles.metaChip}>
              <Icon
                name={isBreak ? 'Clock' : 'School'}
                size={12}
                color={t.inkMute}
              />
              <Text style={styles.metaChipText}>
                {slot.room || slotKindLabel(slot)}
              </Text>
            </View>
            {!isBreak ? (
              <View style={styles.metaChip}>
                <Icon name="Presentation" size={12} color={t.inkMute} />
                <Text style={styles.metaChipText}>{slotKindLabel(slot)}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </SoftCard>
    </FadeIn>
  );
}

export default function TimetableScreen() {
  const router = useRouter();
  const today = new Date().getDay();
  const [day, setDay] = useState(today);
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState<{
    classroomName: string | null;
    gradeName: string | null;
    academicYear: string | null;
  }>({ classroomName: null, gradeName: null, academicYear: null });

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        setLoading(true);
        try {
          const data = await getStudentSchedule(day);
          if (alive) {
            setSlots(data.slots);
            setMeta({
              classroomName: data.classroomName,
              gradeName: data.gradeName,
              academicYear: data.academicYear,
            });
          }
        } finally {
          if (alive) setLoading(false);
        }
      })();
      return () => {
        alive = false;
      };
    }, [day]),
  );

  const subtitle = useMemo(() => {
    const parts = [meta.classroomName, meta.gradeName].filter(Boolean);
    return parts.length ? parts.join(' · ') : 'جدول الأسبوع الدراسي';
  }, [meta]);

  const liveCount = slots.filter((s) => s.status === 'live').length;
  const upcomingCount = slots.filter((s) => s.status === 'upcoming').length;

  return (
    <StudentScreen title="الجدول الدراسي" subtitle={subtitle} onBack hero>
      <FadeIn>
        <View style={styles.summary}>
          <View style={styles.summaryIcon}>
            <Icon name="CalendarDays" size={20} color={t.brand} />
          </View>
          <View style={styles.summaryTextCol}>
            <Text style={styles.summaryTitle}>{DAY_NAMES[day]}</Text>
            <Text style={styles.summarySub}>
              {loading
                ? 'جارٍ التحميل…'
                : slots.length === 0
                  ? 'لا حصص في هذا اليوم'
                  : liveCount > 0
                    ? `${liveCount} حصة جارية · ${upcomingCount} قادمة`
                    : `${slots.length} حصة · ${upcomingCount} قادمة`}
            </Text>
          </View>
          {day !== today ? (
            <Pressable
              onPress={() => setDay(today)}
              style={styles.todayBtn}
              hitSlop={6}
            >
              <Text style={styles.todayBtnText}>اليوم</Text>
            </Pressable>
          ) : null}
        </View>
      </FadeIn>

      <View style={styles.days}>
        {DAY_NAMES.map((_, i) => {
          const active = day === i;
          const isToday = i === today;
          return (
            <Pressable
              key={DAY_SHORT[i]}
              onPress={() => setDay(i)}
              style={[
                styles.dayChip,
                active && styles.dayOn,
                isToday && !active && styles.dayToday,
              ]}
            >
              <Text
                style={[
                  styles.dayLabel,
                  active && styles.dayLabelOn,
                  isToday && !active && styles.dayLabelToday,
                ]}
              >
                {DAY_SHORT[i]}
              </Text>
              {isToday ? (
                <View
                  style={[styles.todayDot, active && styles.todayDotOn]}
                />
              ) : (
                <View style={styles.todayDotSpacer} />
              )}
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <LoadingBlock />
      ) : slots.length === 0 ? (
        <EmptyState
          icon="CalendarClock"
          title="لا حصص في هذا اليوم"
          description="اختر يوماً آخر أو انتظر نشر الجدول من الإدارة"
        />
      ) : (
        <View style={styles.list}>
          {slots.map((slot, i) => (
            <SlotCard
              key={slot.id}
              slot={slot}
              index={i}
              onPress={
                slot.lectureId
                  ? () =>
                      router.push(
                        `/(student)/lecture/${slot.lectureId}` as never,
                      )
                  : slot.subjectId
                    ? () =>
                        router.push(
                          `/(student)/subject/${slot.subjectId}` as never,
                        )
                    : undefined
              }
            />
          ))}
        </View>
      )}
    </StudentScreen>
  );
}

const styles = StyleSheet.create({
  summary: {
    flexDirection: rowRtl,
    alignItems: 'center',
    gap: 12,
    backgroundColor: t.card,
    borderRadius: t.radius.xl,
    borderWidth: 1,
    borderColor: t.line,
    padding: t.space.lg,
    ...t.shadow.card,
  },
  summaryIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: t.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryTextCol: {
    flex: 1,
    gap: 2,
  },
  summaryTitle: {
    fontFamily: t.fonts.bold,
    fontSize: 17,
    color: t.ink,
    textAlign: 'right',
  },
  summarySub: {
    fontFamily: t.fonts.regular,
    fontSize: 13,
    color: t.inkSoft,
    textAlign: 'right',
  },
  todayBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: t.radius.full,
    backgroundColor: t.brandSoft,
  },
  todayBtnText: {
    fontFamily: t.fonts.semiBold,
    fontSize: 12,
    color: t.brand,
  },
  days: {
    flexDirection: rowRtl,
    justifyContent: 'space-between',
    gap: 6,
    marginTop: 4,
  },
  dayChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: t.radius.lg,
    backgroundColor: t.card,
    borderWidth: 1,
    borderColor: t.line,
    gap: 4,
    minHeight: 56,
  },
  dayOn: {
    backgroundColor: t.brand,
    borderColor: t.brand,
    ...t.shadow.float,
  },
  dayToday: {
    borderColor: t.brand,
    backgroundColor: t.brandSoft,
  },
  dayLabel: {
    fontFamily: t.fonts.semiBold,
    fontSize: 12,
    color: t.inkSoft,
  },
  dayLabelOn: {
    color: '#fff',
  },
  dayLabelToday: {
    color: t.brandDeep,
  },
  todayDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: t.brand,
  },
  todayDotOn: {
    backgroundColor: '#fff',
  },
  todayDotSpacer: {
    width: 5,
    height: 5,
  },
  list: {
    gap: 12,
    marginTop: 4,
  },
  slotCard: {
    flexDirection: rowRtl,
    overflow: 'hidden',
    borderRadius: t.radius.xl,
    borderWidth: 1,
    borderColor: t.line,
    backgroundColor: t.card,
    ...t.shadow.card,
  },
  accent: {
    width: 5,
  },
  timeRail: {
    width: 64,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: t.space.lg,
    backgroundColor: t.cardMuted,
  },
  timeStart: {
    fontFamily: t.fonts.bold,
    fontSize: 13,
    color: t.ink,
  },
  timeEnd: {
    fontFamily: t.fonts.medium,
    fontSize: 12,
    color: t.inkMute,
  },
  timeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  slotBody: {
    flex: 1,
    padding: t.space.lg,
    gap: 10,
  },
  slotTop: {
    flexDirection: rowRtl,
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  slotTitles: {
    flex: 1,
    gap: 4,
  },
  slotTitle: {
    fontFamily: t.fonts.bold,
    fontSize: 16,
    color: t.ink,
    textAlign: 'right',
  },
  slotTeacher: {
    fontFamily: t.fonts.regular,
    fontSize: 13,
    color: t.inkSoft,
    textAlign: 'right',
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: t.radius.full,
  },
  statusText: {
    fontFamily: t.fonts.semiBold,
    fontSize: 11,
  },
  metaRow: {
    flexDirection: rowRtl,
    flexWrap: 'wrap',
    gap: 6,
  },
  metaChip: {
    flexDirection: rowRtl,
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: t.radius.full,
    backgroundColor: t.cardMuted,
  },
  metaChipText: {
    fontFamily: t.fonts.medium,
    fontSize: 11,
    color: t.inkSoft,
  },
});
