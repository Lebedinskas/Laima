/**
 * Neurochirurgijos klinikos budėjimų grafikų generavimas ir eksportavimas į Excel
 * ─────────────────────────────────────────────────────────────────────────────────
 * Generuoja 3 grafikus (15, 16, 17 gydytojų) ir išsaugo Excel failus.
 * Nekeičia JOKIO programos kodo.
 *
 * Paleisti:
 *   node scripts/export-test-configurations.mjs
 *   node scripts/export-test-configurations.mjs --url https://laima.vercel.app
 *   node scripts/export-test-configurations.mjs --out C:/Users/tomas/Downloads/mamai
 */

import ExcelJS from 'exceljs';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

const BASE_URL = (() => {
  const i = process.argv.indexOf('--url');
  return i >= 0 ? process.argv[i + 1] : 'http://localhost:3000';
})();

const OUT_DIR = (() => {
  const i = process.argv.indexOf('--out');
  return i >= 0 ? process.argv[i + 1] : 'C:/Users/tomas/Downloads/mamai';
})();

// ═══════════════════════════════════════════════════════════════
// Gydytojų duomenys
// ═══════════════════════════════════════════════════════════════

const DOCTORS = {
  'tamasauskas-a': {
    id: 'tamasauskas-a', name: 'Tamašauskas A.', role: 'doctor',
    canRepublic: true, canDepartment: false,
    maxRepublicPerMonth: 3, maxDepartmentPerMonth: null, maxTotalPerMonth: null,
    allowedWeekdays: [3],
    polyclinicSchedule: [{ weekday: 0, startHour: 11, endHour: 13 }],
    unavailableDates: [], preferences: 'Budi tik ketvirtadieniais, max 3k/mėn.',
  },
  'vaitkevicius': {
    id: 'vaitkevicius', name: 'Vaitkevičius', role: 'doctor',
    canRepublic: true, canDepartment: false,
    maxRepublicPerMonth: 3, maxDepartmentPerMonth: null, maxTotalPerMonth: null,
    allowedWeekdays: null,
    polyclinicSchedule: [{ weekday: 2, startHour: 12, endHour: 16 }],
    unavailableDates: [], preferences: 'Max 3k/mėn.',
  },
  'tamasauskas-d': {
    id: 'tamasauskas-d', name: 'Tamašauskas D.', role: 'doctor',
    canRepublic: false, canDepartment: true,
    maxRepublicPerMonth: null, maxDepartmentPerMonth: null, maxTotalPerMonth: null,
    allowedWeekdays: null,
    polyclinicSchedule: [{ weekday: 1, startHour: 12, endHour: 16 }],
    unavailableDates: [], preferences: '',
  },
  'budenas': {
    id: 'budenas', name: 'Budėnas', role: 'doctor',
    canRepublic: false, canDepartment: true,
    maxRepublicPerMonth: null, maxDepartmentPerMonth: null, maxTotalPerMonth: null,
    allowedWeekdays: null,
    polyclinicSchedule: [{ weekday: 2, startHour: 12, endHour: 16 }],
    unavailableDates: [], preferences: '',
  },
  'deltuva': {
    id: 'deltuva', name: 'Deltuva', role: 'doctor',
    canRepublic: true, canDepartment: false,
    maxRepublicPerMonth: 3, maxDepartmentPerMonth: null, maxTotalPerMonth: null,
    allowedWeekdays: [1, 2],
    polyclinicSchedule: [{ weekday: 0, startHour: 12, endHour: 15 }],
    unavailableDates: [], preferences: 'Budi tik antr-treč, max 3k/mėn.',
  },
  'simaitis': {
    id: 'simaitis', name: 'Simaitis', role: 'doctor',
    canRepublic: false, canDepartment: true,
    maxRepublicPerMonth: null, maxDepartmentPerMonth: null, maxTotalPerMonth: null,
    allowedWeekdays: null,
    polyclinicSchedule: [{ weekday: 3, startHour: 12, endHour: 16 }],
    unavailableDates: [], preferences: '',
  },
  'sliauzys': {
    id: 'sliauzys', name: 'Šliaužys', role: 'doctor',
    canRepublic: false, canDepartment: true,
    maxRepublicPerMonth: null, maxDepartmentPerMonth: null, maxTotalPerMonth: null,
    allowedWeekdays: null,
    polyclinicSchedule: [{ weekday: 2, startHour: 8, endHour: 12 }],
    unavailableDates: [], preferences: '',
  },
  'bareikis': {
    id: 'bareikis', name: 'Bareikis', role: 'doctor',
    canRepublic: false, canDepartment: true,
    maxRepublicPerMonth: null, maxDepartmentPerMonth: null, maxTotalPerMonth: null,
    allowedWeekdays: null,
    polyclinicSchedule: [{ weekday: 1, startHour: 8, endHour: 13 }],
    unavailableDates: [], preferences: '',
  },
  'cikotas': {
    id: 'cikotas', name: 'Čikotas', role: 'doctor',
    canRepublic: true, canDepartment: true,
    maxRepublicPerMonth: null, maxDepartmentPerMonth: null, maxTotalPerMonth: null,
    allowedWeekdays: [1, 2, 3, 4, 5, 6],
    polyclinicSchedule: [{ weekday: 4, startHour: 8, endHour: 12 }],
    unavailableDates: [], preferences: 'Negali pirmadieniais.',
  },
  'radziunas': {
    id: 'radziunas', name: 'Radžiūnas', role: 'doctor',
    canRepublic: true, canDepartment: true,
    maxRepublicPerMonth: null, maxDepartmentPerMonth: null, maxTotalPerMonth: null,
    allowedWeekdays: null,
    polyclinicSchedule: [{ weekday: 0, startHour: 12, endHour: 16 }],
    unavailableDates: [], preferences: '',
  },
  'tamasauskas-s': {
    id: 'tamasauskas-s', name: 'Tamašauskas Š.', role: 'doctor',
    canRepublic: false, canDepartment: true,
    maxRepublicPerMonth: null, maxDepartmentPerMonth: null, maxTotalPerMonth: null,
    allowedWeekdays: [0, 1, 2, 3, 5, 6],
    polyclinicSchedule: [{ weekday: 3, startHour: 12, endHour: 16 }],
    unavailableDates: [], preferences: 'Negali penktadieniais.',
  },
  'vaisvilas': {
    id: 'vaisvilas', name: 'Vaišvilas', role: 'doctor',
    canRepublic: false, canDepartment: true,
    maxRepublicPerMonth: null, maxDepartmentPerMonth: null, maxTotalPerMonth: null,
    allowedWeekdays: null,
    polyclinicSchedule: [{ weekday: 1, startHour: 8, endHour: 12 }],
    unavailableDates: [], preferences: '',
  },
  'fedaravicius': {
    id: 'fedaravicius', name: 'Fedaravičius', role: 'doctor',
    canRepublic: false, canDepartment: true,
    maxRepublicPerMonth: null, maxDepartmentPerMonth: null, maxTotalPerMonth: null,
    allowedWeekdays: null,
    polyclinicSchedule: [{ weekday: 4, startHour: 12, endHour: 16 }],
    unavailableDates: [], preferences: '',
  },
  'urbonas': {
    id: 'urbonas', name: 'Urbonas', role: 'doctor',
    canRepublic: true, canDepartment: false,
    maxRepublicPerMonth: 3, maxDepartmentPerMonth: null, maxTotalPerMonth: null,
    allowedWeekdays: null,
    polyclinicSchedule: [
      { weekday: 0, startHour: 9, endHour: 12 },
      { weekday: 3, startHour: 8, endHour: 12 },
    ],
    unavailableDates: [], preferences: 'Max 3k/mėn.',
  },
  'piliponis': {
    id: 'piliponis', name: 'Piliponis', role: 'doctor',
    canRepublic: false, canDepartment: true,
    maxRepublicPerMonth: null, maxDepartmentPerMonth: null, maxTotalPerMonth: null,
    allowedWeekdays: null,
    polyclinicSchedule: [{ weekday: 4, startHour: 8, endHour: 12 }],
    unavailableDates: [], preferences: '',
  },
  'marcinkevičius': {
    id: 'marcinkevičius', name: 'Marcinkevičius', role: 'doctor',
    canRepublic: true, canDepartment: true,
    maxRepublicPerMonth: null, maxDepartmentPerMonth: null, maxTotalPerMonth: null,
    allowedWeekdays: null,
    polyclinicSchedule: [{ weekday: 3, startHour: 9, endHour: 12 }],
    unavailableDates: [], preferences: '',
  },
  'sinkūnas': {
    id: 'sinkūnas', name: 'Šinkūnas', role: 'doctor',
    canRepublic: true, canDepartment: true,
    maxRepublicPerMonth: null, maxDepartmentPerMonth: null, maxTotalPerMonth: null,
    allowedWeekdays: null,
    polyclinicSchedule: [{ weekday: 1, startHour: 13, endHour: 16 }],
    unavailableDates: [], preferences: '',
  },
};

