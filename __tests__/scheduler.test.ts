import { describe, it, expect } from 'vitest';
import { generateSchedule, generateScheduleAsync } from '@/lib/scheduler';
import { makeDoctor, makeDoctors, makeConfig, allRulesEnabled, rulesWithDisabled, dateStr } from './helpers';
import { validateSchedule } from '@/lib/validator';
import { ScheduleRule } from '@/lib/types';

describe('generateSchedule (greedy)', () => {
  it('generates a schedule with correct number of days', () => {
    const doctors = makeDoctors(6);
    const config = makeConfig(); // Jan 2026 = 31 days
    const rules = allRulesEnabled();

    const schedule = generateSchedule(doctors, config, rules);
    expect(schedule).toHaveLength(31);
  });

  it('sets day numbers sequentially from 1', () => {
    const doctors = makeDoctors(6);
    const config = makeConfig();
    const schedule = generateSchedule(doctors, config);

    for (let i = 0; i < schedule.length; i++) {
      expect(schedule[i].day).toBe(i + 1);
    }
  });

  it('marks weekends correctly', () => {
    const doctors = makeDoctors(6);
    const config = makeConfig(); // Jan 2026
    const schedule = generateSchedule(doctors, config);

    for (const entry of schedule) {
      const date = new Date(2026, 0, entry.day);
      const jsDay = date.getDay();
      const weekday = jsDay === 0 ? 6 : jsDay - 1;
      expect(entry.weekday).toBe(weekday);
      expect(entry.isWeekend).toBe(weekday >= 5);
    }
  });

  it('marks holidays correctly', () => {
    const config = makeConfig({ holidays: [1, 15] });
    const doctors = makeDoctors(6);
    const schedule = generateSchedule(doctors, config);

    expect(schedule.find(e => e.day === 1)!.isHoliday).toBe(true);
    expect(schedule.find(e => e.day === 15)!.isHoliday).toBe(true);
    expect(schedule.find(e => e.day === 2)!.isHoliday).toBe(false);
  });

  it('assigns republic and department doctors for each day', () => {
    const doctors = makeDoctors(8);
    const config = makeConfig();
    const rules = allRulesEnabled();

    const schedule = generateSchedule(doctors, config, rules);
    for (const entry of schedule) {
      expect(entry.republicDoctor).toBeTruthy();
      expect(entry.departmentDoctor).toBeTruthy();
    }
  });

  it('never assigns same doctor to both slots on same day', () => {
    const doctors = makeDoctors(8);
    const config = makeConfig();
    const schedule = generateSchedule(doctors, config, allRulesEnabled());

    for (const entry of schedule) {
      if (entry.republicDoctor && entry.departmentDoctor) {
        expect(entry.republicDoctor).not.toBe(entry.departmentDoctor);
      }
    }
  });

  it('respects slot type restrictions', () => {
    const doctors = [
      makeDoctor({ id: 'r1', name: 'Republic1' }),
      makeDoctor({ id: 'r2', name: 'Republic2' }),
      makeDoctor({ id: 'r3', name: 'Republic3' }),
      makeDoctor({ id: 'd1', name: 'DeptOnly1', canRepublic: false }),
      makeDoctor({ id: 'd2', name: 'DeptOnly2', canRepublic: false }),
      makeDoctor({ id: 'd3', name: 'DeptOnly3', canRepublic: false }),
    ];
    const config = makeConfig();
    const schedule = generateSchedule(doctors, config, allRulesEnabled());

    for (const entry of schedule) {
      if (entry.republicDoctor) {
        const doc = doctors.find(d => d.id === entry.republicDoctor);
        expect(doc?.canRepublic).toBe(true);
      }
    }
  });

  it('respects unavailable dates', () => {
    const doctors = [
      makeDoctor({ id: 'doc1', name: 'A', unavailableDates: [dateStr(2026, 1, 5), dateStr(2026, 1, 6)] }),
      makeDoctor({ id: 'doc2', name: 'B' }),
      makeDoctor({ id: 'doc3', name: 'C' }),
      makeDoctor({ id: 'doc4', name: 'D' }),
      makeDoctor({ id: 'doc5', name: 'E' }),
      makeDoctor({ id: 'doc6', name: 'F' }),
    ];
    const config = makeConfig();
    const schedule = generateSchedule(doctors, config, allRulesEnabled());

    for (const entry of schedule) {
      if (entry.day === 5 || entry.day === 6) {
        expect(entry.republicDoctor).not.toBe('doc1');
        expect(entry.departmentDoctor).not.toBe('doc1');
      }
    }
  });

  it('respects polyclinic same-day restriction', () => {
    // Jan 5 2026 = Monday (weekday=0)
    const doctors = [
      makeDoctor({
        id: 'doc1', name: 'A',
        polyclinicSchedule: [{ weekday: 0, startHour: 9, endHour: 13 }],
      }),
      makeDoctor({ id: 'doc2', name: 'B' }),
      makeDoctor({ id: 'doc3', name: 'C' }),
      makeDoctor({ id: 'doc4', name: 'D' }),
      makeDoctor({ id: 'doc5', name: 'E' }),
      makeDoctor({ id: 'doc6', name: 'F' }),
    ];
    const config = makeConfig();
    const schedule = generateSchedule(doctors, config, allRulesEnabled());

    // doc1 should not be assigned on any Monday
    for (const entry of schedule) {
      if (entry.weekday === 0) {
        expect(entry.republicDoctor).not.toBe('doc1');
        expect(entry.departmentDoctor).not.toBe('doc1');
      }
    }
  });

  it('sets clinicDoctor on workdays', () => {
    const doctors = makeDoctors(6);
    const config = makeConfig();
    const schedule = generateSchedule(doctors, config, allRulesEnabled());

    for (const entry of schedule) {
      if (!entry.isWeekend && !entry.isHoliday) {
        // clinicDoctor yra atskira rotacija — priskirtas, bet nebūtinai = republicDoctor
        expect(entry.clinicDoctor).not.toBeNull();
      } else {
        expect(entry.clinicDoctor).toBeNull();
      }
    }
  });

  it('all residentDoctor slots are null', () => {
    const doctors = makeDoctors(6);
    const config = makeConfig();
    const schedule = generateSchedule(doctors, config);

    for (const entry of schedule) {
      expect(entry.residentDoctor).toBeNull();
    }
  });

  it('generates schedule with monthly limits respected', () => {
    const doctors = [
      makeDoctor({ id: 'doc1', name: 'A', maxTotalPerMonth: 3 }),
      makeDoctor({ id: 'doc2', name: 'B' }),
      makeDoctor({ id: 'doc3', name: 'C' }),
      makeDoctor({ id: 'doc4', name: 'D' }),
      makeDoctor({ id: 'doc5', name: 'E' }),
      makeDoctor({ id: 'doc6', name: 'F' }),
      makeDoctor({ id: 'doc7', name: 'G' }),
      makeDoctor({ id: 'doc8', name: 'H' }),
    ];
    const config = makeConfig();
    const schedule = generateSchedule(doctors, config, allRulesEnabled());

    let doc1Count = 0;
    for (const entry of schedule) {
      if (entry.republicDoctor === 'doc1') doc1Count++;
      if (entry.departmentDoctor === 'doc1') doc1Count++;
    }
    expect(doc1Count).toBeLessThanOrEqual(3);
  });

  it('works with February (28 days, non-leap year)', () => {
    const config = makeConfig({ month: 2, year: 2026 }); // Feb 2026, not leap
    const doctors = makeDoctors(6);
    const schedule = generateSchedule(doctors, config);
    expect(schedule).toHaveLength(28);
  });

  it('works with February (29 days, leap year)', () => {
    const config = makeConfig({ month: 2, year: 2028 }); // 2028 is leap year
    const doctors = makeDoctors(6);
    const schedule = generateSchedule(doctors, config);
    expect(schedule).toHaveLength(29);
  });

  it('handles disabled rules gracefully', () => {
    // All rules disabled — should still generate a schedule without crashing
    const doctors = makeDoctors(4);
    const config = makeConfig();
    const rules = allRulesEnabled().map(r => ({ ...r, enabled: false }));

    const schedule = generateSchedule(doctors, config, rules);
    expect(schedule).toHaveLength(31);
  });

  it('handles no rules parameter', () => {
    const doctors = makeDoctors(6);
    const config = makeConfig();
    const schedule = generateSchedule(doctors, config);
    expect(schedule).toHaveLength(31);
  });

  it('produces valid schedule with enough doctors', () => {
    const doctors = makeDoctors(10);
    const config = makeConfig();
    const rules = allRulesEnabled();

    const schedule = generateSchedule(doctors, config, rules);
    const errors = validateSchedule(schedule, doctors, config, rules);
    const hardErrors = errors.filter(e => e.type === 'error');
    // Should produce no hard errors with 10 doctors
    expect(hardErrors).toHaveLength(0);
  });
});

