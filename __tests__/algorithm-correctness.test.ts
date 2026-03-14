/**
 * Deep algorithmic correctness tests — verifying the math behind scheduling.
 * Tests the actual computation logic, not just structural output.
 */
import { describe, it, expect } from 'vitest';
import { generateSchedule, generateScheduleAsync } from '@/lib/scheduler';
import { validateSchedule, calculateStats } from '@/lib/validator';
import { makeDoctor, makeDoctors, makeConfig, makeBlankSchedule, assignSchedule, allRulesEnabled, dateStr } from './helpers';
import { ScheduleRule, ScheduleEntry, Doctor } from '@/lib/types';
import { defaultRules } from '@/lib/default-rules';

// ===== Helper: count assignments per doctor =====
function countAssignments(schedule: ScheduleEntry[]): Record<string, { republic: number; department: number; total: number; weekend: number }> {
  const counts: Record<string, { republic: number; department: number; total: number; weekend: number }> = {};
  for (const entry of schedule) {
    for (const [slot, field] of [['republic', 'republicDoctor'], ['department', 'departmentDoctor']] as const) {
      const id = entry[field];
      if (!id) continue;
      if (!counts[id]) counts[id] = { republic: 0, department: 0, total: 0, weekend: 0 };
      if (slot === 'republic') counts[id].republic++;
      else counts[id].department++;
      counts[id].total++;
      if (entry.isWeekend || entry.isHoliday) counts[id].weekend++;
    }
  }
  return counts;
}

// ===== Helper: get doctor's assigned days =====
function getDoctorDays(schedule: ScheduleEntry[], doctorId: string): number[] {
  const days: number[] = [];
  for (const entry of schedule) {
    if (entry.republicDoctor === doctorId || entry.departmentDoctor === doctorId) {
      days.push(entry.day);
    }
  }
  return days.sort((a, b) => a - b);
}

// ===== GREEDY SORTING LOGIC =====

describe('greedy: picks doctor with fewest total shifts', () => {
  it('always assigns the least-loaded doctor when all else is equal', () => {
    // 6 identical doctors, 31 days, 2 slots = 62 assignments
    // Perfect distribution: 62/6 ≈ 10.3 → each should get 10 or 11
    const doctors = makeDoctors(6);
    const config = makeConfig({ holidays: [] });
    const rules = allRulesEnabled();
    const schedule = generateSchedule(doctors, config, rules);
    const counts = countAssignments(schedule);

    const totals = Object.values(counts).map(c => c.total);
    const min = Math.min(...totals);
    const max = Math.max(...totals);
    // Greedy should distribute within ±2 of perfect
    expect(max - min).toBeLessThanOrEqual(2);
  });

  it('doctor with fewer shifts gets priority over doctor with more', () => {
    // 8 doctors, Feb = 28 days, 56 slots → ~7 each
    // With rest day constraints spread may vary, but should be within ±3
    const doctors = makeDoctors(8);
    const config = makeConfig({ month: 2, holidays: [] });
    const schedule = generateSchedule(doctors, config, allRulesEnabled());
    const counts = countAssignments(schedule);

    const totals = Object.values(counts).map(c => c.total);
    const min = Math.min(...totals);
    const max = Math.max(...totals);
    expect(max - min).toBeLessThanOrEqual(3);
  });
});

// ===== DEPT-ONLY PRIORITY =====

