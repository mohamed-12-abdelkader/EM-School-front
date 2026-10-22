import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar, Badge, Button, Card, useToast } from '@/components/ui';
import { students } from '@/data/mock';
import { colors, fonts, radii, spacing } from '@/theme/tokens';
import type { AttendanceMark } from '@/types';

const marks: AttendanceMark[] = ['حاضر', 'غائب', 'متأخر', 'بعذر'];

export function AttendanceBoard() {
  const { showToast } = useToast();
  const [records, setRecords] = useState(() =>
    students.slice(0, 10).map((s) => ({ ...s, mark: s.attendanceToday as AttendanceMark })),
  );

  const setMark = (id: string, mark: AttendanceMark) => {
    setRecords((prev) => prev.map((row) => (row.id === id ? { ...row, mark } : row)));
  };

  const markAllPresent = () => {
    setRecords((prev) => prev.map((row) => ({ ...row, mark: 'حاضر' })));
    showToast('تم تعليم الجميع حاضرين محلياً', 'success');
  };

  return (
    <Card style={styles.wrap}>
      <View style={styles.head}>
        <Text style={styles.title}>تسجيل حضور سريع — فصل ٣/أ</Text>
        <View style={styles.actions}>
          <Button label="الكل حاضر" size="sm" variant="outline" onPress={markAllPresent} />
          <Button
            label="حفظ المسودة"
            size="sm"
            onPress={() => showToast('تم حفظ مسودة الحضور محلياً (بدون مزامنة خادم)', 'info')}
          />
        </View>
      </View>
      {records.map((student) => (
        <View key={student.id} style={styles.row}>
          <View style={styles.person}>
            <Avatar name={student.name} color={student.avatarColor} size={36} />
            <View>
              <Text style={styles.name}>{student.name}</Text>
              <Text style={styles.meta}>{student.code}</Text>
            </View>
          </View>
          <View style={styles.marks}>
            {marks.map((mark) => {
              const active = student.mark === mark;
              return (
                <Pressable
                  key={mark}
                  onPress={() => setMark(student.id, mark)}
                  style={[styles.markBtn, active && styles.markActive]}
                >
                  <Text style={[styles.markText, active && styles.markTextActive]}>{mark}</Text>
                </Pressable>
              );
            })}
          </View>
          <Badge
            label={student.mark}
            tone={
              student.mark === 'حاضر'
                ? 'success'
                : student.mark === 'غائب'
                  ? 'danger'
                  : student.mark === 'متأخر'
                    ? 'warning'
                    : 'info'
            }
          />
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md, marginBottom: spacing.lg },
  head: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  title: { fontFamily: fonts.semiBold, fontSize: 15, color: colors.text, textAlign: 'right' },
  actions: { flexDirection: 'row-reverse', gap: spacing.sm },
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexWrap: 'wrap',
  },
  person: { flexDirection: 'row-reverse', alignItems: 'center', gap: spacing.sm, minWidth: 180, flex: 1 },
  name: { fontFamily: fonts.semiBold, fontSize: 13, color: colors.text, textAlign: 'right' },
  meta: { fontFamily: fonts.regular, fontSize: 11, color: colors.textSecondary, textAlign: 'right' },
  marks: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 6 },
  markBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  markActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  markText: { fontFamily: fonts.medium, fontSize: 12, color: colors.textSecondary },
  markTextActive: { color: colors.primary, fontFamily: fonts.semiBold },
});
