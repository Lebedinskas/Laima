import { Doctor, MonthConfig, ScheduleEntry, ValidationError, DoctorStats, ScheduleRule } from './types';
import { VALIDATION_MESSAGES, DEFAULT_MAX_WEEKLY_HOURS, DEFAULT_SHIFT_DURATION } from './constants';

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function jsToWeekday(jsDay: number): number {
  return jsDay === 0 ? 6 : jsDay - 1;
}

/** Helper: check if a rule is enabled */
function isEnabled(rules: ScheduleRule[], type: string): boolean {
  const rule = rules.find(r => r.type === type);
  return rule ? rule.enabled : true;
}

/** Helper: get rule severity */
function getSeverity(rules: ScheduleRule[], type: string): 'error' | 'warning' {
  const rule = rules.find(r => r.type === type);
  return rule?.severity || 'error';
}

/** Helper: get rule param */
function getParam(rules: ScheduleRule[], type: string, param: string, defaultVal: number): number {
  const rule = rules.find(r => r.type === type);
  if (!rule) return defaultVal;
  return (rule.params[param] as number) ?? defaultVal;
}

/** Calculate stats for each doctor from the schedule */
export function calculateStats(
  schedule: ScheduleEntry[],
  doctors: Doctor[],
  config: MonthConfig
): DoctorStats[] {
  const shiftDuration = config.shiftDurationHours || DEFAULT_SHIFT_DURATION;
  const statsMap: Record<string, DoctorStats> = {};

  for (const doc of doctors) {
    statsMap[doc.id] = {
      doctorId: doc.id,
      name: doc.name,
      republicCount: 0,
      departmentCount: 0,
      totalCount: 0,
      weekendCount: 0,
      weeklyHours: {},
    };
  }

  for (const entry of schedule) {
    const date = new Date(config.year, config.month - 1, entry.day);
    const weekNum = getISOWeek(date);

    for (const [slot, field] of [
      ['republic', 'republicDoctor'],
      ['department', 'departmentDoctor'],
    ] as const) {
      const doctorId = entry[field];
      if (!doctorId || !statsMap[doctorId]) continue;

      const stats = statsMap[doctorId];
      if (slot === 'republic') stats.republicCount++;
      if (slot === 'department') stats.departmentCount++;
      stats.totalCount++;
      if (entry.isWeekend || entry.isHoliday) stats.weekendCount++;
      stats.weeklyHours[weekNum] = (stats.weeklyHours[weekNum] || 0) + shiftDuration;
    }
  }

  return Object.values(statsMap);
}

