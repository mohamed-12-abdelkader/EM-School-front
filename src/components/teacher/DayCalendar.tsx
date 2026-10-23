import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/components/ui';
import { teacherTheme as t } from './theme';
import { rowRtl } from './ui';

const WEEKDAYS_AR = ['أحد', 'إثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت'];

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(12, 0, 0, 0);
  return x;
}

function toYmd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseYmd(value: string | null | undefined): Date | null {
  if (!value?.trim()) return null;
  const d = new Date(`${value.trim()}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function monthLabel(d: Date) {
  try {
    return d.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' });
  } catch {
    return `${d.getMonth() + 1}/${d.getFullYear()}`;
  }
}

function buildMonthGrid(viewMonth: Date) {
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const first = new Date(year, month, 1, 12);
  const startPad = first.getDay(); // 0 = Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(new Date(year, month, day, 12));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function DayCalendarModal({
  visible,
  value,
  onClose,
  onSelect,
  minDate,
}: {
  visible: boolean;
  value: string;
  onClose: () => void;
  onSelect: (ymd: string) => void;
  minDate?: Date;
}) {
  const selected = parseYmd(value);
  const min = minDate ? startOfDay(minDate) : null;
  const [view, setView] = useState(() => selected || startOfDay(new Date()));

  useEffect(() => {
    if (visible) {
      setView(selected || startOfDay(new Date()));
    }
  }, [visible, value]);

  const cells = useMemo(() => buildMonthGrid(view), [view]);
  const todayYmd = toYmd(startOfDay(new Date()));
  const selectedYmd = selected ? toYmd(selected) : '';

  const shiftMonth = (delta: number) => {
    setView((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1, 12));
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={[styles.head, { flexDirection: rowRtl as 'row' }]}>
            <Pressable onPress={() => shiftMonth(1)} style={styles.navBtn}>
              <Icon name="ChevronLeft" size={20} color={t.ink} />
            </Pressable>
            <Text style={styles.monthTitle}>{monthLabel(view)}</Text>
            <Pressable onPress={() => shiftMonth(-1)} style={styles.navBtn}>
              <Icon name="ChevronRight" size={20} color={t.ink} />
            </Pressable>
          </View>

          <View style={styles.weekRow}>
            {WEEKDAYS_AR.map((d) => (
              <Text key={d} style={styles.weekDay}>
                {d}
              </Text>
            ))}
          </View>

          <View style={styles.grid}>
            {cells.map((cell, i) => {
              if (!cell) {
                return <View key={`e-${i}`} style={styles.cell} />;
              }
              const ymd = toYmd(cell);
              const isSelected = ymd === selectedYmd;
              const isToday = ymd === todayYmd;
              const disabled = min ? cell.getTime() < min.getTime() : false;
              return (
                <Pressable
                  key={ymd}
                  disabled={disabled}
                  onPress={() => {
                    onSelect(ymd);
                    onClose();
                  }}
                  style={[
                    styles.cell,
                    isToday && !isSelected && styles.cellToday,
                    isSelected && styles.cellSelected,
                    disabled && styles.cellDisabled,
                  ]}
                >
                  <Text
                    style={[
                      styles.cellText,
                      isSelected && styles.cellTextSelected,
                      disabled && styles.cellTextDisabled,
                    ]}
                  >
                    {cell.getDate()}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={[styles.actions, { flexDirection: rowRtl as 'row' }]}>
            <Pressable
              onPress={() => {
                const ymd = toYmd(startOfDay(new Date()));
                onSelect(ymd);
                onClose();
              }}
              style={styles.todayBtn}
            >
              <Text style={styles.todayBtnText}>اليوم</Text>
            </Pressable>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>إغلاق</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/** Tap target that opens the calendar and shows the chosen day. */
export function DueDatePickerField({
  value,
  onChange,
  previewLabel,
}: {
  value: string;
  onChange: (ymd: string) => void;
  previewLabel: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={[styles.field, { flexDirection: rowRtl as 'row' }]}
      >
        <View style={styles.fieldIcon}>
          <Icon name="CalendarDays" size={20} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.fieldLabel}>اختر يوماً من التقويم</Text>
          <Text style={styles.fieldValue}>
            {value ? previewLabel : 'اضغط لفتح التقويم'}
          </Text>
          {value ? <Text style={styles.fieldYmd}>{value}</Text> : null}
        </View>
        <Icon name="ChevronLeft" size={18} color={t.inkMute} />
      </Pressable>

      <DayCalendarModal
        visible={open}
        value={value}
        onClose={() => setOpen(false)}
        onSelect={onChange}
        minDate={startOfDay(new Date())}
      />
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  sheet: {
    backgroundColor: t.card,
    borderRadius: 22,
    padding: 16,
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
    ...t.shadow.float,
  },
  head: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: t.cardMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitle: {
    fontFamily: t.fonts.bold,
    fontSize: 16,
    color: t.ink,
    writingDirection: 'rtl',
  },
  weekRow: {
    flexDirection: 'row-reverse',
    marginBottom: 6,
  },
  weekDay: {
    flex: 1,
    textAlign: 'center',
    fontFamily: t.fonts.semiBold,
    fontSize: 11,
    color: t.inkMute,
  },
  grid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
  },
  cell: {
    width: '14.28%',
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  cellToday: {
    backgroundColor: t.brandSoft,
  },
  cellSelected: {
    backgroundColor: t.brand,
  },
  cellDisabled: {
    opacity: 0.35,
  },
  cellText: {
    fontFamily: t.fonts.semiBold,
    fontSize: 14,
    color: t.ink,
    fontVariant: ['tabular-nums'],
  },
  cellTextSelected: {
    color: '#fff',
    fontFamily: t.fonts.bold,
  },
  cellTextDisabled: {
    color: t.inkMute,
  },
  actions: {
    marginTop: 12,
    gap: 8,
    justifyContent: 'space-between',
  },
  todayBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: t.brandSoft,
  },
  todayBtnText: {
    fontFamily: t.fonts.semiBold,
    fontSize: 13,
    color: t.brandDeep,
    writingDirection: 'rtl',
  },
  closeBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: t.cardMuted,
  },
  closeBtnText: {
    fontFamily: t.fonts.medium,
    fontSize: 13,
    color: t.inkSoft,
    writingDirection: 'rtl',
  },
  field: {
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: t.cardMuted,
    borderWidth: 1,
    borderColor: t.line,
  },
  fieldIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: t.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldLabel: {
    fontFamily: t.fonts.regular,
    fontSize: 12,
    color: t.inkMute,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  fieldValue: {
    marginTop: 2,
    fontFamily: t.fonts.bold,
    fontSize: 15,
    color: t.ink,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  fieldYmd: {
    marginTop: 2,
    fontFamily: t.fonts.regular,
    fontSize: 12,
    color: t.brand,
    writingDirection: 'rtl',
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
});