const DEFAULT_RULES = [
  { id: 'max_weekly_hours', type: 'max_weekly_hours', enabled: true, severity: 'error', params: { hours: 55.5 }, builtIn: true },
  { id: 'min_rest_days', type: 'min_rest_days', enabled: true, severity: 'error', params: { days: 2 }, builtIn: true },
  { id: 'no_polyclinic_same_day', type: 'no_polyclinic_same_day', enabled: true, severity: 'error', params: {}, builtIn: true },
  { id: 'no_polyclinic_prev_day', type: 'no_polyclinic_prev_day', enabled: true, severity: 'error', params: {}, builtIn: true },
  { id: 'require_both_slots', type: 'require_both_slots', enabled: true, severity: 'error', params: {}, builtIn: true },
  { id: 'respect_unavailable', type: 'respect_unavailable', enabled: true, severity: 'error', params: {}, builtIn: true },
  { id: 'respect_slot_types', type: 'respect_slot_types', enabled: true, severity: 'error', params: {}, builtIn: true },
  { id: 'respect_monthly_limits', type: 'respect_monthly_limits', enabled: true, severity: 'error', params: {}, builtIn: true },
  { id: 'balance_distribution', type: 'balance_distribution', enabled: true, severity: 'warning', params: { threshold: 2.5 }, builtIn: true },
  { id: 'dept_only_priority', type: 'dept_only_priority', enabled: true, severity: 'warning', params: {}, builtIn: true },
  { id: 'max_weekend_shifts', type: 'max_weekend_shifts', enabled: true, severity: 'warning', params: { maxShifts: 4 }, builtIn: true },
];