/** Validate the full schedule against dynamic rules */
export function validateSchedule(
  schedule: ScheduleEntry[],
  doctors: Doctor[],
  config: MonthConfig,
  rules?: ScheduleRule[]
): ValidationError[] {
  const errors: ValidationError[] = [];
  const activeRules = rules || [];
  const maxWeeklyHours = getParam(activeRules, 'max_weekly_hours', 'hours', config.maxWeeklyHours || DEFAULT_MAX_WEEKLY_HOURS);
  const minRestDays = getParam(activeRules, 'min_rest_days', 'days', 2);
  const balanceThreshold = getParam(activeRules, 'balance_distribution', 'threshold', 1.5);

  const doctorMap = new Map(doctors.map(d => [d.id, d]));
  const stats = calculateStats(schedule, doctors, config);
  const statsMap = new Map(stats.map(s => [s.doctorId, s]));

  // Build lookup: doctorId -> list of days they're assigned
  const doctorDays: Record<string, { day: number; slot: string }[]> = {};
  for (const entry of schedule) {
    for (const [slot, field] of [
      ['respublika', 'republicDoctor'],
      ['skyrius', 'departmentDoctor'],
    ] as const) {
      const doctorId = entry[field];
      if (!doctorId) continue;
      if (!doctorDays[doctorId]) doctorDays[doctorId] = [];
      doctorDays[doctorId].push({ day: entry.day, slot });
    }
  }

  const daysInMonth = new Date(config.year, config.month, 0).getDate();

  for (const entry of schedule) {
    // clinicDoctor consistency check (workdays: clinicDoctor should match republicDoctor)
    const isWorkday = !entry.isWeekend && !entry.isHoliday;
    if (isWorkday && entry.republicDoctor && entry.clinicDoctor && entry.clinicDoctor !== entry.republicDoctor) {
      const repDoc = doctorMap.get(entry.republicDoctor);
      const clinDoc = doctorMap.get(entry.clinicDoctor);
      errors.push({
        type: 'warning',
        message: `${entry.day} d.: klinikos gydytojas (${clinDoc?.name}) nesutampa su respublikos gydytoju (${repDoc?.name})`,
        day: entry.day,
      });
    }

    // same doctor in both slots
    if (entry.republicDoctor && entry.departmentDoctor && entry.republicDoctor === entry.departmentDoctor) {
      const doctor = doctorMap.get(entry.republicDoctor);
      errors.push({
        type: 'error',
        message: `${doctor?.name || entry.republicDoctor}: ${entry.day} d. priskirtas ir respublikos, ir skyriaus stulpelyje`,
        day: entry.day,
        doctorId: entry.republicDoctor,
      });
    }

    // require_both_slots
    if (isEnabled(activeRules, 'require_both_slots')) {
      const sev = getSeverity(activeRules, 'require_both_slots');
      if (!entry.republicDoctor) {
        errors.push({
          type: sev,
          message: VALIDATION_MESSAGES.SLOT_EMPTY(entry.day, 'Respublika'),
          day: entry.day,
        });
      }
      if (!entry.departmentDoctor) {
        errors.push({
          type: sev,
          message: VALIDATION_MESSAGES.SLOT_EMPTY(entry.day, 'Skyrius'),
          day: entry.day,
        });
      }
    }

    // Check each assigned doctor
    for (const [slot, field] of [
      ['respublika', 'republicDoctor'],
      ['skyrius', 'departmentDoctor'],
    ] as const) {
      const doctorId = entry[field];
      if (!doctorId) continue;
      const doctor = doctorMap.get(doctorId);
      if (!doctor) continue;

      // respect_unavailable
      if (isEnabled(activeRules, 'respect_unavailable') && doctor.unavailableDates.includes(entry.date)) {
        errors.push({
          type: getSeverity(activeRules, 'respect_unavailable'),
          message: VALIDATION_MESSAGES.UNAVAILABLE(doctor.name, entry.day),
          day: entry.day,
          doctorId,
        });
      }

      // respect_slot_types
      if (isEnabled(activeRules, 'respect_slot_types')) {
        const sev = getSeverity(activeRules, 'respect_slot_types');
        if (slot === 'respublika' && !doctor.canRepublic) {
          errors.push({
            type: sev,
            message: VALIDATION_MESSAGES.CANNOT_REPUBLIC(doctor.name),
            day: entry.day,
            doctorId,
          });
        }
        if (slot === 'skyrius' && !doctor.canDepartment) {
          errors.push({
            type: sev,
            message: VALIDATION_MESSAGES.CANNOT_DEPARTMENT(doctor.name),
            day: entry.day,
            doctorId,
          });
        }
      }

      // no_polyclinic_same_day
      if (isEnabled(activeRules, 'no_polyclinic_same_day')) {
        const weekday = entry.weekday;
        if (doctor.polyclinicSchedule.some(s => s.weekday === weekday)) {
          errors.push({
            type: getSeverity(activeRules, 'no_polyclinic_same_day'),
            message: VALIDATION_MESSAGES.POLYCLINIC_CONFLICT(doctor.name, entry.day),
            day: entry.day,
            doctorId,
          });
        }
      }

      // no_polyclinic_prev_day
      if (isEnabled(activeRules, 'no_polyclinic_prev_day') && entry.day < daysInMonth) {
        const nextDate = new Date(config.year, config.month - 1, entry.day + 1);
        const nextWeekday = jsToWeekday(nextDate.getDay());
        if (doctor.polyclinicSchedule.some(s => s.weekday === nextWeekday)) {
          errors.push({
            type: getSeverity(activeRules, 'no_polyclinic_prev_day'),
            message: VALIDATION_MESSAGES.POLYCLINIC_NEXT_DAY(doctor.name, entry.day),
            day: entry.day,
            doctorId,
          });
        }
      }
    }
  }

  // Per-doctor checks
  for (const doctor of doctors) {
    const days = doctorDays[doctor.id] || [];
    const sortedDays = days.map(d => d.day).sort((a, b) => a - b);

    // min_rest_days
    if (isEnabled(activeRules, 'min_rest_days')) {
      for (let i = 1; i < sortedDays.length; i++) {
        if (sortedDays[i] - sortedDays[i - 1] < minRestDays) {
          errors.push({
            type: getSeverity(activeRules, 'min_rest_days'),
            message: VALIDATION_MESSAGES.CONSECUTIVE_SHIFTS(doctor.name, sortedDays[i - 1], sortedDays[i]),
            doctorId: doctor.id,
          });
        }
      }
    }

    const docStats = statsMap.get(doctor.id);
    if (!docStats) continue;

    // max_weekly_hours
    if (isEnabled(activeRules, 'max_weekly_hours')) {
      for (const [weekStr, hours] of Object.entries(docStats.weeklyHours)) {
        if (hours > maxWeeklyHours) {
          errors.push({
            type: getSeverity(activeRules, 'max_weekly_hours'),
            message: VALIDATION_MESSAGES.WEEKLY_HOURS_EXCEEDED(doctor.name, Number(weekStr), hours),
            doctorId: doctor.id,
          });
        }
      }
    }

    // respect_monthly_limits
    if (isEnabled(activeRules, 'respect_monthly_limits')) {
      const sev = getSeverity(activeRules, 'respect_monthly_limits');
      if (doctor.maxRepublicPerMonth !== null && docStats.republicCount > doctor.maxRepublicPerMonth) {
        errors.push({
          type: sev,
          message: VALIDATION_MESSAGES.REPUBLIC_LIMIT(doctor.name, docStats.republicCount, doctor.maxRepublicPerMonth),
          doctorId: doctor.id,
        });
      }
      if (doctor.maxDepartmentPerMonth !== null && docStats.departmentCount > doctor.maxDepartmentPerMonth) {
        errors.push({
          type: sev,
          message: VALIDATION_MESSAGES.DEPARTMENT_LIMIT(doctor.name, docStats.departmentCount, doctor.maxDepartmentPerMonth),
          doctorId: doctor.id,
        });
      }
      if (doctor.maxTotalPerMonth !== null && docStats.totalCount > doctor.maxTotalPerMonth) {
        errors.push({
          type: sev,
          message: VALIDATION_MESSAGES.TOTAL_LIMIT(doctor.name, docStats.totalCount, doctor.maxTotalPerMonth),
          doctorId: doctor.id,
        });
      }
    }

    // max_weekend_shifts (custom rule type)
    const weekendRule = activeRules.find(r => r.type === 'max_weekend_shifts' && r.enabled);
    if (weekendRule && docStats.weekendCount > ((weekendRule.params.maxShifts as number) ?? 4)) {
      errors.push({
        type: weekendRule.severity,
        message: `${doctor.name}: ${docStats.weekendCount} savaitgaliniai budėjimai viršija limitą (max ${weekendRule.params.maxShifts})`,
        doctorId: doctor.id,
      });
    }
  }

  // balance_distribution
  if (isEnabled(activeRules, 'balance_distribution')) {
    const activeDoctors = stats.filter(s => s.totalCount > 0);
    const totalShifts = activeDoctors.reduce((sum, s) => sum + s.totalCount, 0);
    const average = activeDoctors.length > 0 ? totalShifts / activeDoctors.length : 0;
    for (const docStats of activeDoctors) {
      if (Math.abs(docStats.totalCount - average) > balanceThreshold) {
        errors.push({
          type: getSeverity(activeRules, 'balance_distribution'),
          message: VALIDATION_MESSAGES.UNBALANCED(docStats.name, docStats.totalCount, average),
          doctorId: docStats.doctorId,
        });
      }
    }
  }

  return errors;
}
