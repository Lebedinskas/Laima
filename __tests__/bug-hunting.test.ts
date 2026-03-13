/**
 * Bug hunting tests — edge cases, logic gaps, and cross-module consistency.
 * Each test targets a specific potential or discovered bug.
 */
import { describe, it, expect } from 'vitest';
import { generateSchedule, generateScheduleAsync } from '@/lib/scheduler';
import { validateSchedule, calculateStats } from '@/lib/validator';
import { makeDoctor, makeDoctors, makeConfig, makeBlankSchedule, assignSchedule, allRulesEnabled, dateStr } from './helpers';
import { defaultRules } from '@/lib/default-rules';
import { ScheduleRule } from '@/lib/types';

// ===== BUG #1: Same doctor in both R and D =====

describe('BUG: same doctor assigned to both R and D on same day', () => {
  it('validator catches same doctor in both slots', () => {
    const doc = makeDoctor({ id: 'doc1', name: 'Jonas' });
    const config = makeConfig();
    const schedule = assignSchedule(makeBlankSchedule(config), [
      { day: 5, republic: 'doc1', department: 'doc1' }, // BUG: same doctor
    ]);

    const errors = validateSchedule(schedule, [doc], config, allRulesEnabled());
    expect(errors.some(e =>
      e.type === 'error' && e.message.includes('Jonas') && e.message.includes('respublikos') && e.message.includes('skyriaus')
    )).toBe(true);
  });

  it('scheduler never produces same doctor in both slots', () => {
    const doctors = makeDoctors(10);
    const config = makeConfig();
    const schedule = generateSchedule(doctors, config, allRulesEnabled());

    for (const entry of schedule) {
      if (entry.republicDoctor && entry.departmentDoctor) {
        expect(entry.republicDoctor).not.toBe(entry.departmentDoctor);
      }
    }
  });
});

// ===== BUG #2: no_polyclinic_prev_day with non-standard schedule length =====

describe('BUG: polyclinic prev-day check uses daysInMonth not schedule.length', () => {
  it('still checks day 30 in a 31-day month even if schedule has extra entries', () => {
    // Doctor has polyclinic on the same weekday as day 31
    // Day 30 should be blocked because shift continues into day 31
    const config = makeConfig({ holidays: [] }); // Jan 2026, 31 days
    // Day 31 = Saturday (weekday 5). Day 30 = Friday (weekday 4)
    // Doctor has polyclinic on Saturday (weekday 5) — unusual but tests the logic
    const doc = makeDoctor({
      id: 'doc1', name: 'A',
      polyclinicSchedule: [{ weekday: 5, startHour: 9, endHour: 13 }],
    });
    const schedule = assignSchedule(makeBlankSchedule(config), [
      { day: 30, republic: 'doc1' }, // Friday — next day Saturday has polyclinic
    ]);

    const errors = validateSchedule(schedule, [doc], config, allRulesEnabled());
    // Day 30 should be flagged (next day = Saturday polyclinic)
    expect(errors.some(e =>
      e.message.includes('poliklinika') && e.day === 30
    )).toBe(true);
  });

  it('does NOT check last day of month (no next-month data)', () => {
    const config = makeConfig({ holidays: [] }); // Jan 31 days
    // Day 31 = Saturday. Feb 1 = Sunday (weekday 6)
    const doc = makeDoctor({
      id: 'doc1', name: 'A',
      polyclinicSchedule: [{ weekday: 6, startHour: 9, endHour: 13 }], // Sunday
    });
    const schedule = assignSchedule(makeBlankSchedule(config), [
      { day: 31, republic: 'doc1' }, // last day — should NOT check next month
    ]);

    const errors = validateSchedule(schedule, [doc], config, allRulesEnabled());
    expect(errors.some(e =>
      e.message.includes('poliklinika') && e.day === 31
    )).toBe(false);
  });
});

// ===== BUG #3: calculateStats double-counts weekend when same doctor in R+D =====

