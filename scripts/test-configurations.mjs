/**
 * Neurokirurgijos klinikos budėjimų grafiko testavimo skriptas
 * ──────────────────────────────────────────────────────────────
 * Tikrina ar algoritmas gali sugeneruoti grafiką su 15, 16 arba 17 gydytojų.
 * Nekeičia JOKIO programos kodo — kviečia tik jau esamą API endpoint'ą.
 *
 * Paleisti:
 *   node scripts/test-configurations.mjs
 *   node scripts/test-configurations.mjs --url http://localhost:3000
 *   node scripts/test-configurations.mjs --url https://laima.vercel.app
 */

const BASE_URL = process.argv.find(a => a.startsWith('http')) || 'http://localhost:3000';

// ═══════════════════════════════════════════════════════════════
// Gydytojų duomenys (iš default-doctors.ts — nekeičiama versija)
// ═══════════════════════════════════════════════════════════════

const DOCTORS = {
  'tamasauskas-a': {
    id: 'tamasauskas-a', name: 'Tamašauskas A.', role: 'doctor',
    canRepublic: true, canDepartment: false,
    maxRepublicPerMonth: 3, maxDepartmentPerMonth: null, maxTotalPerMonth: null,
    allowedWeekdays: [3], // tik ketvirtadieniais
    polyclinicSchedule: [{ weekday: 0, startHour: 11, endHour: 13 }], // Pr 11-13
    unavailableDates: [], preferences: 'Budi tik ketvirtadieniais, max 3k/mėn.',
  },
  'vaitkevicius': {
    id: 'vaitkevicius', name: 'Vaitkevičius', role: 'doctor',
    canRepublic: true, canDepartment: false,
    maxRepublicPerMonth: 3, maxDepartmentPerMonth: null, maxTotalPerMonth: null,
    allowedWeekdays: null,
    polyclinicSchedule: [{ weekday: 2, startHour: 12, endHour: 16 }], // Tr 12-16
    unavailableDates: [], preferences: 'Max 3k/mėn.',
  },
  'tamasauskas-d': {
    id: 'tamasauskas-d', name: 'Tamašauskas D.', role: 'doctor',
    canRepublic: false, canDepartment: true,
    maxRepublicPerMonth: null, maxDepartmentPerMonth: null, maxTotalPerMonth: null,
    allowedWeekdays: null,
    polyclinicSchedule: [{ weekday: 1, startHour: 12, endHour: 16 }], // An 12-16
    unavailableDates: [], preferences: '',
  },
  'budenas': {
    id: 'budenas', name: 'Budėnas', role: 'doctor',
    canRepublic: false, canDepartment: true,
    maxRepublicPerMonth: null, maxDepartmentPerMonth: null, maxTotalPerMonth: null,
    allowedWeekdays: null,
    polyclinicSchedule: [{ weekday: 2, startHour: 12, endHour: 16 }], // Tr 12-16
    unavailableDates: [], preferences: '',
  },
  'deltuva': {
    id: 'deltuva', name: 'Deltuva', role: 'doctor',
    canRepublic: true, canDepartment: false,
    maxRepublicPerMonth: 3, maxDepartmentPerMonth: null, maxTotalPerMonth: null,
    allowedWeekdays: [1, 2], // antr-treč
    polyclinicSchedule: [{ weekday: 0, startHour: 12, endHour: 15 }], // Pr 12-15
    unavailableDates: [], preferences: 'Budi tik antr-treč, max 3k/mėn.',
  },
  'simaitis': {
    id: 'simaitis', name: 'Simaitis', role: 'doctor',
    canRepublic: false, canDepartment: true,
    maxRepublicPerMonth: null, maxDepartmentPerMonth: null, maxTotalPerMonth: null,
    allowedWeekdays: null,
    polyclinicSchedule: [{ weekday: 3, startHour: 12, endHour: 16 }], // Kt 12-16
    unavailableDates: [], preferences: '',
  },
  'sliauzys': {
    id: 'sliauzys', name: 'Šliaužys', role: 'doctor',
    canRepublic: false, canDepartment: true,
    maxRepublicPerMonth: null, maxDepartmentPerMonth: null, maxTotalPerMonth: null,
    allowedWeekdays: null,
    polyclinicSchedule: [{ weekday: 2, startHour: 8, endHour: 12 }], // Tr 8-12
    unavailableDates: [], preferences: '',
  },
  'bareikis': {
    id: 'bareikis', name: 'Bareikis', role: 'doctor',
    canRepublic: false, canDepartment: true,
    maxRepublicPerMonth: null, maxDepartmentPerMonth: null, maxTotalPerMonth: null,
    allowedWeekdays: null,
    polyclinicSchedule: [{ weekday: 1, startHour: 8, endHour: 13 }], // An 8-13
    unavailableDates: [], preferences: '',
  },
  'cikotas': {
    id: 'cikotas', name: 'Čikotas', role: 'doctor',
    canRepublic: true, canDepartment: true,
    maxRepublicPerMonth: null, maxDepartmentPerMonth: null, maxTotalPerMonth: null,
    allowedWeekdays: [1, 2, 3, 4, 5, 6], // ne pirmadienis
    polyclinicSchedule: [{ weekday: 4, startHour: 8, endHour: 12 }], // Pn 8-12
    unavailableDates: [], preferences: 'Negali pirmadieniais.',
  },
  'radziunas': {
    id: 'radziunas', name: 'Radžiūnas', role: 'doctor',
    canRepublic: true, canDepartment: true,
    maxRepublicPerMonth: null, maxDepartmentPerMonth: null, maxTotalPerMonth: null,
    allowedWeekdays: null,
    polyclinicSchedule: [{ weekday: 0, startHour: 12, endHour: 16 }], // Pr 12-16
    unavailableDates: [], preferences: '',
  },
  'tamasauskas-s': {
    id: 'tamasauskas-s', name: 'Tamašauskas Š.', role: 'doctor',
    canRepublic: false, canDepartment: true,
    maxRepublicPerMonth: null, maxDepartmentPerMonth: null, maxTotalPerMonth: null,
    allowedWeekdays: [0, 1, 2, 3, 5, 6], // ne penktadienis
    polyclinicSchedule: [{ weekday: 3, startHour: 12, endHour: 16 }], // Kt 12-16
    unavailableDates: [], preferences: 'Negali penktadieniais.',
  },
  'vaisvilas': {
    id: 'vaisvilas', name: 'Vaišvilas', role: 'doctor',
    canRepublic: false, canDepartment: true,
    maxRepublicPerMonth: null, maxDepartmentPerMonth: null, maxTotalPerMonth: null,
    allowedWeekdays: null,
    polyclinicSchedule: [{ weekday: 1, startHour: 8, endHour: 12 }], // An 8-12
    unavailableDates: [], preferences: '',
  },
  'fedaravicius': {
    id: 'fedaravicius', name: 'Fedaravičius', role: 'doctor',
    canRepublic: false, canDepartment: true,
    maxRepublicPerMonth: null, maxDepartmentPerMonth: null, maxTotalPerMonth: null,
    allowedWeekdays: null,
    polyclinicSchedule: [{ weekday: 4, startHour: 12, endHour: 16 }], // Pn 12-16
    unavailableDates: [], preferences: '',
  },
  'urbonas': {
    id: 'urbonas', name: 'Urbonas', role: 'doctor',
    canRepublic: true, canDepartment: false,
    maxRepublicPerMonth: 3, maxDepartmentPerMonth: null, maxTotalPerMonth: null,
    allowedWeekdays: null,
    polyclinicSchedule: [
      { weekday: 0, startHour: 9, endHour: 12 }, // Pr 9-12
      { weekday: 3, startHour: 8, endHour: 12 }, // Kt 8-12
    ],
    unavailableDates: [], preferences: 'Max 3k/mėn.',
  },
  'piliponis': {
    id: 'piliponis', name: 'Piliponis', role: 'doctor',
    canRepublic: false, canDepartment: true,
    maxRepublicPerMonth: null, maxDepartmentPerMonth: null, maxTotalPerMonth: null,
    allowedWeekdays: null,
    polyclinicSchedule: [{ weekday: 4, startHour: 8, endHour: 12 }], // Pn 8-12
    unavailableDates: [], preferences: '',
  },
  'marcinkevičius': {
    id: 'marcinkevičius', name: 'Marcinkevičius', role: 'doctor',
    canRepublic: true, canDepartment: true,
    maxRepublicPerMonth: null, maxDepartmentPerMonth: null, maxTotalPerMonth: null,
    allowedWeekdays: null,
    polyclinicSchedule: [{ weekday: 3, startHour: 9, endHour: 12 }], // Kt 9-12
    unavailableDates: [], preferences: '',
  },
  'sinkūnas': {
    id: 'sinkūnas', name: 'Šinkūnas', role: 'doctor',
    canRepublic: true, canDepartment: true,
    maxRepublicPerMonth: null, maxDepartmentPerMonth: null, maxTotalPerMonth: null,
    allowedWeekdays: null,
    polyclinicSchedule: [{ weekday: 1, startHour: 13, endHour: 16 }], // An 13-16
    unavailableDates: [], preferences: '',
  },
};

