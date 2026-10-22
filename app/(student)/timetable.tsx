import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Badge, EmptyState } from '@/components/ui';
import {
  DAY_NAMES,
  LoadingBlock,
  StudentScreen,
  lectureStatusLabel,
  rowRtl,
} from '@/components/student/ui';
import {
  getStudentSchedule,
  getSubject,
  getTeacher,
} from '@/services/studentPortal';
import type { ScheduleSlot } from '@/types/studentPortal';
import { colors, fonts, radii, spacing } from '@/theme/tokens';

export default function TimetableScreen() {
  const router = useRouter();
  const [day, setDay] = useState(0);
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        setLoading(true);
        const data = await getStudentSchedule(day);
        if (alive) {
          setSlots(data);
          setLoading(false);
        }
      })();
      return () => {
        alive = false;
      };
    }, [day]),
  );

  return (
    <StudentScreen title="الجدول الدراسي" subtitle="يوم وأسبوع" onBack hero>
      <View style={styles.days}>
        {DAY_NAMES.map((name, i) => (
          <Pressable
            key={name}
            onPress={() => setDay(i)}
            style={[styles.dayChip, day === i && styles.dayOn]}
          >
            <Text style={[styles.dayText, day === i && styles.dayTextOn]}>
              {name.slice(0, 3)}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.dayTitle}>{DAY_NAMES[day]}</Text>

      {loading ? (
        <LoadingBlock />
      ) : slots.length === 0 ? (
        <EmptyState
          icon="CalendarClock"
          title="لا حصص في هذا اليوم"
          description="اختر يوماً آخر أو راجع المحاضرات المسجلة"
        />
      ) : (
        slots.map((slot) => {
          const sub = getSubject(slot.subjectId);
          const teacher = getTeacher(slot.teacherId);
          return (
            <Pressable
              key={slot.id}
              style={styles.card}
              onPress={() => {
                if (slot.lectureId) {
                  router.push(`/(student)/lecture/${slot.lectureId}` as never);
                }
              }}
            >
              <Text style={styles.time}>
                {slot.start} – {slot.end}
              </Text>
              <Text style={styles.name}>{sub?.name}</Text>
              <Text style={styles.meta}>
                {teacher?.name}
                {slot.room ? ` · ${slot.room}` : ''}
                {` · ${slot.type === 'live' ? 'مباشرة' : slot.type === 'recorded' ? 'مسجلة' : 'حضورية'}`}
              </Text>
              <Badge
                label={lectureStatusLabel[slot.status]}
                tone={slot.status === 'live' ? 'danger' : 'info'}
              />
            </Pressable>
          );
        })
      )}
    </StudentScreen>
  );
}

const styles = StyleSheet.create({
  days: {
    flexDirection: rowRtl,
    flexWrap: 'wrap',
    gap: 6,
  },
  dayChip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayOn: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  dayText: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.textSecondary,
  },
  dayTextOn: {
    color: colors.primaryDark,
    fontFamily: fonts.semiBold,
  },
  dayTitle: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.text,
    textAlign: 'right',
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: 6,
  },
  time: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: colors.primary,
    textAlign: 'right',
  },
  name: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.text,
    textAlign: 'right',
  },
  meta: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'right',
  },
});
