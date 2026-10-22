import type { PeriodTemplate, TimetableSettings, SlotType } from '@/types/timetables';

export const DAY_LABELS = [
  'الأحد',
  'الاثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
  'السبت',
] as const;

export const SLOT_TYPE_LABELS: Record<SlotType, string> = {
  lesson: 'حصة',
  break: 'راحة',
  activity: 'نشاط',
  reserve: 'احتياطي',
};

export function formatTime(value: string) {
  return String(value || '').slice(0, 5);
}

function addMinutes(hhmm: string, minutes: number) {
  const [h, m] = formatTime(hhmm).split(':').map(Number);
  const total = h * 60 + m + minutes;
  const nh = Math.floor(((total % (24 * 60)) + 24 * 60) % (24 * 60) / 60);
  const nm = ((total % 60) + 60) % 60;
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
}

export interface PeriodInfo {
  period_number: number;
  start_time: string;
  end_time: string;
  label: string;
  slot_type: SlotType;
}

export function resolvePeriodInfo(
  periodNumber: number,
  dayOfWeek: number,
  settings: TimetableSettings,
  templates: PeriodTemplate[],
): PeriodInfo {
  const daySpecific = templates.find(
    (t) => t.day_of_week === dayOfWeek && t.period_number === periodNumber,
  );
  const global = templates.find(
    (t) => (t.day_of_week == null || t.day_of_week === undefined) && t.period_number === periodNumber,
  );
  const tpl = daySpecific || global;
  if (tpl) {
    return {
      period_number: periodNumber,
      start_time: formatTime(tpl.start_time),
      end_time: formatTime(tpl.end_time),
      label: tpl.label || `الحصة ${periodNumber}`,
      slot_type: tpl.slot_type || 'lesson',
    };
  }

  const start = addMinutes(
    formatTime(settings.day_start_time),
    (periodNumber - 1) * settings.default_period_minutes,
  );
  const end = addMinutes(start, settings.default_period_minutes);
  return {
    period_number: periodNumber,
    start_time: start,
    end_time: end,
    label: `الحصة ${periodNumber}`,
    slot_type: 'lesson',
  };
}

export function conflictMessage(code: string) {
  const map: Record<string, string> = {
    DUPLICATE_CELL: 'خانة مكررة في نفس اليوم والحصة',
    OVERLAPPING_TIMES: 'تداخل أوقات في نفس اليوم',
    TEACHER_BUSY: 'المدرس مشغول في فصل آخر',
    SUBJECT_NOT_IN_GRADE: 'المادة غير مربوطة بصف هذا الفصل',
    TEACHER_SUBJECT_MISMATCH: 'المدرس غير معيّن لهذه المادة',
    INVALID_LESSON_FIELDS: 'حصة درس بدون مادة أو مدرس',
    INVALID_TIME_RANGE: 'وقت النهاية غير صالح',
  };
  return map[code] || code;
}
