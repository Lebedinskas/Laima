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

/** Find all doctors who could fill a specific slot on a specific day */
export function suggestAlternatives(
  schedule: ScheduleEntry[],
  doctors: Doctor[],
  config: MonthConfig,
  day: number,
  slot: SlotType,
  rules?: ScheduleRule[]
): { doctorId: string; name: string; errors: ValidationError[] }[] {
  const results: { doctorId: string; name: string; errors: ValidationError[] }[] = [];
  const entry = schedule.find(e => e.day === day);
  if (!entry) return results;

  for (const doctor of doctors) {
    // Skip current assignment
    if (slot === 'republicDoctor' && entry.republicDoctor === doctor.id) continue;
    if (slot === 'departmentDoctor' && entry.departmentDoctor === doctor.id) continue;
    // Can't be both republic and department same day
    if (slot === 'republicDoctor' && entry.departmentDoctor === doctor.id) continue;
    if (slot === 'departmentDoctor' && entry.republicDoctor === doctor.id) continue;

    const check = checkSwapFeasibility(schedule, doctors, config, day, slot, doctor.id, rules);
    results.push({
      doctorId: doctor.id,
      name: doctor.name,
      errors: check.errors,
    });
  }

  // Sort: feasible first, then by error count
  results.sort((a, b) => a.errors.length - b.errors.length);

  return results;
}