describe('generateScheduleAsync (ILP with greedy fallback)', () => {
  it('generates a schedule with correct number of days', async () => {
    const doctors = makeDoctors(6);
    const config = makeConfig();
    const rules = allRulesEnabled();

    const schedule = await generateScheduleAsync(doctors, config, rules);
    expect(schedule).toHaveLength(31);
  });

  it('assigns both slots for every day', async () => {
    const doctors = makeDoctors(8);
    const config = makeConfig();
    const rules = allRulesEnabled();

    const schedule = await generateScheduleAsync(doctors, config, rules);
    for (const entry of schedule) {
      expect(entry.republicDoctor).toBeTruthy();
      expect(entry.departmentDoctor).toBeTruthy();
    }
  });

  it('never assigns same doctor to both slots', async () => {
    const doctors = makeDoctors(8);
    const config = makeConfig();
    const rules = allRulesEnabled();

    const schedule = await generateScheduleAsync(doctors, config, rules);
    for (const entry of schedule) {
      if (entry.republicDoctor && entry.departmentDoctor) {
        expect(entry.republicDoctor).not.toBe(entry.departmentDoctor);
      }
    }
  });

  it('produces valid schedule (no hard errors)', async () => {
    const doctors = makeDoctors(10);
    const config = makeConfig();
    const rules = allRulesEnabled();

    const schedule = await generateScheduleAsync(doctors, config, rules);
    const errors = validateSchedule(schedule, doctors, config, rules);
    const hardErrors = errors.filter(e => e.type === 'error');
    expect(hardErrors).toHaveLength(0);
  });

  it('respects slot type restrictions', async () => {
    const doctors = [
      makeDoctor({ id: 'r1', name: 'Republic1' }),
      makeDoctor({ id: 'r2', name: 'Republic2' }),
      makeDoctor({ id: 'r3', name: 'Republic3' }),
      makeDoctor({ id: 'r4', name: 'Republic4' }),
      makeDoctor({ id: 'd1', name: 'DeptOnly1', canRepublic: false }),
      makeDoctor({ id: 'd2', name: 'DeptOnly2', canRepublic: false }),
      makeDoctor({ id: 'd3', name: 'DeptOnly3', canRepublic: false }),
      makeDoctor({ id: 'd4', name: 'DeptOnly4', canRepublic: false }),
    ];
    const config = makeConfig();
    const schedule = await generateScheduleAsync(doctors, config, allRulesEnabled());

    for (const entry of schedule) {
      if (entry.republicDoctor) {
        const doc = doctors.find(d => d.id === entry.republicDoctor);
        expect(doc?.canRepublic).toBe(true);
      }
    }
  });

  it('respects unavailable dates', async () => {
    const doctors = [
      makeDoctor({ id: 'doc1', name: 'A', unavailableDates: [dateStr(2026, 1, 5)] }),
      ...makeDoctors(7).map((d, i) => ({ ...d, id: `extra${i}`, name: `Extra${i}` })),
    ];
    const config = makeConfig();
    const schedule = await generateScheduleAsync(doctors, config, allRulesEnabled());

    const day5 = schedule.find(e => e.day === 5)!;
    expect(day5.republicDoctor).not.toBe('doc1');
    expect(day5.departmentDoctor).not.toBe('doc1');
  });

  it('handles many doctors efficiently', async () => {
    const doctors = makeDoctors(20);
    const config = makeConfig();

    const start = Date.now();
    const schedule = await generateScheduleAsync(doctors, config, allRulesEnabled());
    const elapsed = Date.now() - start;

    expect(schedule).toHaveLength(31);
    expect(elapsed).toBeLessThan(15000); // Should finish within 15s
  }, 20000);

  it('provides balanced distribution', async () => {
    const doctors = makeDoctors(8);
    const config = makeConfig();
    const schedule = await generateScheduleAsync(doctors, config, allRulesEnabled());

    // Count assignments per doctor
    const counts: Record<string, number> = {};
    for (const entry of schedule) {
      if (entry.republicDoctor) counts[entry.republicDoctor] = (counts[entry.republicDoctor] || 0) + 1;
      if (entry.departmentDoctor) counts[entry.departmentDoctor] = (counts[entry.departmentDoctor] || 0) + 1;
    }

    const values = Object.values(counts);
    const min = Math.min(...values);
    const max = Math.max(...values);
    // With ILP, distribution should be fairly balanced (within ~3 of each other)
    expect(max - min).toBeLessThanOrEqual(4);
  });

  it('respects min rest days', async () => {
    const doctors = makeDoctors(8);
    const config = makeConfig();
    const schedule = await generateScheduleAsync(doctors, config, allRulesEnabled());

    // For each doctor, check that consecutive assignments have >= 2 day gap
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
        expect(days[i] - days[i - 1]).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('works without rules parameter', async () => {
    const doctors = makeDoctors(6);
    const config = makeConfig();
    const schedule = await generateScheduleAsync(doctors, config);
    expect(schedule).toHaveLength(31);
  });
});

describe('edge cases', () => {
  it('handles minimum viable doctor count (3 doctors)', () => {
    const doctors = makeDoctors(3);
    const config = makeConfig();
    const schedule = generateSchedule(doctors, config, allRulesEnabled());
    expect(schedule).toHaveLength(31);
    // With only 3 doctors and rest day rules, some slots may be empty
  });

  it('handles all doctors with polyclinic every weekday', () => {
    const allWeekdays = [0, 1, 2, 3, 4].map(wd => ({ weekday: wd, startHour: 9, endHour: 13 }));
    const doctors = Array.from({ length: 6 }, (_, i) =>
      makeDoctor({
        id: `doc${i}`,
        name: `Doc${i}`,
        polyclinicSchedule: i < 3 ? allWeekdays : [], // half have polyclinic every weekday
      })
    );
    const config = makeConfig();

    // Should not throw
    const schedule = generateSchedule(doctors, config, allRulesEnabled());
    expect(schedule).toHaveLength(31);
  });

  it('handles empty holidays array', () => {
    const config = makeConfig({ holidays: [] });
    const doctors = makeDoctors(6);
    const schedule = generateSchedule(doctors, config);
    expect(schedule.every(e => !e.isHoliday)).toBe(true);
  });

  it('handles month with 30 days (April)', () => {
    const config = makeConfig({ month: 4 }); // April
    const doctors = makeDoctors(6);
    const schedule = generateSchedule(doctors, config);
    expect(schedule).toHaveLength(30);
  });
});
