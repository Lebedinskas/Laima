import { describe, it, expect } from 'vitest';
import { validateSchedule, calculateStats } from '@/lib/validator';
import { makeDoctor, makeDoctors, makeConfig, makeBlankSchedule, assignSchedule, allRulesEnabled, rulesWithDisabled, dateStr } from './helpers';

describe('calculateStats', () => {
  it('returns stats for all doctors', () => {
    const doctors = makeDoctors(3);
    const config = makeConfig();
    const schedule = makeBlankSchedule(config);
    const stats = calculateStats(schedule, doctors, config);
    expect(stats).toHaveLength(3);
  });

  it('counts republic and department assignments', () => {
    const doctors = makeDoctors(3);
    const config = makeConfig();
    const schedule = assignSchedule(makeBlankSchedule(config), [
      { day: 2, republic: 'doc1', department: 'doc2' },
      { day: 3, republic: 'doc1', department: 'doc3' },
      { day: 5, republic: 'doc2', department: 'doc1' },
    ]);

    const stats = calculateStats(schedule, doctors, config);
    const s1 = stats.find(s => s.doctorId === 'doc1')!;
    const s2 = stats.find(s => s.doctorId === 'doc2')!;

    expect(s1.republicCount).toBe(2);
    expect(s1.departmentCount).toBe(1);
    expect(s1.totalCount).toBe(3);

    expect(s2.republicCount).toBe(1);
    expect(s2.departmentCount).toBe(1);
    expect(s2.totalCount).toBe(2);
  });

  it('counts weekend shifts correctly', () => {
    const doctors = makeDoctors(2);
    const config = makeConfig(); // Jan 2026: 3rd=Saturday, 4th=Sunday
    const schedule = makeBlankSchedule(config);
    // Jan 3 2026 is Saturday (weekday=5)
    const withAssignments = assignSchedule(schedule, [
      { day: 3, republic: 'doc1' }, // Saturday
      { day: 5, republic: 'doc1' }, // Monday
    ]);

    const stats = calculateStats(withAssignments, doctors, config);
    const s1 = stats.find(s => s.doctorId === 'doc1')!;
    expect(s1.weekendCount).toBe(1);
  });

  it('counts holiday shifts as weekend', () => {
    const doctors = makeDoctors(2);
    const config = makeConfig({ holidays: [1, 5] }); // Jan 1 and 5 are holidays
    const schedule = assignSchedule(makeBlankSchedule(config), [
      { day: 1, republic: 'doc1' }, // holiday
      { day: 5, republic: 'doc1' }, // holiday (Monday)
    ]);

    const stats = calculateStats(schedule, doctors, config);
    const s1 = stats.find(s => s.doctorId === 'doc1')!;
    expect(s1.weekendCount).toBe(2);
  });
});

