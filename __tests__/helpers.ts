import { Doctor, MonthConfig, ScheduleEntry, ScheduleRule } from '@/lib/types';
import { defaultRules } from '@/lib/default-rules';

/** Format date the same way the scheduler does (matches toISOString which may shift by TZ) */
export function dateStr(year: number, month: number, day: number): string {
  return new Date(year, month - 1, day).toISOString().split('T')[0];
}

/** Create a minimal doctor for testing */
export function makeDoctor(overrides: Partial<Doctor> & { id: string; name: string }): Doctor {
  return {
    canRepublic: true,
    canDepartment: true,
    maxRepublicPerMonth: null,
    maxDepartmentPerMonth: null,
    maxTotalPerMonth: null,
    polyclinicSchedule: [],
    unavailableDates: [],
    preferences: '',
    ...overrides,
  };
}

/** Create N generic doctors */
export function makeDoctors(count: number): Doctor[] {
  return Array.from({ length: count }, (_, i) =>
    makeDoctor({ id: `doc${i + 1}`, name: `Gydytojas ${i + 1}` })
  );
}

/** Standard month config for testing (January 2026 — 31 days, starts Thursday) */
export function makeConfig(overrides?: Partial<MonthConfig>): MonthConfig {
  return {
    year: 2026,
    month: 1,
    holidays: [1], // Jan 1 = Naujieji metai
    maxWeeklyHours: 55.5,
    shiftDurationHours: 24,
    ...overrides,
  };
}

/** Build a blank schedule for a given config */
export function makeBlankSchedule(config: MonthConfig): ScheduleEntry[] {
  const daysInMonth = new Date(config.year, config.month, 0).getDate();
  const entries: ScheduleEntry[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(config.year, config.month - 1, day);
    const jsDay = date.getDay();
    const weekday = jsDay === 0 ? 6 : jsDay - 1;
    entries.push({
      day,
      date: date.toISOString().split('T')[0],
      weekday,
      isWeekend: weekday >= 5,
      isHoliday: config.holidays.includes(day),
      clinicDoctor: null,
      republicDoctor: null,
      departmentDoctor: null,
      residentDoctor: null,
    });
  }
  return entries;
}

/** Build a schedule with specific assignments */
export function assignSchedule(
  schedule: ScheduleEntry[],
  assignments: { day: number; republic?: string; department?: string }[]
): ScheduleEntry[] {
  const result = schedule.map(e => ({ ...e }));
  for (const a of assignments) {
    const entry = result.find(e => e.day === a.day);
    if (!entry) continue;
    if (a.republic !== undefined) entry.republicDoctor = a.republic;
    if (a.department !== undefined) entry.departmentDoctor = a.department;
  }
  return result;
}

/** Get all rules with all enabled */
export function allRulesEnabled(): ScheduleRule[] {
  return defaultRules.map(r => ({ ...r, enabled: true }));
}

/** Get all rules with specific one disabled */
export function rulesWithDisabled(...types: string[]): ScheduleRule[] {
  return defaultRules.map(r => ({
    ...r,
    enabled: types.includes(r.type) ? false : r.enabled,
  }));
}