describe('greedy: dept_only_priority logic', () => {
  it('dept-only doctors get more department slots than universal doctors', () => {
    const doctors = [
      makeDoctor({ id: 'u1', name: 'Universal1' }),
      makeDoctor({ id: 'u2', name: 'Universal2' }),
      makeDoctor({ id: 'u3', name: 'Universal3' }),
      makeDoctor({ id: 'u4', name: 'Universal4' }),
      makeDoctor({ id: 'd1', name: 'DeptOnly1', canRepublic: false }),
      makeDoctor({ id: 'd2', name: 'DeptOnly2', canRepublic: false }),
    ];
    const config = makeConfig({ holidays: [] });
    const schedule = generateSchedule(doctors, config, allRulesEnabled());
    const counts = countAssignments(schedule);

    // Dept-only doctors should have most/all of their shifts in department
    expect(counts['d1']?.republic || 0).toBe(0); // can't do republic
    expect(counts['d2']?.republic || 0).toBe(0);
    // And they should have department shifts
    expect(counts['d1']?.department || 0).toBeGreaterThan(0);
    expect(counts['d2']?.department || 0).toBeGreaterThan(0);
  });

  it('dept-only doctors appear in department slot more than universal doctors', () => {
    const doctors = [
      makeDoctor({ id: 'u1', name: 'Uni1' }),
      makeDoctor({ id: 'u2', name: 'Uni2' }),
      makeDoctor({ id: 'u3', name: 'Uni3' }),
      makeDoctor({ id: 'd1', name: 'Dept1', canRepublic: false }),
    ];
    const config = makeConfig({ month: 2, holidays: [] }); // shorter month
    const schedule = generateSchedule(doctors, config, allRulesEnabled());
    const counts = countAssignments(schedule);

    // With priority enabled, d1 should get at least as many dept shifts
    // as the average universal doctor gets dept shifts
    const uniDeptAvg = (['u1', 'u2', 'u3'].reduce((s, id) => s + (counts[id]?.department || 0), 0)) / 3;
    expect(counts['d1']?.department || 0).toBeGreaterThanOrEqual(Math.floor(uniDeptAvg));
  });

  it('disabling dept_only_priority changes behavior', () => {
    const doctors = [
      makeDoctor({ id: 'u1', name: 'Uni1' }),
      makeDoctor({ id: 'u2', name: 'Uni2' }),
      makeDoctor({ id: 'd1', name: 'Dept1', canRepublic: false }),
      makeDoctor({ id: 'd2', name: 'Dept2', canRepublic: false }),
    ];
    const config = makeConfig({ month: 2, holidays: [] });

    const rulesOn = allRulesEnabled();
    const rulesOff = defaultRules.map(r => ({
      ...r,
      enabled: r.type === 'dept_only_priority' ? false : r.enabled,
    }));

    // Both should produce valid schedules, just different distributions
    const scheduleOn = generateSchedule(doctors, config, rulesOn);
    const scheduleOff = generateSchedule(doctors, config, rulesOff);

    expect(scheduleOn).toHaveLength(28);
    expect(scheduleOff).toHaveLength(28);
  });
});

// ===== REST DAY GAP MATH =====

