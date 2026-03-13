import { Doctor, MonthConfig, ScheduleEntry, ValidationError, DoctorStats } from './types';
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

/** Validate the full schedule against all rules */
export function validateSchedule(
  schedule: ScheduleEntry[],
  doctors: Doctor[],
  config: MonthConfig
): ValidationError[] {
  const errors: ValidationError[] = [];
  const maxWeeklyHours = config.maxWeeklyHours || DEFAULT_MAX_WEEKLY_HOURS;
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

  for (const entry of schedule) {
    // 1.6 Every day must have republic and department
    if (!entry.republicDoctor) {
      errors.push({
        type: 'error',
        message: VALIDATION_MESSAGES.SLOT_EMPTY(entry.day, 'Respublika'),
        day: entry.day,
      });
    }
    if (!entry.departmentDoctor) {
      errors.push({
        type: 'error',
        message: VALIDATION_MESSAGES.SLOT_EMPTY(entry.day, 'Skyrius'),
        day: entry.day,
      });
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

      // 1.4 Unavailable dates
      if (doctor.unavailableDates.includes(entry.date)) {
        errors.push({
          type: 'error',
          message: VALIDATION_MESSAGES.UNAVAILABLE(doctor.name, entry.day),
          day: entry.day,
          doctorId,
        });
      }

      // 1.5 Category restrictions
      if (slot === 'respublika' && !doctor.canRepublic) {
        errors.push({
          type: 'error',
          message: VALIDATION_MESSAGES.CANNOT_REPUBLIC(doctor.name),
          day: entry.day,
          doctorId,
        });
      }
      if (slot === 'skyrius' && !doctor.canDepartment) {
        errors.push({
          type: 'error',
          message: VALIDATION_MESSAGES.CANNOT_DEPARTMENT(doctor.name),
          day: entry.day,
          doctorId,
        });
      }

      // 1.3 Polyclinic conflict
      const weekday = entry.weekday;
      if (doctor.polyclinicSchedule.some(s => s.weekday === weekday)) {
        errors.push({
          type: 'error',
          message: VALIDATION_MESSAGES.POLYCLINIC_CONFLICT(doctor.name, entry.day),
          day: entry.day,
          doctorId,
        });
      }

      // 1.3 Next day polyclinic conflict
      if (entry.day < schedule.length) {
        const nextDate = new Date(config.year, config.month - 1, entry.day + 1);
        const nextWeekday = jsToWeekday(nextDate.getDay());
        if (doctor.polyclinicSchedule.some(s => s.weekday === nextWeekday)) {
          errors.push({
            type: 'error',
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

    // 1.2 Rest between shifts (min 2 calendar days gap)
    for (let i = 1; i < sortedDays.length; i++) {
      if (sortedDays[i] - sortedDays[i - 1] < 2) {
        errors.push({
          type: 'error',
          message: VALIDATION_MESSAGES.CONSECUTIVE_SHIFTS(doctor.name, sortedDays[i - 1], sortedDays[i]),
          doctorId: doctor.id,
        });
      }
    }

    const docStats = statsMap.get(doctor.id);
    if (!docStats) continue;

    // 1.1 Weekly hours
    for (const [weekStr, hours] of Object.entries(docStats.weeklyHours)) {
      if (hours > maxWeeklyHours) {
        errors.push({
          type: 'error',
          message: VALIDATION_MESSAGES.WEEKLY_HOURS_EXCEEDED(doctor.name, Number(weekStr), hours),
          doctorId: doctor.id,
        });
      }
    }

    // 1.5 Monthly limits
    if (doctor.maxRepublicPerMonth !== null && docStats.republicCount > doctor.maxRepublicPerMonth) {
      errors.push({
        type: 'error',
        message: VALIDATION_MESSAGES.REPUBLIC_LIMIT(doctor.name, docStats.republicCount, doctor.maxRepublicPerMonth),
        doctorId: doctor.id,
      });
    }
    if (doctor.maxDepartmentPerMonth !== null && docStats.departmentCount > doctor.maxDepartmentPerMonth) {
      errors.push({
        type: 'error',
        message: VALIDATION_MESSAGES.DEPARTMENT_LIMIT(doctor.name, docStats.departmentCount, doctor.maxDepartmentPerMonth),
        doctorId: doctor.id,
      });
    }
    if (doctor.maxTotalPerMonth !== null && docStats.totalCount > doctor.maxTotalPerMonth) {
      errors.push({
        type: 'error',
        message: VALIDATION_MESSAGES.TOTAL_LIMIT(doctor.name, docStats.totalCount, doctor.maxTotalPerMonth),
        doctorId: doctor.id,
      });
    }
  }

  // 2.1 Balance check (soft)
  const activeDoctors = stats.filter(s => s.totalCount > 0 || doctors.find(d => d.id === s.doctorId));
  const totalShifts = stats.reduce((sum, s) => sum + s.totalCount, 0);
  const average = totalShifts / doctors.length;
  for (const docStats of activeDoctors) {
    if (Math.abs(docStats.totalCount - average) > 1.5) {
      errors.push({
        type: 'warning',
        message: VALIDATION_MESSAGES.UNBALANCED(docStats.name, docStats.totalCount, average),
        doctorId: docStats.doctorId,
      });
    }
  }

  return errors;
}