// Standartinės taisyklės (iš default-rules.ts)
const DEFAULT_RULES = [
  { id: 'max_weekly_hours', name: 'Savaitės valandų limitas', type: 'max_weekly_hours', enabled: true, severity: 'error', params: { hours: 55.5 }, builtIn: true },
  { id: 'min_rest_days', name: 'Minimalus poilsis', type: 'min_rest_days', enabled: true, severity: 'error', params: { days: 2 }, builtIn: true },
  { id: 'no_polyclinic_same_day', name: 'Poliklinikos dienos konfliktas', type: 'no_polyclinic_same_day', enabled: true, severity: 'error', params: {}, builtIn: true },
  { id: 'no_polyclinic_prev_day', name: 'Dieną prieš polikliniką', type: 'no_polyclinic_prev_day', enabled: true, severity: 'error', params: {}, builtIn: true },
  { id: 'require_both_slots', name: 'Abu stulpeliai', type: 'require_both_slots', enabled: true, severity: 'error', params: {}, builtIn: true },
  { id: 'respect_unavailable', name: 'Negalimos datos', type: 'respect_unavailable', enabled: true, severity: 'error', params: {}, builtIn: true },
  { id: 'respect_slot_types', name: 'Stulpelių apribojimai', type: 'respect_slot_types', enabled: true, severity: 'error', params: {}, builtIn: true },
  { id: 'respect_monthly_limits', name: 'Mėnesiniai limitai', type: 'respect_monthly_limits', enabled: true, severity: 'error', params: {}, builtIn: true },
  { id: 'balance_distribution', name: 'Tolygus paskirstymas', type: 'balance_distribution', enabled: true, severity: 'warning', params: { threshold: 2.5 }, builtIn: true },
  { id: 'dept_only_priority', name: 'Skyriaus pirmenybė', type: 'dept_only_priority', enabled: true, severity: 'warning', params: {}, builtIn: true },
  { id: 'max_weekend_shifts', name: 'Max savaitgalio', type: 'max_weekend_shifts', enabled: true, severity: 'warning', params: { maxShifts: 4 }, builtIn: true },
];