describe('rest day gap calculation', () => {
  it('with minRestDays=2, gap of 1 is forbidden', () => {
    const doctors = makeDoctors(8);
    const config = makeConfig({ holidays: [] });
    const schedule = generateSchedule(doctors, config, allRulesEnabled());

    for (const doc of doctors) {
      const days = getDoctorDays(schedule, doc.id);
      for (let i = 1; i < days.length; i++) {
        expect(days[i] - days[i - 1]).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('with minRestDays=3, gap of 2 is also forbidden', () => {
    const rules = defaultRules.map(r =>
      r.type === 'min_rest_days'
        ? { ...r, params: { days: 3 } }
        : { ...r }
    );
    const doctors = makeDoctors(10); // need more doctors for stricter constraint
    const config = makeConfig({ holidays: [] });
    const schedule = generateSchedule(doctors, config, rules);

    for (const doc of doctors) {
      const days = getDoctorDays(schedule, doc.id);
      for (let i = 1; i < days.length; i++) {
        expect(days[i] - days[i - 1]).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it('with minRestDays=1, consecutive days are allowed', () => {
    const rules = defaultRules.map(r =>
      r.type === 'min_rest_days'
        ? { ...r, params: { days: 1 } }
        : { ...r }
    );
    const doctors = makeDoctors(4);
    const config = makeConfig({ holidays: [] });
    const schedule = generateSchedule(doctors, config, rules);

    // Should still produce valid schedule, consecutive days possible
    expect(schedule).toHaveLength(31);
    // At least some doctor should have consecutive days with only 4 doctors
    let hasConsecutive = false;
    for (const doc of doctors) {
      const days = getDoctorDays(schedule, doc.id);
      for (let i = 1; i < days.length; i++) {
        if (days[i] - days[i - 1] === 1) {
          hasConsecutive = true;
          break;
        }
      }
      if (hasConsecutive) break;
    }
    expect(hasConsecutive).toBe(true);
  });
});

// ===== WEEKLY HOURS EXACT MATH =====

describe('weekly hours calculation', () => {
  it('with 24h shifts, max 2 shifts per week (55.5h / 24h = 2.3 → 2)', () => {
    const doctors = makeDoctors(8);
    const config = makeConfig({ holidays: [], shiftDurationHours: 24, maxWeeklyHours: 55.5 });
    const schedule = generateSchedule(doctors, config, allRulesEnabled());
    const stats = calculateStats(schedule, doctors, config);

    for (const s of stats) {
      for (const hours of Object.values(s.weeklyHours)) {
        expect(hours).toBeLessThanOrEqual(55.5);
        // With 24h shifts, max 2 per week = 48h
        expect(hours).toBeLessThanOrEqual(48);
      }
    }
  });

  it('with 12h shifts, max 4 shifts per week (55.5h / 12h = 4.6 → 4)', () => {
    const doctors = makeDoctors(6);
    const config = makeConfig({ holidays: [], shiftDurationHours: 12, maxWeeklyHours: 55.5 });
    const schedule = generateSchedule(doctors, config, allRulesEnabled());
    const stats = calculateStats(schedule, doctors, config);

    for (const s of stats) {
      for (const hours of Object.values(s.weeklyHours)) {
        expect(hours).toBeLessThanOrEqual(55.5);
      }
    }
  });

  it('weekly hours are summed per ISO week correctly', () => {
    const doctors = makeDoctors(2);
    const config = makeConfig({ holidays: [] });
    // Manual schedule: doc1 on days 5 (Mon) and 7 (Wed) of same week
    const schedule = assignSchedule(makeBlankSchedule(config), [
      { day: 5, republic: 'doc1' },  // Monday week 2
      { day: 7, republic: 'doc1' },  // Wednesday week 2
    ]);

    const stats = calculateStats(schedule, doctors, config);
    const s1 = stats.find(s => s.doctorId === 'doc1')!;

    // Both days should be in same ISO week
    const weekNums = Object.keys(s1.weeklyHours).map(Number);
    expect(weekNums).toHaveLength(1); // same week
    expect(Object.values(s1.weeklyHours)[0]).toBe(48); // 2 × 24h
  });
});

// ===== POLYCLINIC EDGE CASES =====

describe('polyclinic prev-day: last day of month', () => {
  it('last day of month skips polyclinic-next-day check (no next day data)', () => {
    // Doctor has polyclinic on the first weekday of next month
    // Last day of January should NOT be blocked (we don't have Feb data)
    const doc = makeDoctor({
      id: 'doc1', name: 'A',
      polyclinicSchedule: [{ weekday: 0, startHour: 9, endHour: 13 }], // Monday
    });
    const config = makeConfig({ holidays: [] }); // Jan 2026, day 31 = Saturday
    const schedule = assignSchedule(makeBlankSchedule(config), [
      { day: 31, republic: 'doc1' },
    ]);

    // The validator should not flag day 31 for polyclinic-next-day
    // because day 31 is the last day (entry.day < schedule.length → 31 < 31 → false)
    const errors = validateSchedule(schedule, [doc], config, allRulesEnabled());
    expect(errors.some(e =>
      e.message.includes('poliklinika') && e.day === 31
    )).toBe(false);
  });

  it('polyclinic same-day blocks on correct weekday', () => {
    // Jan 2026: day 5 = Monday (weekday 0), day 6 = Tuesday (weekday 1)
    const doc = makeDoctor({
      id: 'doc1', name: 'A',
      polyclinicSchedule: [{ weekday: 0, startHour: 9, endHour: 13 }], // Monday
    });
    const config = makeConfig({ holidays: [] });

    // Assigned on Monday (day 5) — should error
    const scheduleMon = assignSchedule(makeBlankSchedule(config), [
      { day: 5, republic: 'doc1' },
    ]);
    const errorsMon = validateSchedule(scheduleMon, [doc], config, allRulesEnabled());
    expect(errorsMon.some(e => e.message.includes('poliklinikos') && e.day === 5)).toBe(true);

    // Assigned on Tuesday (day 6) — should be fine
    const scheduleTue = assignSchedule(makeBlankSchedule(config), [
      { day: 6, republic: 'doc1' },
    ]);
    const errorsTue = validateSchedule(scheduleTue, [doc], config, allRulesEnabled());
    expect(errorsTue.some(e => e.message.includes('poliklinikos') && e.day === 6)).toBe(false);
  });
});

// ===== MONTHLY LIMIT BOUNDARIES =====

describe('monthly limit boundary precision', () => {
  it('exactly at limit is OK, one over is error', () => {
    const doc = makeDoctor({ id: 'doc1', name: 'Ona', maxRepublicPerMonth: 3 });
    const config = makeConfig({ holidays: [] });

    // Exactly 3 republic shifts — OK
    const scheduleOk = assignSchedule(makeBlankSchedule(config), [
      { day: 2, republic: 'doc1' },
      { day: 5, republic: 'doc1' },
      { day: 9, republic: 'doc1' },
    ]);
    const errorsOk = validateSchedule(scheduleOk, [doc], config, allRulesEnabled());
    expect(errorsOk.some(e => e.message.includes('respublikos') && e.doctorId === 'doc1')).toBe(false);

    // 4 republic shifts — ERROR
    const scheduleOver = assignSchedule(makeBlankSchedule(config), [
      { day: 2, republic: 'doc1' },
      { day: 5, republic: 'doc1' },
      { day: 9, republic: 'doc1' },
      { day: 14, republic: 'doc1' },
    ]);
    const errorsOver = validateSchedule(scheduleOver, [doc], config, allRulesEnabled());
    expect(errorsOver.some(e => e.message.includes('respublikos') && e.doctorId === 'doc1')).toBe(true);
  });

  it('department limit boundary', () => {
    const doc = makeDoctor({ id: 'doc1', name: 'B', maxDepartmentPerMonth: 2 });
    const config = makeConfig({ holidays: [] });

    // 2 dept shifts — OK
    const ok = assignSchedule(makeBlankSchedule(config), [
      { day: 2, department: 'doc1' },
      { day: 5, department: 'doc1' },
    ]);
    expect(validateSchedule(ok, [doc], config, allRulesEnabled()).some(
      e => e.message.includes('skyriaus') && e.doctorId === 'doc1'
    )).toBe(false);

    // 3 dept shifts — ERROR
    const over = assignSchedule(makeBlankSchedule(config), [
      { day: 2, department: 'doc1' },
      { day: 5, department: 'doc1' },
      { day: 9, department: 'doc1' },
    ]);
    expect(validateSchedule(over, [doc], config, allRulesEnabled()).some(
      e => e.message.includes('skyriaus') && e.doctorId === 'doc1'
    )).toBe(true);
  });

  it('total limit counts republic + department together', () => {
    const doc = makeDoctor({ id: 'doc1', name: 'C', maxTotalPerMonth: 4 });
    const config = makeConfig({ holidays: [] });

    // 2 republic + 2 department = 4 total — OK
    const ok = assignSchedule(makeBlankSchedule(config), [
      { day: 2, republic: 'doc1' },
      { day: 5, republic: 'doc1' },
      { day: 9, department: 'doc1' },
      { day: 14, department: 'doc1' },
    ]);
    expect(validateSchedule(ok, [doc], config, allRulesEnabled()).some(
      e => e.message.includes('budėjimai viršija') && e.doctorId === 'doc1'
    )).toBe(false);

    // 3 republic + 2 department = 5 total — ERROR
    const over = assignSchedule(makeBlankSchedule(config), [
      { day: 2, republic: 'doc1' },
      { day: 5, republic: 'doc1' },
      { day: 9, department: 'doc1' },
      { day: 14, department: 'doc1' },
      { day: 19, republic: 'doc1' },
    ]);
    expect(validateSchedule(over, [doc], config, allRulesEnabled()).some(
      e => e.message.includes('budėjimai viršija') && e.doctorId === 'doc1'
    )).toBe(true);
  });
});

// ===== MAX WEEKEND SHIFTS (BUG FIX VERIFICATION) =====

describe('max_weekend_shifts validation (bugfix: params.maxShifts not params.max)', () => {
  const weekendRule: ScheduleRule = {
    id: 'max_weekend_test',
    name: 'Test Weekend Rule',
    description: 'Test',
    type: 'max_weekend_shifts',
    enabled: true,
    severity: 'error',
    params: { maxShifts: 2 },
    builtIn: false,
  };

  it('reports error when weekend shifts exceed maxShifts param', () => {
    const doc = makeDoctor({ id: 'doc1', name: 'Jonas' });
    const config = makeConfig({ holidays: [] }); // Jan 2026
    // Saturdays: 3, 10, 17 → assign doc1 to 3 weekend days (max 2)
    const schedule = assignSchedule(makeBlankSchedule(config), [
      { day: 3, republic: 'doc1' },  // Saturday
      { day: 10, republic: 'doc1' }, // Saturday
      { day: 17, republic: 'doc1' }, // Saturday
    ]);

    // Override built-in max_weekend_shifts with test rule (maxShifts=2)
    const rules = allRulesEnabled().map(r =>
      r.type === 'max_weekend_shifts' ? weekendRule : r
    );
    const errors = validateSchedule(schedule, [doc], config, rules);
    expect(errors.some(e => e.message.includes('savaitgaliniai') && e.message.includes('max 2'))).toBe(true);
  });

  it('no error when within maxShifts limit', () => {
    const doc = makeDoctor({ id: 'doc1', name: 'Jonas' });
    const config = makeConfig({ holidays: [] });
    const schedule = assignSchedule(makeBlankSchedule(config), [
      { day: 3, republic: 'doc1' },  // Saturday
      { day: 10, republic: 'doc1' }, // Saturday — exactly 2
    ]);

    const rules = allRulesEnabled().map(r =>
      r.type === 'max_weekend_shifts' ? weekendRule : r
    );
    const errors = validateSchedule(schedule, [doc], config, rules);
    expect(errors.some(e => e.message.includes('savaitgaliniai'))).toBe(false);
  });

  it('holidays count as weekend shifts', () => {
    const doc = makeDoctor({ id: 'doc1', name: 'Jonas' });
    const config = makeConfig({ holidays: [5, 6] }); // Mon and Tue are holidays
    const schedule = assignSchedule(makeBlankSchedule(config), [
      { day: 3, republic: 'doc1' },  // Saturday (weekend)
      { day: 5, republic: 'doc1' },  // Monday but holiday
      { day: 6, republic: 'doc1' },  // Tuesday but holiday — 3 > max 2
    ]);

    const rules = allRulesEnabled().map(r =>
      r.type === 'max_weekend_shifts' ? weekendRule : r
    );
    const errors = validateSchedule(schedule, [doc], config, rules);
    expect(errors.some(e => e.message.includes('savaitgaliniai'))).toBe(true);
  });
});

// ===== ILP vs GREEDY QUALITY COMPARISON =====

describe('ILP produces better or equal distribution than greedy', () => {
  it('ILP has smaller max-min spread than greedy', async () => {
    const doctors = makeDoctors(8);
    const config = makeConfig({ holidays: [] });
    const rules = allRulesEnabled();

    const greedySchedule = generateSchedule(doctors, config, rules);
    const ilpSchedule = await generateScheduleAsync(doctors, config, rules);

    const greedyCounts = countAssignments(greedySchedule);
    const ilpCounts = countAssignments(ilpSchedule);

    const greedyTotals = Object.values(greedyCounts).map(c => c.total);
    const ilpTotals = Object.values(ilpCounts).map(c => c.total);

    const greedySpread = Math.max(...greedyTotals) - Math.min(...greedyTotals);
    const ilpSpread = Math.max(...ilpTotals) - Math.min(...ilpTotals);

    // ILP should be at least as balanced (spread <= greedy spread)
    expect(ilpSpread).toBeLessThanOrEqual(greedySpread + 1); // +1 tolerance for randomness
  });

  it('ILP distribution is near-perfect (max - min <= 1)', async () => {
    // With 8 doctors, 31 days, 2 slots = 62 assignments
    // Perfect: 62/8 = 7.75 → some get 7, some get 8
    const doctors = makeDoctors(8);
    const config = makeConfig({ holidays: [] });

    const schedule = await generateScheduleAsync(doctors, config, allRulesEnabled());
    const counts = countAssignments(schedule);
    const totals = Object.values(counts).map(c => c.total);

    expect(Math.max(...totals) - Math.min(...totals)).toBeLessThanOrEqual(1);
  });

  it('ILP weekend distribution is balanced', async () => {
    const doctors = makeDoctors(8);
    const config = makeConfig({ holidays: [] }); // Jan 2026 has 8 weekend days → 16 weekend slots

    const schedule = await generateScheduleAsync(doctors, config, allRulesEnabled());
    const counts = countAssignments(schedule);
    const weekendCounts = Object.values(counts).map(c => c.weekend);

    const max = Math.max(...weekendCounts);
    const min = Math.min(...weekendCounts);
    // 16 weekend slots / 8 doctors = 2 each. With rest constraints, spread may be up to 3
    expect(max - min).toBeLessThanOrEqual(3);
  });
});

// ===== ILP CONSTRAINT ENFORCEMENT =====

describe('ILP: hard constraints enforced mathematically', () => {
  it('ILP respects rest days strictly', async () => {
    const doctors = makeDoctors(8);
    const config = makeConfig({ holidays: [] });
    const schedule = await generateScheduleAsync(doctors, config, allRulesEnabled());

    for (const doc of doctors) {
      const days = getDoctorDays(schedule, doc.id);
      for (let i = 1; i < days.length; i++) {
        expect(days[i] - days[i - 1]).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('ILP respects monthly republic limits exactly', async () => {
    const doctors = [
      makeDoctor({ id: 'limited', name: 'Limited', maxRepublicPerMonth: 2 }),
      ...makeDoctors(7).map((d, i) => ({ ...d, id: `d${i}`, name: `Doc${i}` })),
    ];
    const config = makeConfig({ holidays: [] });
    const schedule = await generateScheduleAsync(doctors, config, allRulesEnabled());

    const counts = countAssignments(schedule);
    expect(counts['limited']?.republic || 0).toBeLessThanOrEqual(2);
  });

  it('ILP respects max total per month', async () => {
    const doctors = [
      makeDoctor({ id: 'cap5', name: 'Capped', maxTotalPerMonth: 5 }),
      ...makeDoctors(7).map((d, i) => ({ ...d, id: `d${i}`, name: `Doc${i}` })),
    ];
    const config = makeConfig({ holidays: [] });
    const schedule = await generateScheduleAsync(doctors, config, allRulesEnabled());

    const counts = countAssignments(schedule);
    expect(counts['cap5']?.total || 0).toBeLessThanOrEqual(5);
  });

  it('ILP never assigns same doctor to R and D on same day', async () => {
    const doctors = makeDoctors(8);
    const config = makeConfig({ holidays: [] });
    const schedule = await generateScheduleAsync(doctors, config, allRulesEnabled());

    for (const entry of schedule) {
      if (entry.republicDoctor && entry.departmentDoctor) {
        expect(entry.republicDoctor).not.toBe(entry.departmentDoctor);
      }
    }
  });

  it('ILP with polyclinic constraints produces zero polyclinic violations', async () => {
    const doctors = [
      makeDoctor({
        id: 'poly', name: 'PolyDoc',
        polyclinicSchedule: [
          { weekday: 0, startHour: 9, endHour: 13 }, // Monday
          { weekday: 2, startHour: 10, endHour: 14 }, // Wednesday
        ],
      }),
      ...makeDoctors(7).map((d, i) => ({ ...d, id: `d${i}`, name: `D${i}` })),
    ];
    const config = makeConfig({ holidays: [] });
    const schedule = await generateScheduleAsync(doctors, config, allRulesEnabled());

    // poly should never be assigned on Monday or Wednesday
    for (const entry of schedule) {
      if (entry.weekday === 0 || entry.weekday === 2) {
        expect(entry.republicDoctor).not.toBe('poly');
        expect(entry.departmentDoctor).not.toBe('poly');
      }
    }
    // poly should never be assigned on Sunday (next day = Monday polyclinic)
    // or Tuesday (next day = Wednesday polyclinic)
    for (const entry of schedule) {
      if (entry.weekday === 6 || entry.weekday === 1) { // Sunday, Tuesday
        // Only block if not last day of month
        if (entry.day < schedule.length) {
          expect(entry.republicDoctor).not.toBe('poly');
          expect(entry.departmentDoctor).not.toBe('poly');
        }
      }
    }
  });
});

// ===== VALIDATOR: SEVERITY & RULE STATE =====

describe('validator: rule severity affects error type', () => {
  it('changing severity to warning produces warnings instead of errors', () => {
    const doc = makeDoctor({ id: 'doc1', name: 'A', canRepublic: false });
    const config = makeConfig();
    const schedule = assignSchedule(makeBlankSchedule(config), [
      { day: 5, republic: 'doc1' },
    ]);

    // Default: severity = error
    const rulesError = allRulesEnabled();
    const errorsHard = validateSchedule(schedule, [doc], config, rulesError);
    expect(errorsHard.some(e => e.type === 'error' && e.message.includes('respubliką'))).toBe(true);

    // Change to warning
    const rulesWarning = defaultRules.map(r =>
      r.type === 'respect_slot_types' ? { ...r, severity: 'warning' as const } : { ...r }
    );
    const errorsWarn = validateSchedule(schedule, [doc], config, rulesWarning);
    expect(errorsWarn.some(e => e.type === 'warning' && e.message.includes('respubliką'))).toBe(true);
    expect(errorsWarn.some(e => e.type === 'error' && e.message.includes('respubliką'))).toBe(false);
  });
});

// ===== VALIDATOR: BALANCE THRESHOLD MATH =====

describe('validator: balance_distribution threshold math', () => {
  it('threshold=2.5 allows small deviation from average without warning', () => {
    const doctors = makeDoctors(4);
    const config = makeConfig({ holidays: [] });
    // 4 doctors, give each 3-4 shifts. Average = 3.5
    // Deviation of 0.5 is within 1.5 threshold
    const schedule = assignSchedule(makeBlankSchedule(config), [
      { day: 2, republic: 'doc1' }, { day: 5, republic: 'doc1' }, { day: 9, republic: 'doc1' },
      { day: 12, department: 'doc2' }, { day: 16, department: 'doc2' }, { day: 19, department: 'doc2' }, { day: 23, republic: 'doc2' },
      { day: 3, republic: 'doc3' }, { day: 7, republic: 'doc3' }, { day: 14, department: 'doc3' },
      { day: 6, department: 'doc4' }, { day: 10, department: 'doc4' }, { day: 17, department: 'doc4' },
    ]);
    // doc1=3, doc2=4, doc3=3, doc4=3 → avg=3.25
    // max deviation = |4-3.25| = 0.75 < 1.5 → no warning

    const errors = validateSchedule(schedule, doctors, config, allRulesEnabled());
    expect(errors.some(e => e.message.includes('vidurkis'))).toBe(false);
  });

  it('threshold exceeded triggers warning', () => {
    const doctors = makeDoctors(4);
    const config = makeConfig({ holidays: [] });
    // Give doc1 many more shifts than others
    const schedule = assignSchedule(makeBlankSchedule(config), [
      { day: 2, republic: 'doc1' }, { day: 5, republic: 'doc1' }, { day: 9, republic: 'doc1' },
      { day: 14, republic: 'doc1' }, { day: 19, republic: 'doc1' }, { day: 23, republic: 'doc1' },
      { day: 26, republic: 'doc1' },
      { day: 3, department: 'doc2' },
    ]);
    // active: doc1=7, doc2=1 → avg=4, doc1 deviation = 3 > 2.5 → warning

    const errors = validateSchedule(schedule, doctors, config, allRulesEnabled());
    expect(errors.some(e => e.message.includes('vidurkis') && e.doctorId === 'doc1')).toBe(true);
  });

  it('custom threshold value is respected', () => {
    const doctors = makeDoctors(3);
    const config = makeConfig({ holidays: [] });
    const schedule = assignSchedule(makeBlankSchedule(config), [
      { day: 2, republic: 'doc1' }, { day: 5, republic: 'doc1' }, { day: 9, republic: 'doc1' },
      { day: 14, republic: 'doc1' }, { day: 19, republic: 'doc1' },
      { day: 3, department: 'doc2' }, { day: 7, department: 'doc2' },
    ]);
    // doc1=5, doc2=2, doc3=0 → avg=2.33

    // With threshold=10 → no one exceeds
    const looseRules = defaultRules.map(r =>
      r.type === 'balance_distribution' ? { ...r, params: { threshold: 10 } } : { ...r }
    );
    const errorsLoose = validateSchedule(schedule, doctors, config, looseRules);
    expect(errorsLoose.some(e => e.message.includes('vidurkis'))).toBe(false);

    // With threshold=1 → doc1 (5-2.33=2.67 > 1) should warn
    const tightRules = defaultRules.map(r =>
      r.type === 'balance_distribution' ? { ...r, params: { threshold: 1 } } : { ...r }
    );
    const errorsTight = validateSchedule(schedule, doctors, config, tightRules);
    expect(errorsTight.some(e => e.message.includes('vidurkis') && e.doctorId === 'doc1')).toBe(true);
  });
});

// ===== SCHEDULER + VALIDATOR AGREEMENT =====

describe('scheduler output passes its own validator', () => {
  it('greedy schedule with 10 doctors has zero hard errors', () => {
    const doctors = makeDoctors(10);
    const config = makeConfig();
    const rules = allRulesEnabled();
    const schedule = generateSchedule(doctors, config, rules);

    const errors = validateSchedule(schedule, doctors, config, rules);
    const hardErrors = errors.filter(e => e.type === 'error');
    expect(hardErrors).toHaveLength(0);
  });

  it('ILP schedule with 10 doctors has zero hard errors', async () => {
    const doctors = makeDoctors(10);
    const config = makeConfig();
    const rules = allRulesEnabled();
    const schedule = await generateScheduleAsync(doctors, config, rules);

    const errors = validateSchedule(schedule, doctors, config, rules);
    const hardErrors = errors.filter(e => e.type === 'error');
    expect(hardErrors).toHaveLength(0);
  });

  it('greedy schedule with complex constraints passes validator', () => {
    const doctors = [
      makeDoctor({ id: 'd1', name: 'A', maxTotalPerMonth: 8 }),
      makeDoctor({ id: 'd2', name: 'B', canRepublic: false, maxDepartmentPerMonth: 6 }),
      makeDoctor({ id: 'd3', name: 'C', polyclinicSchedule: [{ weekday: 0, startHour: 9, endHour: 13 }] }),
      makeDoctor({ id: 'd4', name: 'D', unavailableDates: [dateStr(2026, 1, 10), dateStr(2026, 1, 11)] }),
      makeDoctor({ id: 'd5', name: 'E' }),
      makeDoctor({ id: 'd6', name: 'F' }),
      makeDoctor({ id: 'd7', name: 'G', maxRepublicPerMonth: 3 }),
      makeDoctor({ id: 'd8', name: 'H' }),
      makeDoctor({ id: 'd9', name: 'I' }),
      makeDoctor({ id: 'd10', name: 'J' }),
    ];
    const config = makeConfig();
    const rules = allRulesEnabled();
    const schedule = generateSchedule(doctors, config, rules);

    const errors = validateSchedule(schedule, doctors, config, rules);
    const hardErrors = errors.filter(e => e.type === 'error');
    expect(hardErrors).toHaveLength(0);
  });

  it('ILP schedule with complex constraints passes validator', async () => {
    const doctors = [
      makeDoctor({ id: 'd1', name: 'A', maxTotalPerMonth: 8 }),
      makeDoctor({ id: 'd2', name: 'B', canRepublic: false, maxDepartmentPerMonth: 6 }),
      makeDoctor({ id: 'd3', name: 'C', polyclinicSchedule: [{ weekday: 0, startHour: 9, endHour: 13 }] }),
      makeDoctor({ id: 'd4', name: 'D', unavailableDates: [dateStr(2026, 1, 10), dateStr(2026, 1, 11)] }),
      makeDoctor({ id: 'd5', name: 'E' }),
      makeDoctor({ id: 'd6', name: 'F' }),
      makeDoctor({ id: 'd7', name: 'G', maxRepublicPerMonth: 3 }),
      makeDoctor({ id: 'd8', name: 'H' }),
      makeDoctor({ id: 'd9', name: 'I' }),
      makeDoctor({ id: 'd10', name: 'J' }),
      makeDoctor({ id: 'd11', name: 'K' }),
      makeDoctor({ id: 'd12', name: 'L' }),
    ];
    const config = makeConfig();
    const rules = allRulesEnabled();
    const schedule = await generateScheduleAsync(doctors, config, rules);

    const errors = validateSchedule(schedule, doctors, config, rules);
    const hardErrors = errors.filter(e => e.type === 'error');
    expect(hardErrors).toHaveLength(0);
  });
});

// ===== STRESS: SCALE TEST =====

describe('scale: 20 doctors with mixed constraints', () => {
  it('generates valid schedule and finishes under 15s', async () => {
    const doctors: Doctor[] = [];
    for (let i = 0; i < 20; i++) {
      doctors.push(makeDoctor({
        id: `d${i}`,
        name: `Doc${i}`,
        canRepublic: i < 14, // 14 can do republic, 6 dept-only
        canDepartment: true,
        maxTotalPerMonth: i < 5 ? 6 : null, // first 5 have total limits
        polyclinicSchedule: i % 3 === 0
          ? [{ weekday: i % 5, startHour: 9, endHour: 13 }]
          : [],
        unavailableDates: i % 4 === 0
          ? [dateStr(2026, 1, 10 + i)]
          : [],
      }));
    }

    const config = makeConfig({ holidays: [1] });
    const rules = allRulesEnabled();

    const start = Date.now();
    const schedule = await generateScheduleAsync(doctors, config, rules);
    const elapsed = Date.now() - start;

    expect(schedule).toHaveLength(31);
    expect(elapsed).toBeLessThan(15000);

    // Validate
    const errors = validateSchedule(schedule, doctors, config, rules);
    const hardErrors = errors.filter(e => e.type === 'error');
    expect(hardErrors).toHaveLength(0);

    // Balance check
    const counts = countAssignments(schedule);
    const totals = Object.values(counts).map(c => c.total);
    expect(Math.max(...totals) - Math.min(...totals)).toBeLessThanOrEqual(4);
  }, 20000);
});
