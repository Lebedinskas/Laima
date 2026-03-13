export const WEEKDAY_NAMES_SHORT = ['Pr', 'An', 'Tr', 'Kt', 'Pn', 'Št', 'Sk'] as const;
export const WEEKDAY_NAMES_FULL = [
  'Pirmadienis', 'Antradienis', 'Trečiadienis', 'Ketvirtadienis',
  'Penktadienis', 'Šeštadienis', 'Sekmadienis'
] as const;

export const MONTH_NAMES = [
  'Sausis', 'Vasaris', 'Kovas', 'Balandis', 'Gegužė', 'Birželis',
  'Liepa', 'Rugpjūtis', 'Rugsėjis', 'Spalis', 'Lapkritis', 'Gruodis'
] as const;

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