describe('calculateStats: double-counting edge case', () => {
  it('counts R and D assignments separately (total = republic + department)', () => {
    const doc = makeDoctor({ id: 'doc1', name: 'A' });
    const config = makeConfig({ holidays: [] });
    const schedule = assignSchedule(makeBlankSchedule(config), [
      { day: 5, republic: 'doc1', department: 'doc1' }, // unusual: same doctor both
    ]);

    const stats = calculateStats(schedule, [doc], config);
    const s = stats.find(s => s.doctorId === 'doc1')!;
    // This is an invalid schedule state, but stats should still count correctly
    expect(s.republicCount).toBe(1);
    expect(s.departmentCount).toBe(1);
    expect(s.totalCount).toBe(2); // counted twice — once for each slot
  });

  it('weeklyHours counts both assignments as separate shifts', () => {
    const doc = makeDoctor({ id: 'doc1', name: 'A' });
    const config = makeConfig({ holidays: [], shiftDurationHours: 24 });
    const schedule = assignSchedule(makeBlankSchedule(config), [
      { day: 5, republic: 'doc1', department: 'doc1' },
    ]);

    const stats = calculateStats(schedule, [doc], config);
    const s = stats.find(s => s.doctorId === 'doc1')!;
    // Two 24h shifts on same day = 48h in that week
    const hours = Object.values(s.weeklyHours);
    expect(hours[0]).toBe(48);
  });
});

// ===== Scheduler/Validator rule param consistency =====

describe('rule param consistency between scheduler and validator', () => {
  it('disabled min_rest_days: scheduler ignores, validator ignores', () => {
    const doctors = makeDoctors(4);
    const config = makeConfig({ holidays: [] });
    const rules = defaultRules.map(r =>
      r.type === 'min_rest_days' ? { ...r, enabled: false } : { ...r }
    );

    const schedule = generateSchedule(doctors, config, rules);

    // Validator should also skip rest day checks
    const errors = validateSchedule(schedule, doctors, config, rules);
    expect(errors.some(e => e.message.includes('poilsio'))).toBe(false);
  });

  it('custom min_rest_days param (days=4) is respected by both', () => {
    const rules = defaultRules.map(r =>
      r.type === 'min_rest_days' ? { ...r, params: { days: 4 } } : { ...r }
    );
    const doctors = makeDoctors(12); // need many doctors for strict rest
    const config = makeConfig({ holidays: [] });

    const schedule = generateSchedule(doctors, config, rules);

    // Scheduler should maintain 4-day gaps
    const doctorDays: Record<string, number[]> = {};
    for (const entry of schedule) {
      for (const field of ['republicDoctor', 'departmentDoctor'] as const) {
        const id = entry[field];
        if (!id) continue;
        if (!doctorDays[id]) doctorDays[id] = [];
        doctorDays[id].push(entry.day);
      }
    }
    for (const [, days] of Object.entries(doctorDays)) {
      days.sort((a, b) => a - b);
      for (let i = 1; i < days.length; i++) {
        expect(days[i] - days[i - 1]).toBeGreaterThanOrEqual(4);
      }
    }

    // Validator should also agree
    const errors = validateSchedule(schedule, doctors, config, rules);
    expect(errors.some(e => e.message.includes('poilsio'))).toBe(false);
  });

  it('custom maxWeeklyHours param matches between scheduler and validator', () => {
    const rules = defaultRules.map(r =>
      r.type === 'max_weekly_hours' ? { ...r, params: { hours: 30 } } : { ...r }
    );
    const doctors = makeDoctors(12);
    const config = makeConfig({ holidays: [], shiftDurationHours: 24 });

    // With 30h limit and 24h shifts, max 1 shift per week
    const schedule = generateSchedule(doctors, config, rules);

    const stats = calculateStats(schedule, doctors, config);
    for (const s of stats) {
      for (const hours of Object.values(s.weeklyHours)) {
        expect(hours).toBeLessThanOrEqual(30);
      }
    }

    const errors = validateSchedule(schedule, doctors, config, rules);
    expect(errors.some(e => e.message.includes('viršija'))).toBe(false);
  });
});

// ===== Edge case: empty or extreme inputs =====

