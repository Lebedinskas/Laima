import { describe, it, expect } from 'vitest';
import {
  WEEKDAY_NAMES_SHORT,
  WEEKDAY_NAMES_FULL,
  MONTH_NAMES,
  getLithuanianHolidays,
  getHolidaysForMonth,
  formatPolyclinicSchedule,
  DEFAULT_MAX_WEEKLY_HOURS,
  DEFAULT_SHIFT_DURATION,
  MIN_REST_DAYS,
} from '@/lib/constants';

describe('constants', () => {
  it('has 7 weekday names (short and full)', () => {
    expect(WEEKDAY_NAMES_SHORT).toHaveLength(7);
    expect(WEEKDAY_NAMES_FULL).toHaveLength(7);
    expect(WEEKDAY_NAMES_SHORT[0]).toBe('Pr');
    expect(WEEKDAY_NAMES_SHORT[6]).toBe('Sk');
    expect(WEEKDAY_NAMES_FULL[0]).toBe('Pirmadienis');
    expect(WEEKDAY_NAMES_FULL[6]).toBe('Sekmadienis');
  });

  it('has 12 month names', () => {
    expect(MONTH_NAMES).toHaveLength(12);
    expect(MONTH_NAMES[0]).toBe('Sausis');
    expect(MONTH_NAMES[11]).toBe('Gruodis');
  });

  it('has correct default values', () => {
    expect(DEFAULT_MAX_WEEKLY_HOURS).toBe(55.5);
    expect(DEFAULT_SHIFT_DURATION).toBe(24);
    expect(MIN_REST_DAYS).toBe(2);
  });
});

describe('getLithuanianHolidays', () => {
  it('returns all fixed holidays for any year', () => {
    const holidays = getLithuanianHolidays(2026);
    const names = holidays.map(h => h.name);

    // Fixed holidays
    expect(names).toContain('Naujieji metai');
    expect(names).toContain('Valstybės atkūrimo diena');
    expect(names).toContain('Nepriklausomybės atkūrimo diena');
    expect(names).toContain('Tarptautinė darbo diena');
    expect(names).toContain('Joninės (Rasos)');
    expect(names).toContain('Kalėdos (pirma diena)');
    expect(names).toContain('Kalėdos (antra diena)');
    expect(names).toContain('Kūčios');
  });

  it('includes Easter and Easter Monday', () => {
    const holidays = getLithuanianHolidays(2026);
    const names = holidays.map(h => h.name);
    expect(names).toContain('Velykos');
    expect(names).toContain('Velykų antroji diena');
  });

  it('has at least 14 holidays', () => {
    const holidays = getLithuanianHolidays(2026);
    expect(holidays.length).toBeGreaterThanOrEqual(14);
  });

  it('returns holidays sorted by month then day', () => {
    const holidays = getLithuanianHolidays(2026);
    for (let i = 1; i < holidays.length; i++) {
      const prev = holidays[i - 1];
      const curr = holidays[i];
      expect(prev.month * 100 + prev.day).toBeLessThanOrEqual(curr.month * 100 + curr.day);
    }
  });

  it('computes Easter correctly for 2026 (April 5)', () => {
    const holidays = getLithuanianHolidays(2026);
    const easter = holidays.find(h => h.name === 'Velykos');
    expect(easter).toBeDefined();
    expect(easter!.month).toBe(4);
    expect(easter!.day).toBe(5);
  });

  it('computes Easter correctly for 2025 (April 20)', () => {
    const holidays = getLithuanianHolidays(2025);
    const easter = holidays.find(h => h.name === 'Velykos');
    expect(easter).toBeDefined();
    expect(easter!.month).toBe(4);
    expect(easter!.day).toBe(20);
  });

  it('computes Easter Monday as day after Easter', () => {
    const holidays = getLithuanianHolidays(2026);
    const easter = holidays.find(h => h.name === 'Velykos')!;
    const monday = holidays.find(h => h.name === 'Velykų antroji diena')!;

    const easterDate = new Date(2026, easter.month - 1, easter.day);
    const mondayDate = new Date(2026, monday.month - 1, monday.day);
    const diff = (mondayDate.getTime() - easterDate.getTime()) / 86400000;
    expect(diff).toBe(1);
  });
});

describe('getHolidaysForMonth', () => {
  it('returns only holidays for the specified month', () => {
    const janHolidays = getHolidaysForMonth(2026, 1);
    expect(janHolidays.length).toBeGreaterThanOrEqual(1);
    expect(janHolidays.some(h => h.day === 1)).toBe(true);
  });

  it('returns empty array for months without holidays', () => {
    // September typically has no Lithuanian holidays
    const sepHolidays = getHolidaysForMonth(2026, 9);
    expect(sepHolidays).toHaveLength(0);
  });

  it('returns December holidays (Kūčios, Kalėdos)', () => {
    const decHolidays = getHolidaysForMonth(2026, 12);
    expect(decHolidays.length).toBeGreaterThanOrEqual(3);
    expect(decHolidays.some(h => h.day === 24)).toBe(true);
    expect(decHolidays.some(h => h.day === 25)).toBe(true);
    expect(decHolidays.some(h => h.day === 26)).toBe(true);
  });
});

describe('formatPolyclinicSchedule', () => {
  it('returns dash for empty schedule', () => {
    expect(formatPolyclinicSchedule([])).toBe('—');
  });

  it('formats single slot', () => {
    const result = formatPolyclinicSchedule([{ weekday: 0, startHour: 9, endHour: 13 }]);
    expect(result).toBe('Pirm. 9-13');
  });

  it('formats multiple slots sorted by weekday', () => {
    const result = formatPolyclinicSchedule([
      { weekday: 2, startHour: 10, endHour: 14 },
      { weekday: 0, startHour: 8, endHour: 12 },
    ]);
    expect(result).toBe('Pirm. 8-12; Treč. 10-14');
  });

  it('handles all weekdays', () => {
    for (let wd = 0; wd < 7; wd++) {
      const result = formatPolyclinicSchedule([{ weekday: wd, startHour: 9, endHour: 12 }]);
      expect(result).toContain('9-12');
    }
  });
});
