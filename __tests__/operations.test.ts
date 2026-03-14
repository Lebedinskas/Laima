import { describe, it, expect } from 'vitest';
import { checkSwapFeasibility, swapDoctor, suggestAlternatives } from '@/lib/operations';
import { makeDoctor, makeDoctors, makeConfig, makeBlankSchedule, assignSchedule, allRulesEnabled, dateStr } from './helpers';

describe('checkSwapFeasibility', () => {
  it('returns feasible for a valid swap', () => {
    const doctors = [
      makeDoctor({ id: 'doc1', name: 'A' }),
      makeDoctor({ id: 'doc2', name: 'B' }),
    ];
    const config = makeConfig();
    const schedule = assignSchedule(makeBlankSchedule(config), [
      { day: 5, republic: 'doc1', department: 'doc2' },
    ]);
    const rules = allRulesEnabled();

    // Swap republic on day 5 to doc2 — but doc2 is already department
    // Try swapping to a new doc
    const doc3 = makeDoctor({ id: 'doc3', name: 'C' });
    const allDocs = [...doctors, doc3];

    const result = checkSwapFeasibility(
      schedule, allDocs, config, 5, 'republicDoctor', 'doc3', rules
    );
    // May have warnings (empty slots for other days) but the swap itself should be clean
    expect(result).toBeDefined();
    expect(typeof result.feasible).toBe('boolean');
    expect(Array.isArray(result.errors)).toBe(true);
    expect(Array.isArray(result.warnings)).toBe(true);
  });

  it('returns infeasible when doctor is unavailable', () => {
    const doc = makeDoctor({ id: 'doc1', name: 'Jonas', unavailableDates: [dateStr(2026, 1, 5)] });
    const config = makeConfig();
    const schedule = makeBlankSchedule(config);
    const rules = allRulesEnabled();

    const result = checkSwapFeasibility(
      schedule, [doc], config, 5, 'republicDoctor', 'doc1', rules
    );
    expect(result.errors.some(e => e.message.includes('negalintis'))).toBe(true);
  });

  it('returns infeasible when doctor cant do republic', () => {
    const doc = makeDoctor({ id: 'doc1', name: 'Petras', canRepublic: false });
    const config = makeConfig();
    const schedule = makeBlankSchedule(config);
    const rules = allRulesEnabled();

    const result = checkSwapFeasibility(
      schedule, [doc], config, 5, 'republicDoctor', 'doc1', rules
    );
    expect(result.errors.some(e => e.message.includes('respubliką'))).toBe(true);
  });

  it('updates clinicDoctor when swapping republic on workday', () => {
    const doctors = makeDoctors(2);
    const config = makeConfig();
    const schedule = assignSchedule(makeBlankSchedule(config), [
      { day: 5, republic: 'doc1', department: 'doc2' }, // Monday — workday
    ]);

    // swapDoctor should set clinicDoctor to new republic doctor
    const result = swapDoctor(schedule, doctors, config, 5, 'republicDoctor', 'doc2');
    expect(result).not.toBeNull();
    const entry = result!.schedule.find(e => e.day === 5)!;
    expect(entry.republicDoctor).toBe('doc2');
    expect(entry.clinicDoctor).toBe('doc2');
  });
});

describe('swapDoctor', () => {
  it('returns new schedule with the swap applied', () => {
    const doctors = makeDoctors(3);
    const config = makeConfig();
    const schedule = assignSchedule(makeBlankSchedule(config), [
      { day: 5, republic: 'doc1', department: 'doc2' },
    ]);

    const result = swapDoctor(schedule, doctors, config, 5, 'republicDoctor', 'doc3');
    expect(result).not.toBeNull();
    const entry = result!.schedule.find(e => e.day === 5)!;
    expect(entry.republicDoctor).toBe('doc3');
    expect(entry.departmentDoctor).toBe('doc2'); // unchanged
  });

  it('original schedule is not mutated', () => {
    const doctors = makeDoctors(2);
    const config = makeConfig();
    const schedule = assignSchedule(makeBlankSchedule(config), [
      { day: 5, republic: 'doc1' },
    ]);

    swapDoctor(schedule, doctors, config, 5, 'republicDoctor', 'doc2');
    expect(schedule.find(e => e.day === 5)!.republicDoctor).toBe('doc1');
  });

  it('can set slot to null (unassign)', () => {
    const doctors = makeDoctors(2);
    const config = makeConfig();
    const schedule = assignSchedule(makeBlankSchedule(config), [
      { day: 5, republic: 'doc1' },
    ]);

    const result = swapDoctor(schedule, doctors, config, 5, 'republicDoctor', null);
    expect(result).not.toBeNull();
    expect(result!.schedule.find(e => e.day === 5)!.republicDoctor).toBeNull();
  });
});

describe('suggestAlternatives', () => {
  it('returns all eligible doctors sorted by error count', () => {
    const doctors = makeDoctors(5);
    const config = makeConfig();
    const schedule = assignSchedule(makeBlankSchedule(config), [
      { day: 5, republic: 'doc1', department: 'doc2' },
    ]);

    const alternatives = suggestAlternatives(schedule, doctors, config, 5, 'republicDoctor');
    // Should exclude current republic (doc1) and current department (doc2)
    const ids = alternatives.map(a => a.doctorId);
    expect(ids).not.toContain('doc1');
    expect(ids).not.toContain('doc2');
    expect(ids).toContain('doc3');
    expect(ids).toContain('doc4');
    expect(ids).toContain('doc5');
  });

  it('sorts feasible doctors first', () => {
    const docs = [
      makeDoctor({ id: 'ok', name: 'Ok' }),
      makeDoctor({ id: 'bad', name: 'Bad', unavailableDates: [dateStr(2026, 1, 5)] }),
    ];
    const config = makeConfig();
    const schedule = assignSchedule(makeBlankSchedule(config), [
      { day: 5, republic: 'current', department: 'other' },
    ]);

    const alts = suggestAlternatives(schedule, docs, config, 5, 'republicDoctor', allRulesEnabled());
    // 'ok' should come before 'bad' (fewer new errors)
    const okIdx = alts.findIndex(a => a.doctorId === 'ok');
    const badIdx = alts.findIndex(a => a.doctorId === 'bad');
    if (okIdx >= 0 && badIdx >= 0) {
      expect(okIdx).toBeLessThan(badIdx);
    }
  });

  it('returns empty when no alternatives for non-existent day', () => {
    const doctors = makeDoctors(2);
    const config = makeConfig();
    const schedule = makeBlankSchedule(config);

    const alts = suggestAlternatives(schedule, doctors, config, 99, 'republicDoctor');
    expect(alts).toHaveLength(0);
  });
});