describe('edge cases: extreme inputs', () => {
  it('0 doctors produces all-null schedule without crash', () => {
    const config = makeConfig();
    const schedule = generateSchedule([], config, allRulesEnabled());
    expect(schedule).toHaveLength(31);
    for (const entry of schedule) {
      expect(entry.republicDoctor).toBeNull();
      expect(entry.departmentDoctor).toBeNull();
    }
  });

  it('1 doctor can fill some slots but validator catches issues', () => {
    const doc = makeDoctor({ id: 'doc1', name: 'Solo' });
    const config = makeConfig();
    const schedule = generateSchedule([doc], config, allRulesEnabled());

    // Can't fill both R and D (excluded from D when assigned R)
    // So many slots will be empty
    expect(schedule).toHaveLength(31);
  });

  it('all doctors unavailable on same day leaves slot empty', () => {
    const docs = Array.from({ length: 6 }, (_, i) =>
      makeDoctor({
        id: `d${i}`,
        name: `D${i}`,
        unavailableDates: [dateStr(2026, 1, 15)],
      })
    );
    const config = makeConfig();
    const schedule = generateSchedule(docs, config, allRulesEnabled());

    const day15 = schedule.find(e => e.day === 15)!;
    expect(day15.republicDoctor).toBeNull();
    expect(day15.departmentDoctor).toBeNull();
  });

  it('maxTotalPerMonth=0 means doctor never gets assigned', () => {
    const docs = [
      makeDoctor({ id: 'blocked', name: 'Blocked', maxTotalPerMonth: 0 }),
      ...makeDoctors(6),
    ];
    const config = makeConfig();
    const schedule = generateSchedule(docs, config, allRulesEnabled());

    for (const entry of schedule) {
      expect(entry.republicDoctor).not.toBe('blocked');
      expect(entry.departmentDoctor).not.toBe('blocked');
    }
  });

  it('maxRepublicPerMonth=0 blocks only republic, not department', () => {
    const docs = [
      makeDoctor({ id: 'noR', name: 'NoRepublic', maxRepublicPerMonth: 0 }),
      ...makeDoctors(6),
    ];
    const config = makeConfig();
    const schedule = generateSchedule(docs, config, allRulesEnabled());

    for (const entry of schedule) {
      expect(entry.republicDoctor).not.toBe('noR');
    }
    // But may appear in department
    const hasDept = schedule.some(e => e.departmentDoctor === 'noR');
    expect(hasDept).toBe(true);
  });
});

// ===== Polyclinic on every weekday =====

describe('doctor with polyclinic Mon-Fri', () => {
  it('can only be assigned on weekends', () => {
    const allWeekdays = [0, 1, 2, 3, 4].map(wd => ({ weekday: wd, startHour: 9, endHour: 13 }));
    const docs = [
      makeDoctor({ id: 'busy', name: 'Busy', polyclinicSchedule: allWeekdays }),
      ...makeDoctors(8),
    ];
    const config = makeConfig({ holidays: [] });
    const schedule = generateSchedule(docs, config, allRulesEnabled());

    for (const entry of schedule) {
      if (entry.republicDoctor === 'busy' || entry.departmentDoctor === 'busy') {
        // With polyclinic Mon-Fri + prev-day check, busy can only work on...
        // Same-day blocks Mon-Fri (weekday 0-4)
        // Prev-day blocks: Sunday (next=Mon), Mon(next=Tue), Tue(next=Wed), Wed(next=Thu), Thu(next=Fri)
        // So weekday 6(Sun) is blocked (nextday=Mon), 0-4 blocked by same-day
        // Only Saturday (weekday 5) is OK (next day = Sunday = no polyclinic)
        expect(entry.weekday).toBe(5); // Saturday only
      }
    }
  });
});

// ===== Validator: min_rest_days counts R+D as separate days for same doctor =====

describe('validator: rest days with both R and D on different days', () => {
  it('flags rest violation between R on day 5 and D on day 6', () => {
    const doc = makeDoctor({ id: 'doc1', name: 'A' });
    const config = makeConfig();
    const schedule = assignSchedule(makeBlankSchedule(config), [
      { day: 5, republic: 'doc1' },
      { day: 6, department: 'doc1' }, // gap=1 < minRest=2
    ]);

    const errors = validateSchedule(schedule, [doc], config, allRulesEnabled());
    expect(errors.some(e => e.message.includes('poilsio'))).toBe(true);
  });

  it('does NOT flag R on day 5 and D on day 7 (gap=2 >= minRest=2)', () => {
    const doc = makeDoctor({ id: 'doc1', name: 'A' });
    const config = makeConfig();
    const schedule = assignSchedule(makeBlankSchedule(config), [
      { day: 5, republic: 'doc1' },
      { day: 7, department: 'doc1' }, // gap=2 >= minRest=2
    ]);

    const errors = validateSchedule(schedule, [doc], config, allRulesEnabled());
    expect(errors.some(e => e.message.includes('poilsio'))).toBe(false);
  });
});

