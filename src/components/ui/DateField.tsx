import { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors, fonts, radii, shadows, spacing } from '@/theme/tokens';
import { Icon } from './Icon';

const WEEKDAYS = ['أحد', 'إثن', 'ثلا', 'أرب', 'خمي', 'جمع', 'سبت'];
const MONTHS = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
];

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

/** Format Date → YYYY-MM-DD (local) */
export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** Parse YYYY-MM-DD → Date (local) or null */
export function parseISODate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const day = Number(m[3]);
  const d = new Date(y, mo, day);
  if (d.getFullYear() !== y || d.getMonth() !== mo || d.getDate() !== day) {
    return null;
  }
  return d;
}

function formatDisplay(iso: string): string {
  const d = parseISODate(iso);
  if (!d) return iso;
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function buildMonthGrid(year: number, month: number) {
  const first = new Date(year, month, 1);
  const startPad = first.getDay(); // 0 = Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(new Date(year, month, day));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export interface DateFieldProps {
  value: string;
  onChange: (next: string) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  /** Allow clearing the value */
  clearable?: boolean;
  disabled?: boolean;
  minimumDate?: string;
  maximumDate?: string;
}

export function DateField({
  value,
  onChange,
  label,
  placeholder = 'اختر التاريخ',
  error,
  clearable = false,
  disabled = false,
  minimumDate,
  maximumDate,
}: DateFieldProps) {
  const selected = parseISODate(value);
  const today = useMemo(() => {
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth(), t.getDate());
  }, []);

  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(
    () => selected?.getFullYear() ?? today.getFullYear(),
  );
  const [viewMonth, setViewMonth] = useState(
    () => selected?.getMonth() ?? today.getMonth(),
  );

  const minD = parseISODate(minimumDate);
  const maxD = parseISODate(maximumDate);

  const openPicker = () => {
    if (disabled) return;
    const base = selected ?? today;
    setViewYear(base.getFullYear());
    setViewMonth(base.getMonth());
    setOpen(true);
  };

  const shiftMonth = (delta: number) => {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  };

  const isDisabledDay = (d: Date) => {
    if (minD && d < minD) return true;
    if (maxD && d > maxD) return true;
    return false;
  };

  const pick = (d: Date) => {
    if (isDisabledDay(d)) return;
    onChange(toISODate(d));
    setOpen(false);
  };

  const cells = buildMonthGrid(viewYear, viewMonth);

  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <Pressable
        onPress={openPicker}
        disabled={disabled}
        style={({ pressed }) => [
          styles.field,
          error ? styles.fieldError : null,
          disabled ? styles.fieldDisabled : null,
          pressed && !disabled ? styles.fieldPressed : null,
        ]}
      >
        <Icon name="CalendarDays" size={18} color={colors.textMuted} />
        <Text
          style={[styles.valueText, !value ? styles.placeholder : null]}
          numberOfLines={1}
        >
          {value ? formatDisplay(value) : placeholder}
        </Text>
        {clearable && value && !disabled ? (
          <Pressable
            onPress={(e) => {
              e?.stopPropagation?.();
              onChange('');
            }}
            hitSlop={8}
            style={styles.clearBtn}
          >
            <Icon name="X" size={14} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </Pressable>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
          <View style={styles.sheet}>
            <View style={styles.head}>
              <Pressable onPress={() => shiftMonth(1)} style={styles.navBtn} hitSlop={8}>
                <Icon name="ChevronLeft" size={20} color={colors.text} />
              </Pressable>
              <Text style={styles.monthTitle}>
                {MONTHS[viewMonth]} {viewYear}
              </Text>
              <Pressable onPress={() => shiftMonth(-1)} style={styles.navBtn} hitSlop={8}>
                <Icon name="ChevronRight" size={20} color={colors.text} />
              </Pressable>
            </View>

            <View style={styles.weekRow}>
              {WEEKDAYS.map((w) => (
                <Text key={w} style={styles.weekday}>
                  {w}
                </Text>
              ))}
            </View>

            <View style={styles.grid}>
              {cells.map((cell, i) => {
                if (!cell) {
                  return <View key={`e-${i}`} style={styles.dayCell} />;
                }
                const iso = toISODate(cell);
                const isSelected = selected ? sameDay(cell, selected) : false;
                const isToday = sameDay(cell, today);
                const off = isDisabledDay(cell);
                return (
                  <Pressable
                    key={iso}
                    onPress={() => pick(cell)}
                    disabled={off}
                    style={[
                      styles.dayCell,
                      isSelected && styles.daySelected,
                      isToday && !isSelected && styles.dayToday,
                      off && styles.dayDisabled,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        isSelected && styles.dayTextSelected,
                        isToday && !isSelected && styles.dayTextToday,
                        off && styles.dayTextDisabled,
                      ]}
                    >
                      {cell.getDate()}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.footer}>
              {clearable ? (
                <Pressable
                  onPress={() => {
                    onChange('');
                    setOpen(false);
                  }}
                  style={styles.footerBtn}
                >
                  <Text style={styles.footerBtnMuted}>مسح</Text>
                </Pressable>
              ) : (
                <View />
              )}
              <Pressable
                onPress={() => {
                  if (!isDisabledDay(today)) pick(today);
                }}
                style={styles.footerBtn}
              >
                <Text style={styles.footerBtnPrimary}>اليوم</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  label: {
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: colors.text,
    textAlign: 'right',
  },
  field: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    minHeight: 44,
  },
  fieldError: {
    borderColor: colors.danger,
  },
  fieldDisabled: {
    opacity: 0.55,
  },
  fieldPressed: {
    opacity: 0.85,
  },
  valueText: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.text,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  placeholder: {
    color: colors.textMuted,
  },
  clearBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.danger,
    textAlign: 'right',
  },
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  sheet: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.xl,
    gap: spacing.md,
    ...shadows.md,
  },
  head: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  monthTitle: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
  },
  weekRow: {
    flexDirection: 'row-reverse',
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fonts.medium,
    fontSize: 11,
    color: colors.textMuted,
    paddingVertical: 4,
  },
  grid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.2857%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.full,
  },
  daySelected: {
    backgroundColor: colors.primary,
  },
  dayToday: {
    borderWidth: 1,
    borderColor: colors.primary,
  },
  dayDisabled: {
    opacity: 0.35,
  },
  dayText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.text,
  },
  dayTextSelected: {
    color: colors.onBrand,
    fontFamily: fonts.semiBold,
  },
  dayTextToday: {
    color: colors.primaryDark,
  },
  dayTextDisabled: {
    color: colors.textMuted,
  },
  footer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  footerBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  footerBtnPrimary: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: colors.primary,
  },
  footerBtnMuted: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.textMuted,
  },
});