const CONFIGURATIONS = [
  {
    label: 'Bandymas-1 (15 gydytojų)', filename: 'Bandymas-1_15gyd_2026-balandis.xlsx',
    doctorIds: [
      'tamasauskas-a', 'vaitkevicius', 'tamasauskas-d', 'budenas', 'deltuva',
      'simaitis', 'sliauzys', 'bareikis', 'cikotas', 'radziunas',
      'tamasauskas-s', 'vaisvilas', 'fedaravicius', 'urbonas', 'piliponis',
    ],
  },
  {
    label: 'Bandymas-2 (16 gydytojų)', filename: 'Bandymas-2_16gyd_2026-balandis.xlsx',
    doctorIds: [
      'tamasauskas-a', 'vaitkevicius', 'tamasauskas-d', 'budenas', 'deltuva',
      'simaitis', 'sliauzys', 'bareikis', 'cikotas', 'radziunas',
      'tamasauskas-s', 'vaisvilas', 'fedaravicius', 'urbonas', 'piliponis',
      'marcinkevičius',
    ],
  },
  {
    label: 'Bandymas-3 (17 gydytojų)', filename: 'Bandymas-3_17gyd_2026-balandis.xlsx',
    doctorIds: [
      'tamasauskas-a', 'vaitkevicius', 'tamasauskas-d', 'budenas', 'deltuva',
      'simaitis', 'sliauzys', 'bareikis', 'cikotas', 'radziunas',
      'tamasauskas-s', 'vaisvilas', 'fedaravicius', 'urbonas', 'piliponis',
      'marcinkevičius', 'sinkūnas',
    ],
  },
];

const MONTH_CONFIG = { year: 2026, month: 4, holidays: [], maxWeeklyHours: 55.5, shiftDurationHours: 24 };
const MONTH_NAMES = ['Sausis','Vasaris','Kovas','Balandis','Gegužė','Birželis','Liepa','Rugpjūtis','Rugsėjis','Spalis','Lapkritis','Gruodis'];
const WEEKDAY_ABBREV = ['Pirm.','Antr.','Treč.','Ketv.','Penkt.','Šešt.','Sekm.'];

