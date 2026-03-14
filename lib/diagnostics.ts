import { Doctor, MonthConfig, ScheduleRule } from './types';

export interface DiagnosticIssue {
  severity: 'critical' | 'warning' | 'info';
  category: 'capacity' | 'balance' | 'config' | 'availability';
  title: string;
  description: string;
  suggestion?: string;
}

function jsToWeekday(jsDay: number): number {
  return jsDay === 0 ? 6 : jsDay - 1;
}

const WEEKDAY_SHORT = ['Pr', 'An', 'Tr', 'Kt', 'Pn', 'Šš', 'Sk'];

function getRuleParam(rules: ScheduleRule[], type: string, param: string, defaultVal: number): number {
  const rule = rules.find(r => r.type === type && r.enabled);
  if (!rule) return defaultVal;
  return (rule.params[param] as number) ?? defaultVal;
}

function isRuleEnabled(rules: ScheduleRule[], type: string): boolean {
  const rule = rules.find(r => r.type === type);
  return rule ? rule.enabled : true;
}

/**
 * Analyze doctor settings vs rules for conflicts and capacity issues.
 * Returns diagnostic issues sorted by severity.
 */
export function runDiagnostics(
  doctors: Doctor[],
  config: MonthConfig,
  rules: ScheduleRule[]
): DiagnosticIssue[] {
  const issues: DiagnosticIssue[] = [];

  const checkPolyPrevDay = isRuleEnabled(rules, 'no_polyclinic_prev_day');
  const checkPolySameDay = isRuleEnabled(rules, 'no_polyclinic_same_day');
  const shiftDuration = config.shiftDurationHours || 24;
  const minRestDays = getRuleParam(rules, 'min_rest_days', 'days', 2);
  const maxWeeklyHours = getRuleParam(rules, 'max_weekly_hours', 'hours', config.maxWeeklyHours || 55.5);
  const balanceThreshold = getRuleParam(rules, 'balance_distribution', 'threshold', 2.5);

  const rDoctors = doctors.filter(d => d.canRepublic);
  const dDoctors = doctors.filter(d => d.canDepartment);
  const dOnlyDoctors = doctors.filter(d => d.canDepartment && !d.canRepublic);

  // ===== Per-weekday R capacity =====
  const daysInMonth = new Date(config.year, config.month, 0).getDate();
  const weekdayCounts: Record<number, number> = {};
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(config.year, config.month - 1, day);
    const wd = jsToWeekday(d.getDay());
    weekdayCounts[wd] = (weekdayCounts[wd] || 0) + 1;
  }

  for (let wd = 0; wd < 7; wd++) {
    const available = rDoctors.filter(doc => {
      // Blocked by same-day polyclinic
      if (checkPolySameDay && doc.polyclinicSchedule.some(s => s.weekday === wd)) return false;
      // Blocked by prev-day (next day has polyclinic)
      if (checkPolyPrevDay) {
        const nextWd = (wd + 1) % 7;
        if (doc.polyclinicSchedule.some(s => s.weekday === nextWd)) return false;
      }
      return true;
    });

    const count = weekdayCounts[wd] || 0;
    if (count === 0) continue;

    if (available.length === 0) {
      issues.push({
        severity: 'critical',
        category: 'capacity',
        title: `Nėra R gydytojų ${WEEKDAY_SHORT[wd]}`,
        description: `${WEEKDAY_SHORT[wd]} dienomis nė vienas gydytojas negali budėti už respubliką (poliklinika + prev-day blokuoja visus).`,
        suggestion: 'Patikrinkite poliklinikos grafikus arba išjunkite „Dieną prieš polikliniką" taisyklę.',
      });
    } else if (available.length <= 2) {
      issues.push({
        severity: 'warning',
        category: 'capacity',
        title: `Mažai R gydytojų ${WEEKDAY_SHORT[wd]} (${available.length})`,
        description: `${WEEKDAY_SHORT[wd]} dienomis tik ${available.length} gydytoj${available.length === 1 ? 'as' : 'ai'} gali budėti R: ${available.map(d => d.name).join(', ')}.`,
        suggestion: `Su min_rest=${minRestDays} d. ir ${count} ${WEEKDAY_SHORT[wd]}/mėn., gali nepakakti. Svarstykite poliklinikos perkėlimą.`,
      });
    } else if (available.length <= 4) {
      issues.push({
        severity: 'info',
        category: 'capacity',
        title: `${WEEKDAY_SHORT[wd]}: ${available.length} R gydytojai`,
        description: `Prieinami: ${available.map(d => d.name).join(', ')}. Pakankama, bet maža atsarga.`,
      });
    }
  }

  // ===== Per-doctor availability =====
  for (const doc of doctors) {
    const blockedDays = new Set<number>();

    for (let wd = 0; wd < 7; wd++) {
      if (checkPolySameDay && doc.polyclinicSchedule.some(s => s.weekday === wd)) {
        blockedDays.add(wd);
      }
      if (checkPolyPrevDay) {
        const nextWd = (wd + 1) % 7;
        if (doc.polyclinicSchedule.some(s => s.weekday === nextWd)) {
          blockedDays.add(wd);
        }
      }
    }

    if (blockedDays.size >= 5) {
      const available = Array.from({ length: 7 }, (_, i) => i)
        .filter(wd => !blockedDays.has(wd))
        .map(wd => WEEKDAY_SHORT[wd]);
      issues.push({
        severity: 'warning',
        category: 'availability',
        title: `${doc.name}: prieinamas tik ${available.join(', ')}`,
        description: `Poliklinikos grafikas blokuoja ${blockedDays.size} iš 7 savaitės dienų. Galimas max ~${Math.floor((7 - blockedDays.size) * 4 / minRestDays)} bud./mėn.`,
        suggestion: doc.polyclinicSchedule.length >= 3
          ? 'Gydytojas turi 3+ poliklinikos dienas — galbūt per daug apribojimų.'
          : undefined,
      });
    }

    // Monthly limit too low for fair distribution
    const totalSlots = daysInMonth * 2;
    const fairShare = totalSlots / doctors.length;
    if (doc.maxTotalPerMonth !== null && doc.maxTotalPerMonth < fairShare * 0.5) {
      issues.push({
        severity: 'info',
        category: 'balance',
        title: `${doc.name}: žemas mėnesio limitas (${doc.maxTotalPerMonth})`,
        description: `Tolygus vidurkis būtų ~${fairShare.toFixed(1)} bud./mėn. Limitas ${doc.maxTotalPerMonth} reiškia, kad kiti gydytojai turi kompensuoti.`,
      });
    }

    // maxR limit interaction with R capacity
    if (doc.canRepublic && doc.maxRepublicPerMonth !== null && doc.maxRepublicPerMonth <= 2) {
      issues.push({
        severity: 'info',
        category: 'balance',
        title: `${doc.name}: maxR=${doc.maxRepublicPerMonth}/mėn.`,
        description: `Žemas R limitas — kiti R gydytojai turės padengti daugiau respublikos budėjimų.`,
      });
    }
  }

  // ===== Global checks =====

  // Weekly hours vs shift duration redundancy
  const maxShiftsPerWeek = Math.floor(maxWeeklyHours / shiftDuration);
  if (minRestDays >= 2 && maxShiftsPerWeek >= 2) {
    // min_rest=2 already limits to ~2-3 shifts/week, which may be ≤ maxShiftsPerWeek
    const theoreticalMax = Math.floor(7 / minRestDays);
    if (theoreticalMax <= maxShiftsPerWeek) {
      issues.push({
        severity: 'info',
        category: 'config',
        title: 'Valandų limitas redundantiškas',
        description: `Su min_rest=${minRestDays} d. ir ${shiftDuration}h pamainomis, max per savaitę = ${theoreticalMax} pamainos (${theoreticalMax * shiftDuration}h). Valandų limitas ${maxWeeklyHours}h niekada nebus pasiektas.`,
        suggestion: `Galite sumažinti valandų limitą iki ${theoreticalMax * shiftDuration}h arba išjungti šią taisyklę.`,
      });
    }
  }

  // Balance threshold vs actual spread
  if (dOnlyDoctors.length > 0) {
    const rOnlySlots = daysInMonth; // ~30 R slots
    const avgR = rOnlySlots / rDoctors.length;
    const avgD = daysInMonth / dDoctors.length;
    const totalAvg = (daysInMonth * 2) / doctors.length;
    // D-only doctors get ~avgD shifts, R-capable get ~avgR+avgD. Spread can be large.
    const expectedSpread = Math.abs((avgR + avgD) - avgD);
    if (expectedSpread > balanceThreshold) {
      issues.push({
        severity: 'warning',
        category: 'config',
        title: `Balanso slenkstis (${balanceThreshold}) gali būti per mažas`,
        description: `D-only gydytojai (${dOnlyDoctors.length}) natūraliai gaus mažiau pamainų nei R+D gydytojai. Skirtumas ~${expectedSpread.toFixed(1)} viršija slenkstį ${balanceThreshold}.`,
        suggestion: `Rekomenduojamas slenkstis: ≥${Math.ceil(expectedSpread + 0.5)}. Arba nustatykite kaip perspėjimą, ne klaidą.`,
      });
    }
  }

  // Unavailable dates covering too much of the month
  for (const doc of doctors) {
    const monthDates = doc.unavailableDates.filter(d => {
      const date = new Date(d);
      return date.getFullYear() === config.year && date.getMonth() + 1 === config.month;
    });
    if (monthDates.length > daysInMonth * 0.5) {
      issues.push({
        severity: 'warning',
        category: 'availability',
        title: `${doc.name}: ${monthDates.length}/${daysInMonth} dienų neprieinamas`,
        description: `Daugiau nei pusė mėnesio pažymėta kaip negalima. Gali stipriai paveikti paskirstymą.`,
      });
    } else if (monthDates.length > daysInMonth * 0.3) {
      issues.push({
        severity: 'info',
        category: 'availability',
        title: `${doc.name}: ${monthDates.length} negalimų dienų`,
        description: `${monthDates.length} dienos pažymėtos kaip negalimos šį mėnesį.`,
      });
    }
  }

  // Sort: critical first, then warning, then info
  const order = { critical: 0, warning: 1, info: 2 };
  issues.sort((a, b) => order[a.severity] - order[b.severity]);

  return issues;
}
