import { Doctor, MonthConfig, ScheduleEntry } from './types';
import { DEFAULT_SHIFT_DURATION, DEFAULT_MAX_WEEKLY_HOURS } from './constants';

/** Get ISO week number for a date */
function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/** Convert JS Date.getDay() (0=Sun) to our weekday (0=Mon) */
function jsToWeekday(jsDay: number): number {
  return jsDay === 0 ? 6 : jsDay - 1;
}

/** Check if a doctor has polyclinic on a given weekday */
function hasPolyclinic(doctor: Doctor, weekday: number): boolean {
  return doctor.polyclinicSchedule.some(s => s.weekday === weekday);
}

/** Check if date string is in unavailable dates */
function isUnavailable(doctor: Doctor, dateStr: string): boolean {
  return doctor.unavailableDates.includes(dateStr);
}

interface DoctorState {
  assignedDays: number[]; // day numbers where this doctor has any shift
  republicCount: number;
  departmentCount: number;
  totalCount: number;
  weekendCount: number;
  weeklyHours: Record<number, number>; // weekNumber -> hours
}

export function generateSchedule(
  doctors: Doctor[],
  config: MonthConfig
): ScheduleEntry[] {
  const { year, month, holidays } = config;
  const maxWeeklyHours = config.maxWeeklyHours || DEFAULT_MAX_WEEKLY_HOURS;
  const shiftDuration = config.shiftDurationHours || DEFAULT_SHIFT_DURATION;

  const daysInMonth = new Date(year, month, 0).getDate();
  const schedule: ScheduleEntry[] = [];

  // Initialize doctor states
  const states: Record<string, DoctorState> = {};
  for (const doc of doctors) {
    states[doc.id] = {
      assignedDays: [],
      republicCount: 0,
      departmentCount: 0,
      totalCount: 0,
      weekendCount: 0,
      weeklyHours: {},
    };
  }

  // Build schedule day by day
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    const jsDay = date.getDay();
    const weekday = jsToWeekday(jsDay);
    const isWeekend = weekday >= 5;
    const isHoliday = holidays.includes(day);
    const dateStr = date.toISOString().split('T')[0];
    const weekNum = getISOWeek(date);

    // Next day info (for polyclinic conflict check)
    const nextDate = new Date(year, month - 1, day + 1);
    const nextWeekday = jsToWeekday(nextDate.getDay());
    const nextDateStr = nextDate.toISOString().split('T')[0];

    // ===== COLUMN C: REPUBLIC =====
    const eligibleR = doctors.filter(doc => {
      if (!doc.canRepublic) return false;
      if (isUnavailable(doc, dateStr)) return false;
      if (hasPolyclinic(doc, weekday)) return false;
      // Next day polyclinic conflict (shift ends 8am, polyclinic starts same morning)
      if (day < daysInMonth && hasPolyclinic(doc, nextWeekday) && !isUnavailable(doc, nextDateStr)) return false;
      // Rest: no shift on day-1 or day+1 (min 2 day gap)
      const st = states[doc.id];
      if (st.assignedDays.includes(day - 1) || st.assignedDays.includes(day + 1)) return false;
      // Weekly hours
      const currentWeekHours = st.weeklyHours[weekNum] || 0;
      if (currentWeekHours + shiftDuration > maxWeeklyHours) return false;
      // Republic monthly limit
      if (doc.maxRepublicPerMonth !== null && st.republicCount >= doc.maxRepublicPerMonth) return false;
      // Total monthly limit
      if (doc.maxTotalPerMonth !== null && st.totalCount >= doc.maxTotalPerMonth) return false;
      return true;
    });

    // Sort: least total shifts first, then least republic, then random
    eligibleR.sort((a, b) => {
      const sa = states[a.id], sb = states[b.id];
      if (sa.totalCount !== sb.totalCount) return sa.totalCount - sb.totalCount;
      if (sa.republicCount !== sb.republicCount) return sa.republicCount - sb.republicCount;
      if (sa.weekendCount !== sb.weekendCount && isWeekend) return sa.weekendCount - sb.weekendCount;
      return Math.random() - 0.5;
    });

    const chosenR = eligibleR[0] || null;

    if (chosenR) {
      const st = states[chosenR.id];
      st.assignedDays.push(day);
      st.republicCount++;
      st.totalCount++;
      st.weeklyHours[weekNum] = (st.weeklyHours[weekNum] || 0) + shiftDuration;
      if (isWeekend || isHoliday) st.weekendCount++;
    }

    // ===== COLUMN D: DEPARTMENT =====
    const eligibleD = doctors.filter(doc => {
      if (!doc.canDepartment) return false;
      if (chosenR && doc.id === chosenR.id) return false; // can't be same as republic
      if (isUnavailable(doc, dateStr)) return false;
      if (hasPolyclinic(doc, weekday)) return false;
      if (day < daysInMonth && hasPolyclinic(doc, nextWeekday) && !isUnavailable(doc, nextDateStr)) return false;
      const st = states[doc.id];
      if (st.assignedDays.includes(day - 1) || st.assignedDays.includes(day + 1)) return false;
      const currentWeekHours = st.weeklyHours[weekNum] || 0;
      if (currentWeekHours + shiftDuration > maxWeeklyHours) return false;
      if (doc.maxDepartmentPerMonth !== null && st.departmentCount >= doc.maxDepartmentPerMonth) return false;
      if (doc.maxTotalPerMonth !== null && st.totalCount >= doc.maxTotalPerMonth) return false;
      return true;
    });

    // Sort: prioritize department-only doctors, then least total, then random
    eligibleD.sort((a, b) => {
      // Department-only doctors first (canRepublic=false)
      if (!a.canRepublic && b.canRepublic) return -1;
      if (a.canRepublic && !b.canRepublic) return 1;
      const sa = states[a.id], sb = states[b.id];
      if (sa.totalCount !== sb.totalCount) return sa.totalCount - sb.totalCount;
      if (sa.departmentCount !== sb.departmentCount) return sa.departmentCount - sb.departmentCount;
      if (sa.weekendCount !== sb.weekendCount && isWeekend) return sa.weekendCount - sb.weekendCount;
      return Math.random() - 0.5;
    });

    const chosenD = eligibleD[0] || null;

    if (chosenD) {
      const st = states[chosenD.id];
      st.assignedDays.push(day);
      st.departmentCount++;
      st.totalCount++;
      st.weeklyHours[weekNum] = (st.weeklyHours[weekNum] || 0) + shiftDuration;
      if (isWeekend || isHoliday) st.weekendCount++;
    }

    // ===== COLUMN B: CLINIC (workdays only, same as republic) =====
    const isWorkday = !isWeekend && !isHoliday;
    const clinicDoctor = isWorkday && chosenR ? chosenR.id : null;

    schedule.push({
      day,
      date: dateStr,
      weekday,
      isWeekend,
      isHoliday,
      clinicDoctor,
      republicDoctor: chosenR?.id || null,
      departmentDoctor: chosenD?.id || null,
      residentDoctor: null,
    });
  }

  return schedule;
}
