export const WEEKDAY_NAMES_SHORT = ['Pr', 'An', 'Tr', 'Kt', 'Pn', 'Št', 'Sk'] as const;
export const WEEKDAY_NAMES_FULL = [
  'Pirmadienis', 'Antradienis', 'Trečiadienis', 'Ketvirtadienis',
  'Penktadienis', 'Šeštadienis', 'Sekmadienis'
] as const;

export const MONTH_NAMES = [
  'Sausis', 'Vasaris', 'Kovas', 'Balandis', 'Gegužė', 'Birželis',
  'Liepa', 'Rugpjūtis', 'Rugsėjis', 'Spalis', 'Lapkritis', 'Gruodis'
] as const;

// ===== Lietuvos valstybinės šventės =====

/** Apskaičiuoti Velykų datą (Anonymus/Meeus algoritmas) */
function easterDate(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3=kovas, 4=balandis
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

/** Gauti visas LT šventes konkrečiais metais — grąžina {month, day, name}[] */
export function getLithuanianHolidays(year: number): { month: number; day: number; name: string }[] {
  const holidays: { month: number; day: number; name: string }[] = [
    { month: 1, day: 1, name: 'Naujieji metai' },
    { month: 2, day: 16, name: 'Valstybės atkūrimo diena' },
    { month: 3, day: 11, name: 'Nepriklausomybės atkūrimo diena' },
    { month: 5, day: 1, name: 'Tarptautinė darbo diena' },
    { month: 6, day: 24, name: 'Joninės (Rasos)' },
    { month: 7, day: 6, name: 'Valstybės (Mindaugo karūnavimo) diena' },
    { month: 8, day: 15, name: 'Žolinė (Švč. M. Marijos ėmimas į dangų)' },
    { month: 11, day: 1, name: 'Visų Šventųjų diena' },
    { month: 11, day: 2, name: 'Vėlinės' },
    { month: 12, day: 24, name: 'Kūčios' },
    { month: 12, day: 25, name: 'Kalėdos (pirma diena)' },
    { month: 12, day: 26, name: 'Kalėdos (antra diena)' },
  ];

  // Velykos (sekmadienis + pirmadienis)
  const easter = easterDate(year);
  const easterMonday = new Date(easter);
  easterMonday.setDate(easter.getDate() + 1);

  holidays.push({
    month: easter.getMonth() + 1,
    day: easter.getDate(),
    name: 'Velykos',
  });
  holidays.push({
    month: easterMonday.getMonth() + 1,
    day: easterMonday.getDate(),
    name: 'Velykų antroji diena',
  });

  return holidays.sort((a, b) => a.month - b.month || a.day - b.day);
}

/** Gauti šventines dienas konkrečiam mėnesiui (grąžina dienos numerius) */
export function getHolidaysForMonth(year: number, month: number): { day: number; name: string }[] {
  return getLithuanianHolidays(year)
    .filter(h => h.month === month)
    .map(h => ({ day: h.day, name: h.name }));
}

// Helper: format polyclinic schedule as human-readable string
// e.g., "Pirm. 11-13; Treč. 9-12"
const WEEKDAY_ABBREV = ['Pirm.', 'Antr.', 'Treč.', 'Ketv.', 'Penkt.', 'Šešt.', 'Sekm.'] as const;

export function formatPolyclinicSchedule(slots: { weekday: number; startHour: number; endHour: number }[]): string {
  if (slots.length === 0) return '—';
  return slots
    .slice()
    .sort((a, b) => a.weekday - b.weekday)
    .map(s => `${WEEKDAY_ABBREV[s.weekday]} ${s.startHour}-${s.endHour}`)
    .join('; ');
}

export const DEFAULT_MAX_WEEKLY_HOURS = 55.5;
export const DEFAULT_SHIFT_DURATION = 24;
export const MIN_REST_DAYS = 2; // min gap between shifts in calendar days

export const VALIDATION_MESSAGES = {
  WEEKLY_HOURS_EXCEEDED: (name: string, week: number, hours: number) =>
    `${name}: ${week} savaitė — ${hours}h viršija 55,5h limitą`,
  CONSECUTIVE_SHIFTS: (name: string, day1: number, day2: number) =>
    `${name}: budėjimai iš eilės ${day1} ir ${day2} d. — reikia poilsio`,
  POLYCLINIC_CONFLICT: (name: string, day: number) =>
    `${name}: ${day} d. sutampa su poliklinikos grafiku`,
  POLYCLINIC_NEXT_DAY: (name: string, day: number) =>
    `${name}: ${day} d. budėjimas — kitą dieną poliklinika (nespės pailsėti)`,
  REPUBLIC_LIMIT: (name: string, count: number, max: number) =>
    `${name}: ${count} respublikos budėjimai viršija limitą (max ${max})`,
  DEPARTMENT_LIMIT: (name: string, count: number, max: number) =>
    `${name}: ${count} skyriaus budėjimai viršija limitą (max ${max})`,
  TOTAL_LIMIT: (name: string, count: number, max: number) =>
    `${name}: ${count} budėjimai viršija limitą (max ${max})`,
  CANNOT_REPUBLIC: (name: string) =>
    `${name}: negali budėti už respubliką`,
  CANNOT_DEPARTMENT: (name: string) =>
    `${name}: negali budėti už skyrių`,
  UNAVAILABLE: (name: string, day: number) =>
    `${name}: ${day} d. pažymėtas kaip negalintis`,
  UNBALANCED: (name: string, count: number, average: number) =>
    `${name}: ${count} budėjimai — ${count > average ? 'daugiau' : 'mažiau'} nei vidurkis (${average.toFixed(1)})`,
  SLOT_EMPTY: (day: number, slot: string) =>
    `${day} d. — ${slot} stulpelis tuščias!`,
};