// ═══════════════════════════════════════════════════════════════
// Excel eksportavimas (analogiškas lib/export-xlsx.ts)
// ═══════════════════════════════════════════════════════════════

function formatPolyclinic(slots) {
  if (!slots || slots.length === 0) return '—';
  return slots.map(s => `${WEEKDAY_ABBREV[s.weekday]} ${s.startHour}-${s.endHour}`).join('; ');
}

function thinBorder() {
  const side = { style: 'thin', color: { argb: 'FF000000' } };
  return { top: side, bottom: side, left: side, right: side };
}

async function buildExcel(schedule, doctors, config, label) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Grafikas');
  const doctorMap = new Map(doctors.map(d => [d.id, d]));
  const monthName = MONTH_NAMES[config.month - 1].toUpperCase();

  // Antraštė
  sheet.mergeCells('A1:E1');
  const t1 = sheet.getCell('A1');
  t1.value = 'NEUROCHIRURGIJOS KLINIKOS GYDYTOJŲ IR GYD. REZIDENTŲ';
  t1.font = { name: 'Arial', size: 10, bold: true };
  t1.alignment = { horizontal: 'center' };

  sheet.mergeCells('A2:E2');
  const t2 = sheet.getCell('A2');
  t2.value = `${config.year} m. ${monthName} MĖN. BUDĖJIMŲ GRAFIKAS`;
  t2.font = { name: 'Arial', size: 10, bold: true };
  t2.alignment = { horizontal: 'center' };

  // Papildoma eilutė su bandymo etikete
  sheet.mergeCells('A3:E3');
  const t3 = sheet.getCell('A3');
  t3.value = `[ Eksperimentinis bandymas: ${label} ]`;
  t3.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF888888' } };
  t3.alignment = { horizontal: 'center' };

  // Stulpelių antraštės (eilutė 4 → 5 dėl papildomos eilutės)
  const headerRow = sheet.getRow(5);
  const headers = [
    'Diena',
    'Skubiosios medicinos\nklinika\n(8-16 val. darbo d.)',
    'Budėjimas už\nrespubliką (8-8 val.)',
    'Skubiosios medicinos klinika,\nGalvos smeg.traumų, Stuburo,\nGSCh, Vaikų, Vaikų skubios\npag. sk. (8-8 val. poilsio,\nšventinės d.),\n(16-8 val. darbo d.)',
    'Gyd. rezidentai\n(8-8 val. poilsio,\nšventinės d.),\n(16-8 val. darbo d.)',
  ];
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.font = { name: 'Arial', size: 8, bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E2F3' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = thinBorder();
  });
  headerRow.height = 65;

  // Stulpelių plotis
  sheet.getColumn(1).width = 8;
  sheet.getColumn(2).width = 22;
  sheet.getColumn(3).width = 22;
  sheet.getColumn(4).width = 28;
  sheet.getColumn(5).width = 22;

  // Grafikų duomenys (pradedant nuo eilutės 6)
  schedule.forEach((entry, idx) => {
    const row = sheet.getRow(6 + idx);
    const name = (id) => id ? doctorMap.get(id)?.name || '' : '';

    row.getCell(1).value = entry.day;
    row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(1).font = { name: 'Arial', size: 9, bold: true };

    row.getCell(2).value = name(entry.clinicDoctor);   // klinika
    row.getCell(3).value = name(entry.republicDoctor); // respublika
    row.getCell(4).value = name(entry.departmentDoctor); // skyrius
    row.getCell(5).value = name(entry.residentDoctor);

    for (let c = 1; c <= 5; c++) {
      const cell = row.getCell(c);
      if (c !== 1) cell.font = { name: 'Arial', size: 9 };
      cell.border = thinBorder();
      cell.alignment = { ...cell.alignment, vertical: 'middle' };
      if (entry.isWeekend || entry.isHoliday) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } };
        if (c !== 1) cell.font = { name: 'Arial', size: 9, bold: true };
      }
    }
  });

  // Data
  const dateStampRow = 6 + schedule.length + 1;
  sheet.mergeCells(`D${dateStampRow}:E${dateStampRow}`);
  const dateCell = sheet.getCell(`D${dateStampRow}`);
  const today = new Date();
  dateCell.value = `Sugeneruota: ${today.toISOString().slice(0, 10)}`;
  dateCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFF0000' } };
  dateCell.alignment = { horizontal: 'right' };

  // ── Statistikos lentelė ──────────────────────────────────────
  const summaryStart = dateStampRow + 2;

  sheet.getColumn(6).width = 16;
  sheet.getColumn(7).width = 16;
  sheet.getColumn(8).width = 12;
  sheet.getColumn(9).width = 12;
  sheet.getColumn(10).width = 12;

  const summaryHeaders = ['Pavardė:', 'Poliklinika', 'Budėj. R\ndienomis', 'Budėj. D\ndienomis', 'Atostogos', 'Apribojimai', 'Pageidavimai', 'Iš viso', 'Savaitg.'];
  const summaryHeaderRow = sheet.getRow(summaryStart);
  summaryHeaders.forEach((h, i) => {
    const cell = summaryHeaderRow.getCell(i + 1);
    cell.value = h;
    cell.font = { name: 'Arial', size: 8, bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E2F3' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = thinBorder();
  });
  summaryHeaderRow.height = 35;

  const sortedDoctors = doctors.slice().sort((a, b) => a.name.localeCompare(b.name, 'lt'));

  sortedDoctors.forEach((doc, idx) => {
    const row = sheet.getRow(summaryStart + 1 + idx);

    const rDays = [], dDays = [];
    let weekendCount = 0;
    schedule.forEach(e => {
      if (e.republicDoctor === doc.id) { rDays.push(e.day); if (e.isWeekend || e.isHoliday) weekendCount++; }
      if (e.departmentDoctor === doc.id) { dDays.push(e.day); if (e.isWeekend || e.isHoliday) weekendCount++; }
    });
    const total = rDays.length + dDays.length;

    row.getCell(1).value = doc.name;
    row.getCell(1).font = { name: 'Arial', size: 9, bold: true };

    row.getCell(2).value = formatPolyclinic(doc.polyclinicSchedule);
    row.getCell(2).font = { name: 'Arial', size: 8 };

    row.getCell(3).value = doc.canRepublic ? (rDays.length > 0 ? rDays.join(', ') : '-') : '-';
    row.getCell(3).font = { name: 'Arial', size: 9 };
    row.getCell(3).alignment = { horizontal: 'center' };

    row.getCell(4).value = doc.canDepartment ? (dDays.length > 0 ? dDays.join(', ') : '-') : '-';
    row.getCell(4).font = { name: 'Arial', size: 9 };
    row.getCell(4).alignment = { horizontal: 'center' };

    const vacationDates = doc.unavailableDates
      .filter(d => { const dt = new Date(d); return dt.getFullYear() === config.year && dt.getMonth() + 1 === config.month; })
      .map(d => new Date(d).getDate());
    row.getCell(5).value = vacationDates.length > 0 ? vacationDates.join(', ') : '';
    row.getCell(5).font = { name: 'Arial', size: 9 };
    row.getCell(5).alignment = { horizontal: 'center' };

    const negali = [];
    if (!doc.canRepublic) negali.push('ne resp.');
    if (!doc.canDepartment) negali.push('ne skyr.');
    if (doc.maxRepublicPerMonth) negali.push(`max ${doc.maxRepublicPerMonth} R`);
    if (doc.allowedWeekdays) {
      const wd = doc.allowedWeekdays.map(d => ['Pr','An','Tr','Kt','Pn','Št','Sk'][d]).join(',');
      negali.push(`tik ${wd}`);
    }
    row.getCell(6).value = negali.join('; ');
    row.getCell(6).font = { name: 'Arial', size: 8 };

    row.getCell(7).value = doc.preferences || '';
    row.getCell(7).font = { name: 'Arial', size: 8 };

    row.getCell(8).value = total;
    row.getCell(8).font = { name: 'Arial', size: 9, bold: true };
    row.getCell(8).alignment = { horizontal: 'center' };

    row.getCell(9).value = weekendCount;
    row.getCell(9).font = { name: 'Arial', size: 9 };
    row.getCell(9).alignment = { horizontal: 'center' };
    if (weekendCount >= 3) row.getCell(9).font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFCC0000' } };

    for (let c = 1; c <= 9; c++) {
      row.getCell(c).border = thinBorder();
      if (!row.getCell(c).alignment) row.getCell(c).alignment = { vertical: 'middle' };
      else row.getCell(c).alignment = { ...row.getCell(c).alignment, vertical: 'middle' };
    }

    // Pažymėti eilutę raudonai jei neturėjo nė vieno budėjimo
    if (total === 0) {
      for (let c = 1; c <= 9; c++) {
        row.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC7CE' } };
      }
    }
  });

  return workbook;
}