// ═══════════════════════════════════════════════════════════════
// 3 bandymų konfigūracijos (pagal Excel failus)
// ═══════════════════════════════════════════════════════════════

const CONFIGURATIONS = [
  {
    label: 'Bandymas-1 (15 gydytojų)',
    file: 'Bandymas-1.xlsx',
    doctorIds: [
      'tamasauskas-a', 'vaitkevicius', 'tamasauskas-d', 'budenas', 'deltuva',
      'simaitis', 'sliauzys', 'bareikis', 'cikotas', 'radziunas',
      'tamasauskas-s', 'vaisvilas', 'fedaravicius', 'urbonas', 'piliponis',
    ],
  },
  {
    label: 'Bandymas-2 (16 gydytojų)',
    file: 'Bandymas-2.xlsx',
    doctorIds: [
      'tamasauskas-a', 'vaitkevicius', 'tamasauskas-d', 'budenas', 'deltuva',
      'simaitis', 'sliauzys', 'bareikis', 'cikotas', 'radziunas',
      'tamasauskas-s', 'vaisvilas', 'fedaravicius', 'urbonas', 'piliponis',
      'marcinkevičius',
    ],
  },
  {
    label: 'Bandymas-3 (17 gydytojų)',
    file: 'Bandymas-3.xlsx',
    doctorIds: [
      'tamasauskas-a', 'vaitkevicius', 'tamasauskas-d', 'budenas', 'deltuva',
      'simaitis', 'sliauzys', 'bareikis', 'cikotas', 'radziunas',
      'tamasauskas-s', 'vaisvilas', 'fedaravicius', 'urbonas', 'piliponis',
      'marcinkevičius', 'sinkūnas',
    ],
  },
];

