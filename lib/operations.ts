import { Doctor, MonthConfig, ScheduleEntry, ValidationError, ScheduleRule } from './types';
import { validateSchedule } from './validator';

type SlotType = 'republicDoctor' | 'departmentDoctor' | 'residentDoctor';

/** Check if a specific swap is feasible, returns errors that would be introduced */
export function checkSwapFeasibility(
  schedule: ScheduleEntry[],
  doctors: Doctor[],
  config: MonthConfig,
  day: number,
  slot: SlotType,
  newDoctorId: string | null,
  rules?: ScheduleRule[]
): { feasible: boolean; errors: ValidationError[]; warnings: ValidationError[] } {
  // Create modified schedule
  const newSchedule = schedule.map(entry => {
    if (entry.day === day) {
      const updated = { ...entry, [slot]: newDoctorId };
      // If changing republic on a workday, also update clinic
      if (slot === 'republicDoctor' && !entry.isWeekend && !entry.isHoliday) {
        updated.clinicDoctor = newDoctorId;
      }
      return updated;
    }
    return entry;
  });

  const allErrors = validateSchedule(newSchedule, doctors, config, rules);
  const errors = allErrors.filter(e => e.type === 'error');
  const warnings = allErrors.filter(e => e.type === 'warning');

  return {
    feasible: errors.length === 0,
    errors,
    warnings,
  };
}

/** Differential check: only returns NEW errors introduced by the swap (not pre-existing ones) */
export function checkSwapNewErrors(
  schedule: ScheduleEntry[],
  doctors: Doctor[],
  config: MonthConfig,
  day: number,
  slot: SlotType,
  newDoctorId: string | null,
  rules?: ScheduleRule[]
): { newErrors: ValidationError[]; resolvedErrors: ValidationError[]; netChange: number } {
  const beforeErrors = validateSchedule(schedule, doctors, config, rules);

  const newSchedule = schedule.map(entry => {
    if (entry.day === day) {
      const updated = { ...entry, [slot]: newDoctorId };
      if (slot === 'republicDoctor' && !entry.isWeekend && !entry.isHoliday) {
        updated.clinicDoctor = newDoctorId;
      }
      return updated;
    }
    return entry;
  });

  const afterErrors = validateSchedule(newSchedule, doctors, config, rules);

  // Build fingerprints: "type|message" for comparison
  const fingerprint = (e: ValidationError) => `${e.type}|${e.message}`;
  const beforeSet = new Set(beforeErrors.map(fingerprint));
  const afterSet = new Set(afterErrors.map(fingerprint));

  const newErrors = afterErrors.filter(e => !beforeSet.has(fingerprint(e)));
  const resolvedErrors = beforeErrors.filter(e => !afterSet.has(fingerprint(e)));

  return {
    newErrors,
    resolvedErrors,
    netChange: afterErrors.length - beforeErrors.length,
  };
}

/** Perform a swap — returns new schedule or null if not feasible */
export function swapDoctor(
  schedule: ScheduleEntry[],
  doctors: Doctor[],
  config: MonthConfig,
  day: number,
  slot: SlotType,
  newDoctorId: string | null,
  rules?: ScheduleRule[]
): { schedule: ScheduleEntry[]; errors: ValidationError[] } | null {
  const check = checkSwapFeasibility(schedule, doctors, config, day, slot, newDoctorId, rules);

  const newSchedule = schedule.map(entry => {
    if (entry.day === day) {
      const updated = { ...entry, [slot]: newDoctorId };
      if (slot === 'republicDoctor' && !entry.isWeekend && !entry.isHoliday) {
        updated.clinicDoctor = newDoctorId;
      }
      return updated;
    }
    return entry;
  });

  return {
    schedule: newSchedule,
    errors: [...check.errors, ...check.warnings],
  };
}

export interface AlternativeResult {
  doctorId: string;
  name: string;
  newErrors: ValidationError[];     // only NEW problems this swap would create
  resolvedErrors: ValidationError[]; // problems this swap would FIX
  netChange: number;                 // negative = improves schedule
}

/** Find all doctors who could fill a specific slot on a specific day.
 *  Uses differential validation: only shows NEW errors introduced by the swap,
 *  not pre-existing problems in the schedule. */
export function suggestAlternatives(
  schedule: ScheduleEntry[],
  doctors: Doctor[],
  config: MonthConfig,
  day: number,
  slot: SlotType,
  rules?: ScheduleRule[]
): AlternativeResult[] {
  const results: AlternativeResult[] = [];
  const entry = schedule.find(e => e.day === day);
  if (!entry) return results;

  for (const doctor of doctors) {
    // Skip current assignment
    if (slot === 'republicDoctor' && entry.republicDoctor === doctor.id) continue;
    if (slot === 'departmentDoctor' && entry.departmentDoctor === doctor.id) continue;
    // Can't be both republic and department same day
    if (slot === 'republicDoctor' && entry.departmentDoctor === doctor.id) continue;
    if (slot === 'departmentDoctor' && entry.republicDoctor === doctor.id) continue;

    const diff = checkSwapNewErrors(schedule, doctors, config, day, slot, doctor.id, rules);
    results.push({
      doctorId: doctor.id,
      name: doctor.name,
      newErrors: diff.newErrors,
      resolvedErrors: diff.resolvedErrors,
      netChange: diff.netChange,
    });
  }

  // Sort: best swaps first (fewest new errors, most resolved)
  results.sort((a, b) => {
    // First by new errors count
    if (a.newErrors.length !== b.newErrors.length) return a.newErrors.length - b.newErrors.length;
    // Then by net improvement (negative = better)
    return a.netChange - b.netChange;
  });

  return results;
}
