import { Doctor, MonthConfig, ScheduleEntry, ScheduleRule } from './types';
import { DEFAULT_SHIFT_DURATION, DEFAULT_MAX_WEEKLY_HOURS } from './constants';

// ===== Utility functions =====

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

function hasPolyclinic(doctor: Doctor, weekday: number): boolean {
  return doctor.polyclinicSchedule.some(s => s.weekday === weekday);
}

function isUnavailable(doctor: Doctor, dateStr: string): boolean {
  return doctor.unavailableDates.includes(dateStr);
}

function isRuleEnabled(rules: ScheduleRule[], type: string): boolean {
  const rule = rules.find(r => r.type === type);
  return rule ? rule.enabled : true;
}

function getRuleParam(rules: ScheduleRule[], type: string, param: string, defaultVal: number): number {
  const rule = rules.find(r => r.type === type);
  if (!rule || !rule.enabled) return defaultVal;
  return (rule.params[param] as number) ?? defaultVal;
}

// ===== Day metadata =====

interface DayInfo {
  day: number;
  date: Date;
  dateStr: string;
  weekday: number;
  isWeekend: boolean;
  isHoliday: boolean;
  weekNum: number;
  nextWeekday: number;
}

function buildDayInfos(year: number, month: number, holidays: number[]): DayInfo[] {
  const daysInMonth = new Date(year, month, 0).getDate();
  const infos: DayInfo[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    const jsDay = date.getDay();
    const weekday = jsToWeekday(jsDay);
    const nextDate = new Date(year, month - 1, day + 1);
    infos.push({
      day,
      date,
      dateStr: date.toISOString().split('T')[0],
      weekday,
      isWeekend: weekday >= 5,
      isHoliday: holidays.includes(day),
      weekNum: getISOWeek(date),
      nextWeekday: jsToWeekday(nextDate.getDay()),
    });
  }
  return infos;
}

// ===== Variable naming =====
// x_d_t_s: doctor index d, day index t, slot s (0=republic, 1=department)
function varName(d: number, t: number, s: number): string {
  return `x_${d}_${t}_${s}`;
}

// ===== ILP Scheduler (HiGHS) =====