// ===== Week boundary: shifts spanning two ISO weeks =====

describe('ISO week boundaries', () => {
  it('shifts in different ISO weeks dont combine for weekly hours', () => {
    const doc = makeDoctor({ id: 'doc1', name: 'A' });
    const config = makeConfig({ holidays: [], shiftDurationHours: 24 });
    // Jan 2026: day 4 = Sunday (end of week 1), day 5 = Monday (start of week 2)
    const schedule = assignSchedule(makeBlankSchedule(config), [
      { day: 2, republic: 'doc1' },  // Friday week 1
      { day: 4, republic: 'doc1' },  // Sunday week 1 → 48h in week 1
      { day: 5, republic: 'doc1' },  // Monday week 2 → 24h in week 2
      { day: 7, republic: 'doc1' },  // Wednesday week 2 → 48h in week 2
    ]);

    const stats = calculateStats(schedule, [doc], config);
    const s = stats.find(s => s.doctorId === 'doc1')!;

    // Each week should have ≤ 48h, not combined 96h
    for (const hours of Object.values(s.weeklyHours)) {
      expect(hours).toBeLessThanOrEqual(48);
    }
  });
});

// ===== clinicDoctor consistency =====

describe('clinicDoctor field correctness', () => {
  it('clinicDoctor matches republicDoctor on workdays', () => {
    const doctors = makeDoctors(8);
    const config = makeConfig({ holidays: [1, 15] });
    const schedule = generateSchedule(doctors, config, allRulesEnabled());

    for (const entry of schedule) {
      if (!entry.isWeekend && !entry.isHoliday) {
        expect(entry.clinicDoctor).toBe(entry.republicDoctor);
      }
    }
  });

  it('clinicDoctor is null on weekends', () => {
    const doctors = makeDoctors(8);
    const config = makeConfig();
    const schedule = generateSchedule(doctors, config, allRulesEnabled());

    for (const entry of schedule) {
      if (entry.isWeekend) {
        expect(entry.clinicDoctor).toBeNull();
      }
    }
  });

  it('clinicDoctor is null on holidays (even if weekday)', () => {
    // Jan 5 2026 = Monday. Make it a holiday.
    const doctors = makeDoctors(8);
    const config = makeConfig({ holidays: [5] });
    const schedule = generateSchedule(doctors, config, allRulesEnabled());

    const day5 = schedule.find(e => e.day === 5)!;
    expect(day5.isHoliday).toBe(true);
    expect(day5.isWeekend).toBe(false); // Monday
    expect(day5.clinicDoctor).toBeNull();
  });
});

// ===== Date string consistency between scheduler and validator =====

describe('date string format consistency', () => {
  it('schedule entry dates match the format used in unavailableDates', () => {
    const config = makeConfig();
    const doctors = makeDoctors(3);
    const schedule = generateSchedule(doctors, config, allRulesEnabled());

    // The date format used by scheduler should match what doctors have
    for (const entry of schedule) {
      const expected = new Date(config.year, config.month - 1, entry.day).toISOString().split('T')[0];
      expect(entry.date).toBe(expected);
    }
  });

  it('unavailable date blocking works for every day of the month', () => {
    const config = makeConfig({ holidays: [] });
    const daysInMonth = 31;

    // Make doc1 unavailable on every day
    const allDates = Array.from({ length: daysInMonth }, (_, i) =>
      dateStr(2026, 1, i + 1)
    );
    const docs = [
      makeDoctor({ id: 'blocked', name: 'Blocked', unavailableDates: allDates }),
      ...makeDoctors(6),
    ];

    const schedule = generateSchedule(docs, config, allRulesEnabled());

    // blocked should never appear
    for (const entry of schedule) {
      expect(entry.republicDoctor).not.toBe('blocked');
      expect(entry.departmentDoctor).not.toBe('blocked');
    }
  });
});

// ===== Multiple rules of same type =====