describe('validateSchedule', () => {
  describe('require_both_slots', () => {
    it('reports error when republic slot is empty', () => {
      const doctors = makeDoctors(3);
      const config = makeConfig();
      const schedule = assignSchedule(makeBlankSchedule(config), [
        { day: 2, department: 'doc1' }, // republic empty
      ]);
      const rules = allRulesEnabled();
      const errors = validateSchedule(schedule, doctors, config, rules);
      const emptySlotErrors = errors.filter(e => e.message.includes('Respublika') && e.message.includes('tuščias'));
      expect(emptySlotErrors.length).toBeGreaterThan(0);
    });

    it('does not report when rule is disabled', () => {
      const doctors = makeDoctors(3);
      const config = makeConfig();
      const schedule = assignSchedule(makeBlankSchedule(config), [
        { day: 2, department: 'doc1' },
      ]);
      const rules = rulesWithDisabled('require_both_slots');
      const errors = validateSchedule(schedule, doctors, config, rules);
      const emptySlotErrors = errors.filter(e => e.message.includes('tuščias'));
      expect(emptySlotErrors).toHaveLength(0);
    });
  });

  describe('respect_unavailable', () => {
    it('reports error when doctor assigned on unavailable date', () => {
      const doc = makeDoctor({ id: 'doc1', name: 'Jonas', unavailableDates: [dateStr(2026, 1, 5)] });
      const config = makeConfig();
      const schedule = assignSchedule(makeBlankSchedule(config), [
        { day: 5, republic: 'doc1' },
      ]);

      const errors = validateSchedule(schedule, [doc], config, allRulesEnabled());
      expect(errors.some(e => e.message.includes('Jonas') && e.message.includes('negalintis'))).toBe(true);
    });

    it('no error when rule disabled', () => {
      const doc = makeDoctor({ id: 'doc1', name: 'Jonas', unavailableDates: [dateStr(2026, 1, 5)] });
      const config = makeConfig();
      const schedule = assignSchedule(makeBlankSchedule(config), [
        { day: 5, republic: 'doc1' },
      ]);

      const errors = validateSchedule(schedule, [doc], config, rulesWithDisabled('respect_unavailable'));
      expect(errors.some(e => e.message.includes('negalintis'))).toBe(false);
    });
  });

  describe('respect_slot_types', () => {
    it('reports error when dept-only doctor assigned to republic', () => {
      const doc = makeDoctor({ id: 'doc1', name: 'Petras', canRepublic: false, canDepartment: true });
      const config = makeConfig();
      const schedule = assignSchedule(makeBlankSchedule(config), [
        { day: 2, republic: 'doc1' },
      ]);

      const errors = validateSchedule(schedule, [doc], config, allRulesEnabled());
      expect(errors.some(e => e.message.includes('Petras') && e.message.includes('respubliką'))).toBe(true);
    });

    it('reports error when republic-only doctor assigned to department', () => {
      const doc = makeDoctor({ id: 'doc1', name: 'Antanas', canRepublic: true, canDepartment: false });
      const config = makeConfig();
      const schedule = assignSchedule(makeBlankSchedule(config), [
        { day: 2, department: 'doc1' },
      ]);

      const errors = validateSchedule(schedule, [doc], config, allRulesEnabled());
      expect(errors.some(e => e.message.includes('Antanas') && e.message.includes('skyrių'))).toBe(true);
    });
  });

  describe('no_polyclinic_same_day', () => {
    it('reports error when doctor has polyclinic on same weekday', () => {
      // Jan 2 2026 is Friday (weekday=4)
      const doc = makeDoctor({
        id: 'doc1',
        name: 'Rimas',
        polyclinicSchedule: [{ weekday: 4, startHour: 9, endHour: 13 }],
      });
      const config = makeConfig();
      const schedule = assignSchedule(makeBlankSchedule(config), [
        { day: 2, republic: 'doc1' }, // Jan 2 = Friday = weekday 4
      ]);

      const errors = validateSchedule(schedule, [doc], config, allRulesEnabled());
      expect(errors.some(e => e.message.includes('Rimas') && e.message.includes('poliklinikos'))).toBe(true);
    });
  });

  describe('no_polyclinic_prev_day', () => {
    it('reports error when doctor has polyclinic next day', () => {
      // Jan 5 2026 = Monday (weekday=0), Jan 6 = Tuesday (weekday=1)
      const doc = makeDoctor({
        id: 'doc1',
        name: 'Dalia',
        polyclinicSchedule: [{ weekday: 1, startHour: 9, endHour: 13 }], // Tuesday
      });
      const config = makeConfig();
      const schedule = assignSchedule(makeBlankSchedule(config), [
        { day: 5, republic: 'doc1' }, // Monday — next day is Tuesday polyclinic
      ]);

      const errors = validateSchedule(schedule, [doc], config, allRulesEnabled());
      expect(errors.some(e => e.message.includes('Dalia') && e.message.includes('poliklinika'))).toBe(true);
    });
  });

  describe('min_rest_days', () => {
    it('reports error when shifts are on consecutive days', () => {
      const doc = makeDoctor({ id: 'doc1', name: 'Vytautas' });
      const config = makeConfig();
      const schedule = assignSchedule(makeBlankSchedule(config), [
        { day: 5, republic: 'doc1' },
        { day: 6, department: 'doc1' }, // only 1 day gap, need 2
      ]);

      const errors = validateSchedule(schedule, [doc], config, allRulesEnabled());
      expect(errors.some(e => e.message.includes('Vytautas') && e.message.includes('poilsio'))).toBe(true);
    });

    it('no error when sufficient rest between shifts', () => {
      const doc = makeDoctor({ id: 'doc1', name: 'Vytautas' });
      const config = makeConfig();
      const schedule = assignSchedule(makeBlankSchedule(config), [
        { day: 5, republic: 'doc1' },
        { day: 7, department: 'doc1' }, // 2 day gap (min_rest_days=2)
      ]);

      const errors = validateSchedule(schedule, [doc], config, allRulesEnabled());
      expect(errors.some(e => e.message.includes('Vytautas') && e.message.includes('poilsio'))).toBe(false);
    });
  });

  describe('max_weekly_hours', () => {
    it('reports error when weekly hours exceeded', () => {
      const doc = makeDoctor({ id: 'doc1', name: 'Kazys' });
      const config = makeConfig({ shiftDurationHours: 24 });
      // 3 shifts in one week = 72h > 55.5h
      // Jan 5 (Mon), Jan 7 (Wed), Jan 9 (Fri) — all week 2
      const schedule = assignSchedule(makeBlankSchedule(config), [
        { day: 5, republic: 'doc1' },
        { day: 7, republic: 'doc1' },
        { day: 9, republic: 'doc1' },
      ]);

      const errors = validateSchedule(schedule, [doc], config, allRulesEnabled());
      expect(errors.some(e => e.message.includes('Kazys') && e.message.includes('viršija'))).toBe(true);
    });
  });

  describe('respect_monthly_limits', () => {
    it('reports error when republic limit exceeded', () => {
      const doc = makeDoctor({ id: 'doc1', name: 'Ona', maxRepublicPerMonth: 2 });
      const config = makeConfig();
      const schedule = assignSchedule(makeBlankSchedule(config), [
        { day: 2, republic: 'doc1' },
        { day: 5, republic: 'doc1' },
        { day: 9, republic: 'doc1' }, // 3 > max 2
      ]);

      const errors = validateSchedule(schedule, [doc], config, allRulesEnabled());
      expect(errors.some(e => e.message.includes('Ona') && e.message.includes('respublikos'))).toBe(true);
    });

    it('reports error when total limit exceeded', () => {
      const doc = makeDoctor({ id: 'doc1', name: 'Birutė', maxTotalPerMonth: 3 });
      const config = makeConfig();
      const schedule = assignSchedule(makeBlankSchedule(config), [
        { day: 2, republic: 'doc1' },
        { day: 5, republic: 'doc1' },
        { day: 9, department: 'doc1' },
        { day: 14, republic: 'doc1' }, // 4 > max 3
      ]);

      const errors = validateSchedule(schedule, [doc], config, allRulesEnabled());
      expect(errors.some(e => e.message.includes('Birutė') && e.message.includes('budėjimai viršija'))).toBe(true);
    });
  });

  describe('balance_distribution', () => {
    it('warns when distribution is unbalanced', () => {
      const doctors = makeDoctors(4);
      const config = makeConfig();
      // doc1=7, doc2=1 → active avg=4, doc1 deviation=3 > 2.5
      const schedule = assignSchedule(makeBlankSchedule(config), [
        { day: 2, republic: 'doc1' },
        { day: 5, republic: 'doc1' },
        { day: 9, republic: 'doc1' },
        { day: 14, republic: 'doc1' },
        { day: 19, department: 'doc1' },
        { day: 23, department: 'doc1' },
        { day: 26, department: 'doc1' },
        { day: 3, department: 'doc2' },
      ]);

      const errors = validateSchedule(schedule, doctors, config, allRulesEnabled());
      expect(errors.some(e => e.message.includes('vidurkis'))).toBe(true);
    });
  });

  describe('empty rules (no rules provided)', () => {
    it('defaults to all rules enabled when no rules passed', () => {
      const doc = makeDoctor({ id: 'doc1', name: 'TestDoc', unavailableDates: [dateStr(2026, 1, 5)] });
      const config = makeConfig();
      const schedule = assignSchedule(makeBlankSchedule(config), [
        { day: 5, republic: 'doc1' },
      ]);

      // No rules passed — should default to checking everything
      const errors = validateSchedule(schedule, [doc], config);
      expect(errors.some(e => e.message.includes('negalintis'))).toBe(true);
    });
  });
});