async function generateScheduleILP(
  doctors: Doctor[],
  config: MonthConfig,
  rules: ScheduleRule[],
): Promise<ScheduleEntry[] | null> {
  // Dynamic import — HiGHS is WASM and must be loaded async
  let highs;
  try {
    const highsLoader = (await import('highs')).default;
    if (typeof window === 'undefined') {
      // Server-side (API route): load WASM directly from node_modules
      const nodePath = await import('path');
      highs = await highsLoader({
        locateFile: (file: string) =>
          nodePath.join(process.cwd(), 'node_modules', 'highs', 'build', file),
      });
    } else {
      // Client-side: load WASM from /public/wasm/
      highs = await highsLoader({
        locateFile: (file: string) => `/wasm/${file}`,
      });
    }
  } catch {
    console.warn('HiGHS not available, falling back to greedy');
    return null;
  }
  const { year, month, holidays } = config;
  const shiftDuration = config.shiftDurationHours || DEFAULT_SHIFT_DURATION;
  const maxWeeklyHours = getRuleParam(rules, 'max_weekly_hours', 'hours', config.maxWeeklyHours || DEFAULT_MAX_WEEKLY_HOURS);
  const minRestDays = getRuleParam(rules, 'min_rest_days', 'days', 2);

  const checkWeeklyHours = isRuleEnabled(rules, 'max_weekly_hours');
  const checkRestDays = isRuleEnabled(rules, 'min_rest_days');
  const checkPolySameDay = isRuleEnabled(rules, 'no_polyclinic_same_day');
  const checkPolyPrevDay = isRuleEnabled(rules, 'no_polyclinic_prev_day');
  const checkUnavailable = isRuleEnabled(rules, 'respect_unavailable');
  const checkSlotTypes = isRuleEnabled(rules, 'respect_slot_types');
  const checkMonthlyLimits = isRuleEnabled(rules, 'respect_monthly_limits');

  const days = buildDayInfos(year, month, holidays);
  const D = doctors.length;
  const T = days.length;
  const SLOTS = 2; // 0=republic, 1=department

  // Pre-compute which (d, t, s) are feasible (hard zero)
  const feasible: boolean[][][] = [];
  for (let d = 0; d < D; d++) {
    feasible[d] = [];
    const doc = doctors[d];
    for (let t = 0; t < T; t++) {
      feasible[d][t] = [false, false];
      const info = days[t];

      for (let s = 0; s < SLOTS; s++) {
        let ok = true;

        // Slot type restrictions
        if (checkSlotTypes) {
          if (s === 0 && !doc.canRepublic) ok = false;
          if (s === 1 && !doc.canDepartment) ok = false;
        }

        // Allowed weekdays restriction (pvz. TamašauskasA tik ketvirtadieniais)
        if (doc.allowedWeekdays && !doc.allowedWeekdays.includes(info.weekday)) ok = false;

        // Unavailable dates
        if (checkUnavailable && isUnavailable(doc, info.dateStr)) ok = false;

        // Polyclinic same day
        if (checkPolySameDay && hasPolyclinic(doc, info.weekday)) ok = false;

        // Polyclinic next day (shift goes until 8am next day)
        if (checkPolyPrevDay && t < T - 1 && hasPolyclinic(doc, info.nextWeekday)) ok = false;

        feasible[d][t][s] = ok;
      }
    }
  }

  // Build list of active binary variables
  const activeVars: string[] = [];
  const varSet = new Set<string>();
  for (let d = 0; d < D; d++) {
    for (let t = 0; t < T; t++) {
      for (let s = 0; s < SLOTS; s++) {
        if (feasible[d][t][s]) {
          const v = varName(d, t, s);
          activeVars.push(v);
          varSet.add(v);
        }
      }
    }
  }

  // ===== Build LP string =====
  const constraintLines: string[] = [];
  let cIdx = 0;

  // --- HARD CONSTRAINTS ---

  // 1. Exactly 1 doctor per (day, slot)
  for (let t = 0; t < T; t++) {
    for (let s = 0; s < SLOTS; s++) {
      const terms: string[] = [];
      for (let d = 0; d < D; d++) {
        if (feasible[d][t][s]) terms.push(varName(d, t, s));
      }
      if (terms.length > 0) {
        constraintLines.push(`  c${cIdx++}: ${terms.join(' + ')} = 1`);
      } else {
        // No feasible doctor for this slot — ILP can't solve, fall back to greedy
        console.warn(`ILP: no feasible doctor for day ${t + 1}, slot ${s}. Falling back to greedy.`);
        return null;
      }
    }
  }

  // 2. Doctor can't be in both slots on the same day
  for (let d = 0; d < D; d++) {
    for (let t = 0; t < T; t++) {
      if (feasible[d][t][0] && feasible[d][t][1]) {
        constraintLines.push(`  c${cIdx++}: ${varName(d, t, 0)} + ${varName(d, t, 1)} <= 1`);
      }
    }
  }

  // 3. Min rest days between shifts
  if (checkRestDays && minRestDays > 1) {
    for (let d = 0; d < D; d++) {
      for (let t = 0; t < T; t++) {
        // For each pair of days within rest window
        for (let gap = 1; gap < minRestDays; gap++) {
          const t2 = t + gap;
          if (t2 >= T) continue;
          // Sum of all slots on day t + all slots on day t2 <= 1
          const terms: string[] = [];
          for (let s = 0; s < SLOTS; s++) {
            if (feasible[d][t][s]) terms.push(varName(d, t, s));
            if (feasible[d][t2][s]) terms.push(varName(d, t2, s));
          }
          if (terms.length >= 2) {
            constraintLines.push(`  c${cIdx++}: ${terms.join(' + ')} <= 1`);
          }
        }
      }
    }
  }

  // 4. Weekly hours limit
  if (checkWeeklyHours) {
    // Group days by week number
    const weekDays: Record<number, number[]> = {};
    for (let t = 0; t < T; t++) {
      const w = days[t].weekNum;
      if (!weekDays[w]) weekDays[w] = [];
      weekDays[w].push(t);
    }

    const maxShiftsPerWeek = Math.floor(maxWeeklyHours / shiftDuration);
    for (let d = 0; d < D; d++) {
      for (const [, dayIndices] of Object.entries(weekDays)) {
        const terms: string[] = [];
        for (const t of dayIndices) {
          for (let s = 0; s < SLOTS; s++) {
            if (feasible[d][t][s]) terms.push(varName(d, t, s));
          }
        }
        if (terms.length > maxShiftsPerWeek) {
          constraintLines.push(`  c${cIdx++}: ${terms.join(' + ')} <= ${maxShiftsPerWeek}`);
        }
      }
    }
  }

  // 5. Monthly limits per doctor
  if (checkMonthlyLimits) {
    for (let d = 0; d < D; d++) {
      const doc = doctors[d];

      // Republic limit
      if (doc.maxRepublicPerMonth !== null) {
        const terms: string[] = [];
        for (let t = 0; t < T; t++) {
          if (feasible[d][t][0]) terms.push(varName(d, t, 0));
        }
        if (terms.length > doc.maxRepublicPerMonth) {
          constraintLines.push(`  c${cIdx++}: ${terms.join(' + ')} <= ${doc.maxRepublicPerMonth}`);
        }
      }

      // Department limit
      if (doc.maxDepartmentPerMonth !== null) {
        const terms: string[] = [];
        for (let t = 0; t < T; t++) {
          if (feasible[d][t][1]) terms.push(varName(d, t, 1));
        }
        if (terms.length > doc.maxDepartmentPerMonth) {
          constraintLines.push(`  c${cIdx++}: ${terms.join(' + ')} <= ${doc.maxDepartmentPerMonth}`);
        }
      }

      // Total limit
      if (doc.maxTotalPerMonth !== null) {
        const terms: string[] = [];
        for (let t = 0; t < T; t++) {
          for (let s = 0; s < SLOTS; s++) {
            if (feasible[d][t][s]) terms.push(varName(d, t, s));
          }
        }
        if (terms.length > doc.maxTotalPerMonth) {
          constraintLines.push(`  c${cIdx++}: ${terms.join(' + ')} <= ${doc.maxTotalPerMonth}`);
        }
      }
    }
  }

  // 6. Max weekend shifts (custom rule)
  const maxWeekendRule = rules.find(r => r.type === 'max_weekend_shifts' && r.enabled);
  if (maxWeekendRule) {
    const maxWE = (maxWeekendRule.params.maxShifts as number) || 4;
    for (let d = 0; d < D; d++) {
      const terms: string[] = [];
      for (let t = 0; t < T; t++) {
        if (days[t].isWeekend || days[t].isHoliday) {
          for (let s = 0; s < SLOTS; s++) {
            if (feasible[d][t][s]) terms.push(varName(d, t, s));
          }
        }
      }
      if (terms.length > maxWE) {
        constraintLines.push(`  c${cIdx++}: ${terms.join(' + ')} <= ${maxWE}`);
      }
    }
  }

  // ===== OBJECTIVE: minimize unfairness =====
  // Minimax + maximin approach:
  //   M  >= total_d for each d  (minimize max load)
  //   m  <= total_d for each d  (maximize min load)
  //   Mw >= weekend_total_d     (minimize max weekend shifts)
  //   Mf >= friday_total_d      (minimize max Friday shifts)
  //   Mrd >= |R_d - D_d| for dual-eligible doctors (balance R/D)

  // Filter to only non-resident doctors for objective balancing
  const nonResidentIndices: number[] = [];
  for (let d = 0; d < D; d++) {
    if (doctors[d].role !== 'resident') nonResidentIndices.push(d);
  }

  // Minimax constraints: M >= total_d for each non-resident doctor
  for (const d of nonResidentIndices) {
    const terms: string[] = [];
    for (let t = 0; t < T; t++) {
      for (let s = 0; s < SLOTS; s++) {
        if (feasible[d][t][s]) terms.push(varName(d, t, s));
      }
    }
    if (terms.length > 0) {
      constraintLines.push(`  c${cIdx++}: M - ${terms.join(' - ')} >= 0`);
    }
  }

  // Maximin constraints: m <= total_d for each non-resident doctor
  for (const d of nonResidentIndices) {
    const terms: string[] = [];
    for (let t = 0; t < T; t++) {
      for (let s = 0; s < SLOTS; s++) {
        if (feasible[d][t][s]) terms.push(varName(d, t, s));
      }
    }
    if (terms.length > 0) {
      constraintLines.push(`  c${cIdx++}: m - ${terms.join(' - ')} <= 0`);
    }
  }

  // Weekend fairness: Mw >= weekend_total_d for each non-resident
  const weekendDayIndices = days.map((info, t) => (info.isWeekend || info.isHoliday) ? t : -1).filter(t => t >= 0);
  if (weekendDayIndices.length > 0) {
    for (const d of nonResidentIndices) {
      const terms: string[] = [];
      for (const t of weekendDayIndices) {
        for (let s = 0; s < SLOTS; s++) {
          if (feasible[d][t][s]) terms.push(varName(d, t, s));
        }
      }
      if (terms.length > 0) {
        constraintLines.push(`  c${cIdx++}: Mw - ${terms.join(' - ')} >= 0`);
      }
    }
  }

  // Friday fairness: Mf >= friday_total_d for each non-resident
  const fridayDayIndices = days.map((info, t) => info.weekday === 4 ? t : -1).filter(t => t >= 0);
  if (fridayDayIndices.length > 0) {
    for (const d of nonResidentIndices) {
      const terms: string[] = [];
      for (const t of fridayDayIndices) {
        for (let s = 0; s < SLOTS; s++) {
          if (feasible[d][t][s]) terms.push(varName(d, t, s));
        }
      }
      if (terms.length > 0) {
        constraintLines.push(`  c${cIdx++}: Mf - ${terms.join(' - ')} >= 0`);
      }
    }
  }

  // R/D balance for dual-eligible doctors: Mrd >= |R_count - D_count|
  const dualEligible = nonResidentIndices.filter(d => doctors[d].canRepublic && doctors[d].canDepartment);
  for (const d of dualEligible) {
    const rTerms: string[] = [];
    const dTerms: string[] = [];
    for (let t = 0; t < T; t++) {
      if (feasible[d][t][0]) rTerms.push(varName(d, t, 0));
      if (feasible[d][t][1]) dTerms.push(varName(d, t, 1));
    }
    if (rTerms.length > 0 && dTerms.length > 0) {
      // Mrd >= R - D and Mrd >= D - R (absolute value linearization)
      constraintLines.push(`  c${cIdx++}: Mrd - ${rTerms.join(' - ')} + ${dTerms.join(' + ')} >= 0`);
      constraintLines.push(`  c${cIdx++}: Mrd + ${rTerms.join(' + ')} - ${dTerms.join(' - ')} >= 0`);
    }
  }

  // Objective: minimize M (max load) - m (min load) + weekend/friday/RD balance
  const objTerms: string[] = ['100 M', '-80 m', '50 Mw', '40 Mf', '30 Mrd'];

  // Dept-only priority: slight bonus for dept-only doctors in dept slot (lower cost)
  // and slight penalty for universal doctors in dept slot (encourage them to take R)
  if (isRuleEnabled(rules, 'dept_only_priority')) {
    for (let d = 0; d < D; d++) {
      const doc = doctors[d];
      for (let t = 0; t < T; t++) {
        if (feasible[d][t][1]) { // department slot
          if (!doc.canRepublic) {
            // dept-only doctor in dept slot — small bonus (negative cost)
            objTerms.push(`-0.1 ${varName(d, t, 1)}`);
          } else {
            // universal doctor in dept slot — tiny penalty
            objTerms.push(`0.05 ${varName(d, t, 1)}`);
          }
        }
      }
    }
  }

  // Build LP problem string
  const lpProblem = [
    'Minimize',
    `  obj: ${objTerms.join(' + ').replace(/\+ -/g, '- ')}`,
    '',
    'Subject To',
    ...constraintLines,
    '',
    'Bounds',
    `  0 <= M <= ${T * SLOTS}`,
    `  0 <= m <= ${T * SLOTS}`,
    `  0 <= Mw <= ${T * SLOTS}`,
    `  0 <= Mf <= ${T * SLOTS}`,
    `  0 <= Mrd <= ${T * SLOTS}`,
    '',
    'Binary',
    `  ${activeVars.join(' ')}`,
    '',
    'End',
  ].join('\n');

  // Solve
  try {
    const solution = highs.solve(lpProblem, {
      time_limit: 45,
      mip_rel_gap: 0.02,
      // Note: do NOT set output_flag: false — HiGHS 1.8.0 bug causes
      // "Unable to parse solution" when output is suppressed for MIP problems
    });

    if (solution.Status !== 'Optimal') {
      console.warn(`ILP solver status: ${solution.Status}, falling back to greedy`);
      return null;
    }

    // Extract solution
    const schedule: ScheduleEntry[] = [];
    for (let t = 0; t < T; t++) {
      const info = days[t];
      let republicId: string | null = null;
      let departmentId: string | null = null;

      for (let d = 0; d < D; d++) {
        if (feasible[d][t][0]) {
          const v = varName(d, t, 0);
          const val = solution.Columns[v]?.Primal ?? 0;
          if (val > 0.5) republicId = doctors[d].id;
        }
        if (feasible[d][t][1]) {
          const v = varName(d, t, 1);
          const val = solution.Columns[v]?.Primal ?? 0;
          if (val > 0.5) departmentId = doctors[d].id;
        }
      }

      schedule.push({
        day: info.day,
        date: info.dateStr,
        weekday: info.weekday,
        isWeekend: info.isWeekend,
        isHoliday: info.isHoliday,
        clinicDoctor: null,
        republicDoctor: republicId,
        departmentDoctor: departmentId,
        residentDoctor: null,
      });
    }

    return schedule;
  } catch (err) {
    console.error('ILP solver error:', err);
    return null;
  }
}