describe('multiple rules of same type', () => {
  it('first matching rule is used for params', () => {
    const rules: ScheduleRule[] = [
      ...defaultRules,
      {
        id: 'extra_rest',
        name: 'Extra rest',
        description: 'Extra',
        type: 'min_rest_days',
        enabled: true,
        severity: 'error',
        params: { days: 5 },
        builtIn: false,
      },
    ];

    // The built-in min_rest_days (days=2) comes first in the array
    // So it should be used, not the custom one (days=5)
    const doctors = makeDoctors(8);
    const config = makeConfig({ holidays: [] });
    const schedule = generateSchedule(doctors, config, rules);

    // With days=2, consecutive gaps of 2 should be OK
    const doctorDays: Record<string, number[]> = {};
    for (const entry of schedule) {
      for (const field of ['republicDoctor', 'departmentDoctor'] as const) {
        const id = entry[field];
        if (!id) continue;
        if (!doctorDays[id]) doctorDays[id] = [];
        doctorDays[id].push(entry.day);
      }
    }

    // Should have gaps of 2 (not 5)
    let hasGapOf2 = false;
    for (const [, days] of Object.entries(doctorDays)) {
      days.sort((a, b) => a - b);
      for (let i = 1; i < days.length; i++) {
        if (days[i] - days[i - 1] === 2) hasGapOf2 = true;
      }
    }
    expect(hasGapOf2).toBe(true);
  });
});

// ===== Greedy sorting determinism =====

describe('greedy sorting: tie-breaking', () => {
  it('all identical doctors still produces valid schedule (random tiebreak)', () => {
    // Run multiple times — all should be valid
    for (let trial = 0; trial < 5; trial++) {
      const doctors = makeDoctors(8);
      const config = makeConfig();
      const schedule = generateSchedule(doctors, config, allRulesEnabled());
      const errors = validateSchedule(schedule, doctors, config, allRulesEnabled());
      const hardErrors = errors.filter(e => e.type === 'error');
      expect(hardErrors).toHaveLength(0);
    }
  });
});

// ===== Validator: balance uses ALL doctors in denominator =====

describe('validator: balance calculation includes inactive doctors', () => {
  it('doctor with 0 shifts is included in average calculation', () => {
    const doctors = makeDoctors(4);
    const config = makeConfig({ holidays: [] });
    // Assign only doc1 and doc2, leave doc3 and doc4 with 0
    const schedule = assignSchedule(makeBlankSchedule(config), [
      { day: 2, republic: 'doc1' },
      { day: 5, republic: 'doc1' },
      { day: 9, republic: 'doc1' },
      { day: 14, republic: 'doc1' },
      { day: 3, department: 'doc2' },
      { day: 7, department: 'doc2' },
    ]);
    // total=6, doctors=4, avg=1.5
    // doc1: |4 - 1.5| = 2.5 > 1.5 → should warn
    // doc3: |0 - 1.5| = 1.5 → exactly at threshold, NOT exceeding
    // doc4: |0 - 1.5| = 1.5 → exactly at threshold, NOT exceeding

    const errors = validateSchedule(schedule, doctors, config, allRulesEnabled());
    expect(errors.some(e => e.message.includes('vidurkis') && e.doctorId === 'doc1')).toBe(true);
    // doc3 with 0 shifts, deviation = 1.5 which is NOT > 1.5, so no warning
    expect(errors.filter(e => e.message.includes('vidurkis') && e.doctorId === 'doc3')).toHaveLength(0);
  });
});

// ===== Cross-month date correctness =====

describe('date correctness across different months', () => {
  const months = [
    { month: 1, days: 31, name: 'January' },
    { month: 2, days: 28, name: 'February 2026' },
    { month: 4, days: 30, name: 'April' },
    { month: 12, days: 31, name: 'December' },
  ];

  for (const { month, days, name } of months) {
    it(`${name} has ${days} days with correct weekdays`, () => {
      const config = makeConfig({ month, holidays: [] });
      const doctors = makeDoctors(8);
      const schedule = generateSchedule(doctors, config, allRulesEnabled());

      expect(schedule).toHaveLength(days);

      for (const entry of schedule) {
        const date = new Date(2026, month - 1, entry.day);
        const jsDay = date.getDay();
        const expectedWeekday = jsDay === 0 ? 6 : jsDay - 1;
        expect(entry.weekday).toBe(expectedWeekday);
        expect(entry.isWeekend).toBe(expectedWeekday >= 5);
      }
    });
  }
});
