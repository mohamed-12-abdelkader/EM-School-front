import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/components/ui';
import { teacherTheme as t } from './theme';
import { rowRtl } from './ui';
import { getTeacherClasses } from '@/api/teacherPortal';
import type { TeacherClass } from '@/types/teacherPortal';

export function ClassSubjectPicker({
  value,
  onChange,
}: {
  value: { classroom_id: number; subject_id: number } | null;
  onChange: (v: { classroom_id: number; subject_id: number; label: string }) => void;
}) {
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTeacherClasses()
      .then((r) => setClasses(r.classes))
      .catch(() => setClasses([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <Text style={styles.empty}>جارٍ تحميل الصفوف...</Text>;
  }

  if (classes.length === 0) {
    return (
      <View style={styles.emptyBox}>
        <Icon name="Users" size={20} color={t.inkMute} />
        <Text style={styles.empty}>لا توجد صفوف معيّنة لك من الجدول حالياً</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      {classes.map((c) => {
        const selected =
          value?.classroom_id === c.classroom_id && value?.subject_id === c.subject_id;
        const label = `${c.grade_name} · ${c.classroom_name} · ${c.subject_name}`;
        return (
          <Pressable
            key={`${c.classroom_id}-${c.subject_id}`}
            onPress={() =>
              onChange({
                classroom_id: c.classroom_id,
                subject_id: c.subject_id,
                label,
              })
            }
            style={[styles.item, selected && styles.itemActive]}
          >
            <View style={[styles.row, { flexDirection: rowRtl as 'row' }]}>
              <View style={[styles.radio, selected && styles.radioOn]}>
                {selected ? <View style={styles.radioDot} /> : null}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.text, selected && styles.textActive]}>{label}</Text>
                <Text style={styles.meta}>
                  {c.students_count} طالب · {c.weekly_slots} حصة/أسبوع
                </Text>
              </View>
              {selected ? <Icon name="Check" size={18} color={t.brand} /> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  emptyBox: {
    alignItems: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 14,
    backgroundColor: t.cardMuted,
    borderWidth: 1,
    borderColor: t.line,
  },
  empty: {
    fontFamily: t.fonts.regular,
    color: t.inkMute,
    writingDirection: 'rtl',
    textAlign: 'center',
    fontSize: 13,
  },
  item: {
    borderWidth: 1,
    borderColor: t.line,
    backgroundColor: t.cardMuted,
    borderRadius: 16,
    padding: 14,
  },
  itemActive: {
    borderColor: t.brand,
    backgroundColor: t.brandSoft,
  },
  row: { alignItems: 'center', gap: 12 },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: t.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { borderColor: t.brand },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: t.brand,
  },
  text: {
    fontFamily: t.fonts.semiBold,
    fontSize: 13,
    color: t.ink,
    writingDirection: 'rtl',
  },
  textActive: { color: t.brandDeep },
  meta: {
    marginTop: 2,
    fontFamily: t.fonts.regular,
    fontSize: 11,
    color: t.inkMute,
    writingDirection: 'rtl',
    fontVariant: ['tabular-nums'],
  },
});