// ===== Greedy Scheduler (fallback) =====

function generateScheduleGreedy(
  doctors: Doctor[],
  config: MonthConfig,
  rules: ScheduleRule[],
): ScheduleEntry[] {
  const { year, month, holidays } = config;
  const shiftDuration = config.shiftDurationHours || DEFAULT_SHIFT_DURATION;
  const maxWeeklyHours = getRuleParam(rules, 'max_weekly_hours', 'hours', config.maxWeeklyHours || DEFAULT_MAX_WEEKLY_HOURS);
  const minRestDays = getRuleParam(rules, 'min_rest_days', 'days', 2);

  const checkWeeklyHours = isRuleEnabled(rules, 'max_weekly_hours');
  const checkRestDays = isRuleEnabled(rules, 'min_rest_days');
  const checkPolySameDay = isRuleEnabled(rules, 'no_polyclinic_same_day');
  const checkPolyPrevDay = isRuleEnabled(rules, 'no_polyclinic_prev_day');
  const checkUnavailable = isRuleEnabled(rules, 'respect_unavailable');
  const checkSlotTypes = isRuleEnabled(rules, 'respect_slot_types');
  const checkMonthlyLimits = isRuleEnabled(rules, 'respect_monthly_limits');
  const deptOnlyPriority = isRuleEnabled(rules, 'dept_only_priority');

  const days = buildDayInfos(year, month, holidays);
  const daysInMonth = days.length;
  const schedule: ScheduleEntry[] = [];

  interface DoctorState {
    assignedDays: number[];
    republicCount: number;
    departmentCount: number;
    totalCount: number;
    weekendCount: number;
    weeklyHours: Record<number, number>;
  }

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

  for (const info of days) {
    const { day, dateStr, weekday, isWeekend, isHoliday, weekNum, nextWeekday } = info;

    const isEligible = (doc: Doctor, slot: 'republic' | 'department', excludeId?: string): boolean => {
      if (excludeId && doc.id === excludeId) return false;
      if (checkSlotTypes) {
        if (slot === 'republic' && !doc.canRepublic) return false;
        if (slot === 'department' && !doc.canDepartment) return false;
      }
      // Allowed weekdays restriction (pvz. TamašauskasA tik ketvirtadieniais)
      if (doc.allowedWeekdays && !doc.allowedWeekdays.includes(weekday)) return false;
      if (checkUnavailable && isUnavailable(doc, dateStr)) return false;
      if (checkPolySameDay && hasPolyclinic(doc, weekday)) return false;
      if (checkPolyPrevDay && day < daysInMonth && hasPolyclinic(doc, nextWeekday)) return false;

      const st = states[doc.id];
      if (checkRestDays) {
        for (let gap = 1; gap < minRestDays; gap++) {
          if (st.assignedDays.includes(day - gap) || st.assignedDays.includes(day + gap)) return false;
        }
      }
      if (checkWeeklyHours) {
        const currentWeekHours = st.weeklyHours[weekNum] || 0;
        if (currentWeekHours + shiftDuration > maxWeeklyHours) return false;
      }
      if (checkMonthlyLimits) {
        if (slot === 'republic' && doc.maxRepublicPerMonth !== null && st.republicCount >= doc.maxRepublicPerMonth) return false;
        if (slot === 'department' && doc.maxDepartmentPerMonth !== null && st.departmentCount >= doc.maxDepartmentPerMonth) return false;
        if (doc.maxTotalPerMonth !== null && st.totalCount >= doc.maxTotalPerMonth) return false;
      }
      return true;
    };

    // Republic
    const eligibleR = doctors.filter(doc => isEligible(doc, 'republic'));
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

    // Department
    const eligibleD = doctors.filter(doc => isEligible(doc, 'department', chosenR?.id));
    eligibleD.sort((a, b) => {
      if (deptOnlyPriority) {
        if (!a.canRepublic && b.canRepublic) return -1;
        if (a.canRepublic && !b.canRepublic) return 1;
      }
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

    schedule.push({
      day,
      date: dateStr,
      weekday,
      isWeekend,
      isHoliday,
      clinicDoctor: null,
      republicDoctor: chosenR?.id || null,
      departmentDoctor: chosenD?.id || null,
      residentDoctor: null,
    });
  }

  return schedule;
}

// ===== Clinic Doctor Assignment (post-processing) =====
// Col1 (Skubiosios medicinos klinika 8-16) is a regular work day, not a budėjimas.
// It is distributed fairly across all doctors, independent of col2/col3.
// Preference: doctor already on duty today (col2 first, then col3), if they have the fewest clinic shifts.
// Constraint: doctor who just finished duty (was col2/col3 yesterday) cannot do clinic today.

// clinicHistory: Record<doctorId, count> — kiek kartų mama rankiniu būdu pasirinko šį gydytoją
// klinikos stulpeliui. Mokymosi mechanizmas: labiau pageidaujami gydytojai gauna "kreditą",
// kuris sumažina jų efektyvų klinikos kiekį ir padidina tikimybę būti parinktam.
function assignClinicDoctors(
  schedule: ScheduleEntry[],
  doctors: Doctor[],
  clinicHistory: Record<string, number> = {},
): ScheduleEntry[] {
  const clinicCounts: Record<string, number> = {};
  for (const doc of doctors) clinicCounts[doc.id] = 0;

  // Gydytojai, kurie nedirba klinikoje (Skubiosios medicinos klinika 8-16):
  // Visi R-only gydytojai (canRepublic && !canDepartment) nedalyvauja.
  // Šaltinis: mama — "nedirba šie gydytojai už šį postą:
  //   TamašauskasA, Deltuva, Vaitkevičius, Vilcinis, Urbonas, Matukevičius"
  const isClinicExcluded = (doc: Doctor): boolean =>
    doc.canRepublic && !doc.canDepartment;

  // Kiekvienai dienai sekame, kas baigė budėjimą tą rytą (= col2+col3 iš dienos X-1).
  // Gydytojas, ką tik baigęs 24h budėjimą, negali iš karto eiti į kliniką 8-16.
  const finishedDutyOn: Record<number, Set<string>> = {};
  for (const entry of schedule) {
    const nextDay = entry.day + 1;
    if (!finishedDutyOn[nextDay]) finishedDutyOn[nextDay] = new Set();
    if (entry.republicDoctor) finishedDutyOn[nextDay].add(entry.republicDoctor);
    if (entry.departmentDoctor) finishedDutyOn[nextDay].add(entry.departmentDoctor);
  }

  // Mokymosi svoris: kiek "kreditų" suteikia vienas mamos rankinis pasirinkimas.
  // 0.5 reiškia: mama 2x pasirinkusi gydytoją X → jo efektyvus kiekis sumažėja 1 vienetu.
  const LEARN_WEIGHT = 0.5;

  return schedule.map(entry => {
    const isWorkday = !entry.isWeekend && !entry.isHoliday;
    if (!isWorkday) return { ...entry, clinicDoctor: null };

    const justFinished = finishedDutyOn[entry.day] || new Set<string>();

    const eligible = doctors.filter(doc => {
      // Rezidentai nekrypta klinikoje
      if (doc.role === 'resident') return false;
      // Tos dienos budintys gydytojai (col2/col3) negali būti klinikoje tą pačią dieną
      if (doc.id === entry.republicDoctor || doc.id === entry.departmentDoctor) return false;
      // Riboti konsultantai (R-only, max≤3) nedalyvauja klinikos rotacijoje
      if (isClinicExcluded(doc)) return false;
      // Ką tik baigė budėjimą — negali iš karto į kliniką
      if (justFinished.has(doc.id)) return false;
      // Nedarbingas
      if (doc.unavailableDates.includes(entry.date)) return false;
      // Poliklinika tą dieną
      if (doc.polyclinicSchedule.some(s => s.weekday === entry.weekday)) return false;
      // allowedWeekdays apribojimas (taikomas ir klinikai)
      if (doc.allowedWeekdays && !doc.allowedWeekdays.includes(entry.weekday)) return false;
      return true;
    });

    if (eligible.length === 0) {
      // Atsarginis variantas — respublikos gydytojas
      return { ...entry, clinicDoctor: entry.republicDoctor };
    }

    eligible.sort((a, b) => {
      // Efektyvus kiekis = faktinis klinikos kiekis − mamos pageidavimų kreditas
      const ea = clinicCounts[a.id] - (clinicHistory[a.id] || 0) * LEARN_WEIGHT;
      const eb = clinicCounts[b.id] - (clinicHistory[b.id] || 0) * LEARN_WEIGHT;
      if (Math.abs(ea - eb) > 0.01) return ea - eb;
      return 0;
    });

    const chosen = eligible[0];
    clinicCounts[chosen.id]++;
    return { ...entry, clinicDoctor: chosen.id };
  });
}

// ===== Resident Doctor Assignment (post-processing) =====
// Rezidentai budi darbo dienomis 16-8 (16 val.), savaitgaliais/šventėmis 8-8 (24 val.)
// Kiekvienai dienai priskiriamas vienas rezidentas, tolygiai paskirstant.

function assignResidentDoctors(
  schedule: ScheduleEntry[],
  doctors: Doctor[],
): ScheduleEntry[] {
  const residents = doctors.filter(d => d.role === 'resident');
  if (residents.length === 0) return schedule;

  const resCounts: Record<string, number> = {};
  const resWeekendCounts: Record<string, number> = {};
  const resAssignedDays: Record<string, number[]> = {};

  for (const r of residents) {
    resCounts[r.id] = 0;
    resWeekendCounts[r.id] = 0;
    resAssignedDays[r.id] = [];
  }

  return schedule.map(entry => {
    const eligible = residents.filter(r => {
      // Negalimos dienos
      if (r.unavailableDates.includes(entry.date)) return false;
      // Min 2 poilsio dienos tarp budėjimų
      const lastDays = resAssignedDays[r.id];
      for (let gap = 1; gap < 2; gap++) {
        if (lastDays.includes(entry.day - gap)) return false;
      }
      return true;
    });

    if (eligible.length === 0) return { ...entry, residentDoctor: null };

    const isWE = entry.isWeekend || entry.isHoliday;
    const isFri = entry.weekday === 4;

    eligible.sort((a, b) => {
      // Pirmiausia: tolygus bendras kiekis
      if (resCounts[a.id] !== resCounts[b.id]) return resCounts[a.id] - resCounts[b.id];
      // Savaitgaliais: tolygiai savaitgalius
      if (isWE && resWeekendCounts[a.id] !== resWeekendCounts[b.id])
        return resWeekendCounts[a.id] - resWeekendCounts[b.id];
      return 0;
    });

    const chosen = eligible[0];
    resCounts[chosen.id]++;
    resAssignedDays[chosen.id].push(entry.day);
    if (isWE || isFri) resWeekendCounts[chosen.id]++;

    return { ...entry, residentDoctor: chosen.id };
  });
}

// ===== Public API =====

/**
 * Generate optimal schedule using ILP (HiGHS) solver.
 * Falls back to greedy algorithm if ILP is unavailable or fails.
 */
export function generateSchedule(
  doctors: Doctor[],
  config: MonthConfig,
  rules?: ScheduleRule[],
  clinicHistory?: Record<string, number>,
): ScheduleEntry[] {
  // Synchronous wrapper — greedy only (ILP requires async).
  const raw = generateScheduleGreedy(doctors, config, rules || []);
  const withClinic = assignClinicDoctors(raw, doctors, clinicHistory || {});
  return assignResidentDoctors(withClinic, doctors);
}

/**
 * Async version — uses ILP solver for optimal results.
 * Falls back to greedy if ILP unavailable or infeasible.
 */
export async function generateScheduleAsync(
  doctors: Doctor[],
  config: MonthConfig,
  rules?: ScheduleRule[],
  // clinicHistory: kiek kartų mama rankiniu būdu pasirinko kiekvieną gydytoją klinikos stulpeliui.
  // Naudojama mokymosi mechanizme — labiau pageidaujami gydytojai gauna prioritetą.
  clinicHistory?: Record<string, number>,
): Promise<ScheduleEntry[]> {
  const activeRules = rules || [];

  const ilpResult = await generateScheduleILP(doctors, config, activeRules);
  const raw = ilpResult ?? generateScheduleGreedy(doctors, config, activeRules);

  const withClinic = assignClinicDoctors(raw, doctors, clinicHistory || {});
  return assignResidentDoctors(withClinic, doctors);
}