// Testuojamas mėnuo: 2026 balandis
// Šventės: Velykos buvo kovo 29-30, balandžio mėn. švenčių nėra
const CONFIG = {
  year: 2026,
  month: 4,
  holidays: [],
  maxWeeklyHours: 55.5,
  shiftDurationHours: 24,
};

// ═══════════════════════════════════════════════════════════════
// Pagalbinės funkcijos
// ═══════════════════════════════════════════════════════════════

const WEEKDAYS = ['Pr', 'An', 'Tr', 'Kt', 'Pn', 'Št', 'Sk'];

function countStats(schedule, doctors) {
  const stats = {};
  for (const d of doctors) {
    stats[d.id] = { name: d.name, R: 0, D: 0, total: 0, weekend: 0 };
  }
  for (const entry of schedule) {
    if (entry.republicDoctor && stats[entry.republicDoctor]) {
      stats[entry.republicDoctor].R++;
      stats[entry.republicDoctor].total++;
      if (entry.isWeekend || entry.isHoliday) stats[entry.republicDoctor].weekend++;
    }
    if (entry.departmentDoctor && stats[entry.departmentDoctor]) {
      stats[entry.departmentDoctor].D++;
      stats[entry.departmentDoctor].total++;
      if (entry.isWeekend || entry.isHoliday) stats[entry.departmentDoctor].weekend++;
    }
  }
  return stats;
}

function findProblems(schedule, doctors) {
  const problems = [];

  // Patikrinti ar visi stulpeliai užpildyti
  for (const entry of schedule) {
    if (!entry.republicDoctor) problems.push(`  ❌ ${entry.day} d. — R stulpelis tuščias`);
    if (!entry.departmentDoctor) problems.push(`  ❌ ${entry.day} d. — D stulpelis tuščias`);
    if (entry.republicDoctor === entry.departmentDoctor)
      problems.push(`  ❌ ${entry.day} d. — tas pats gydytojas R ir D`);
  }

  // Patikrinti poilsio taisyklę (min 2 dienos tarp budėjimų)
  const doctorDays = {};
  for (const d of doctors) doctorDays[d.id] = [];
  for (const entry of schedule) {
    if (entry.republicDoctor) doctorDays[entry.republicDoctor].push(entry.day);
    if (entry.departmentDoctor) doctorDays[entry.departmentDoctor].push(entry.day);
  }
  for (const d of doctors) {
    const days = doctorDays[d.id].sort((a, b) => a - b);
    for (let i = 1; i < days.length; i++) {
      if (days[i] - days[i - 1] < 2) {
        problems.push(`  ⚠️  ${d.name}: budėjimai ${days[i - 1]} ir ${days[i]} d. — per mažai poilsio`);
      }
    }
  }

  return problems;
}