// ═══════════════════════════════════════════════════════════════
// Pagrindinis vykdymas
// ═══════════════════════════════════════════════════════════════

console.log('═'.repeat(65));
console.log(' Neurochirurgijos klinikos — grafikų generavimas ir eksportas');
console.log(` Mėnuo: 2026 balandis  |  Serveris: ${BASE_URL}`);
console.log(` Išsaugoma į: ${OUT_DIR}`);
console.log('═'.repeat(65));

await mkdir(OUT_DIR, { recursive: true });

for (const cfg of CONFIGURATIONS) {
  console.log(`\n${'─'.repeat(65)}`);
  console.log(` ${cfg.label}`);
  console.log('─'.repeat(65));

  const doctors = cfg.doctorIds.map(id => DOCTORS[id]);

  // 1. Generuoti grafiką per API
  const t0 = Date.now();
  let schedule;
  try {
    const res = await fetch(`${BASE_URL}/api/schedule/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ doctors, config: MONTH_CONFIG, rules: DEFAULT_RULES, clinicHistory: {} }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    const data = await res.json();
    schedule = data.schedule;
  } catch (err) {
    console.log(`  ❌ API klaida: ${err.message}`);
    continue;
  }

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`  ✅ Grafikas sugeneruotas per ${elapsed}s (${schedule.length} dienų)`);

  // 2. Statistika
  const rCount = {}, dCount = {}, weekendCount = {};
  for (const d of doctors) { rCount[d.id] = 0; dCount[d.id] = 0; weekendCount[d.id] = 0; }
  for (const e of schedule) {
    if (e.republicDoctor && rCount[e.republicDoctor] !== undefined) {
      rCount[e.republicDoctor]++;
      if (e.isWeekend || e.isHoliday) weekendCount[e.republicDoctor]++;
    }
    if (e.departmentDoctor && dCount[e.departmentDoctor] !== undefined) {
      dCount[e.departmentDoctor]++;
      if (e.isWeekend || e.isHoliday) weekendCount[e.departmentDoctor]++;
    }
  }

  const totals = doctors.map(d => rCount[d.id] + dCount[d.id]);
  const min = Math.min(...totals), max = Math.max(...totals);
  const avg = (totals.reduce((a, b) => a + b, 0) / totals.length).toFixed(1);
  console.log(`  Paskirstymas: min ${min} / vid ${avg} / max ${max} budėjimų`);

  // Problemos
  const emptyR = schedule.filter(e => !e.republicDoctor).map(e => e.day);
  const emptyD = schedule.filter(e => !e.departmentDoctor).map(e => e.day);
  if (emptyR.length) console.log(`  ⚠️  Tuščios R dienos: ${emptyR.join(', ')}`);
  if (emptyD.length) console.log(`  ⚠️  Tuščios D dienos: ${emptyD.join(', ')}`);
  if (!emptyR.length && !emptyD.length) console.log('  Taisyklių pažeidimų nerasta ✓');

  // 3. Sukurti Excel
  const workbook = await buildExcel(schedule, doctors, MONTH_CONFIG, cfg.label);
  const outPath = join(OUT_DIR, cfg.filename);
  await workbook.xlsx.writeFile(outPath);
  console.log(`  📄 Išsaugota: ${outPath}`);
}

console.log(`\n${'═'.repeat(65)}`);
console.log(` Visi failai išsaugoti į: ${OUT_DIR}`);
console.log('═'.repeat(65));