async function testConfiguration(config) {
  const doctors = config.doctorIds.map(id => DOCTORS[id]);
  const missingDoctors = config.doctorIds.filter(id => !DOCTORS[id]);
  if (missingDoctors.length > 0) {
    console.log(`  ❌ Nerasti gydytojai: ${missingDoctors.join(', ')}`);
    return;
  }

  const body = {
    doctors,
    config: CONFIG,
    rules: DEFAULT_RULES,
    clinicHistory: {},
  };

  const t0 = Date.now();
  let response;
  try {
    response = await fetch(`${BASE_URL}/api/schedule/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.log(`  ❌ Serveris nepasiekiamas (${BASE_URL}) — ar veikia dev serveris?`);
    console.log(`     ${err.message}`);
    return;
  }

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

  if (!response.ok) {
    const text = await response.text();
    console.log(`  ❌ API klaida: HTTP ${response.status}`);
    console.log(`     ${text.slice(0, 200)}`);
    return;
  }

  const data = await response.json();
  const schedule = data.schedule;

  if (!schedule || schedule.length === 0) {
    console.log('  ❌ Grąžintas tuščias grafikas');
    return;
  }

  console.log(`  ✅ Sugeneruota per ${elapsed}s — ${schedule.length} dienų`);

  // Statistika
  const stats = countStats(schedule, doctors);
  const counts = Object.values(stats).filter(s => s.total > 0);
  const totals = counts.map(s => s.total);
  const min = Math.min(...totals);
  const max = Math.max(...totals);
  const avg = (totals.reduce((a, b) => a + b, 0) / totals.length).toFixed(1);

  console.log(`\n  Budėjimų paskirstymas (min ${min} / vid ${avg} / max ${max}):`);
  console.log(`  ${'Gydytojas'.padEnd(22)} ${'R'.padStart(3)} ${'D'.padStart(3)} ${'Iš viso'.padStart(8)} ${'Savaitg.'.padStart(9)}`);
  console.log(`  ${'-'.repeat(50)}`);
  for (const s of Object.values(stats).sort((a, b) => b.total - a.total)) {
    const bar = '█'.repeat(s.total);
    console.log(`  ${s.name.padEnd(22)} ${String(s.R).padStart(3)} ${String(s.D).padStart(3)} ${String(s.total).padStart(8)} ${String(s.weekend).padStart(9)}  ${bar}`);
  }

  // Problemos
  const problems = findProblems(schedule, doctors);
  if (problems.length === 0) {
    console.log('\n  Taisyklių pažeidimų nerasta ✓');
  } else {
    console.log(`\n  Rasta ${problems.length} problema(-ų):`);
    for (const p of problems.slice(0, 15)) console.log(p);
    if (problems.length > 15) console.log(`  ... ir dar ${problems.length - 15}`);
  }

  // Dienoraštis (pirmos 10 dienų kaip pavyzdys)
  console.log('\n  Pirmos 10 dienų (R = respublika, D = skyrius):');
  for (const entry of schedule.slice(0, 10)) {
    const wd = WEEKDAYS[entry.weekday];
    const flag = entry.isWeekend ? '[S]' : entry.isHoliday ? '[Š]' : '   ';
    const r = doctors.find(d => d.id === entry.republicDoctor)?.name ?? '---';
    const dep = doctors.find(d => d.id === entry.departmentDoctor)?.name ?? '---';
    console.log(`  ${String(entry.day).padStart(2)} ${wd} ${flag}  R: ${r.padEnd(22)}  D: ${dep}`);
  }
}

// ═══════════════════════════════════════════════════════════════
// Pagrindinis vykdymas
// ═══════════════════════════════════════════════════════════════

console.log('═'.repeat(60));
console.log(' Neurochirurgijos klinikos grafiko algoritmų testas');
console.log(` Mėnuo: 2026 balandis  |  Serveris: ${BASE_URL}`);
console.log('═'.repeat(60));

for (const cfg of CONFIGURATIONS) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(` ${cfg.label}`);
  console.log('─'.repeat(60));
  await testConfiguration(cfg);
}

console.log(`\n${'═'.repeat(60)}`);
console.log(' Testas baigtas.');
console.log('═'.repeat(60));
