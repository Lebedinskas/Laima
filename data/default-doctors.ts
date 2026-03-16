import { Doctor } from '@/lib/types';

// ============================================================
// Neurochirurgijos klinikos gydytojai
// Šaltinis: Mamos instrukcijos + 2025-12 – 2026-04 PDF grafikai
// ============================================================

export const defaultDoctors: Doctor[] = [

  // ── TIKI RESPUBLIKA (canRepublic, !canDepartment) ─────────

  {
    id: 'tamasauskas-a',
    name: 'Tamašauskas A.',
    role: 'doctor',
    canRepublic: true,
    canDepartment: false,
    maxRepublicPerMonth: 3,
    maxDepartmentPerMonth: null,
    maxTotalPerMonth: null,
    // Gali budėti TIK ketvirtadieniais (taisyklė 7)
    allowedWeekdays: [3],
    polyclinicSchedule: [
      { weekday: 0, startHour: 11, endHour: 13 }, // Pr 11–13
    ],
    unavailableDates: [],
    preferences: 'Budi tik ketvirtadieniais, max 3k/mėn.',
  },

  {
    id: 'vilcinis',
    name: 'Vilcinis',
    role: 'doctor',
    canRepublic: true,
    canDepartment: false,
    maxRepublicPerMonth: null,
    maxDepartmentPerMonth: null,
    maxTotalPerMonth: null,
    allowedWeekdays: null,
    polyclinicSchedule: [
      { weekday: 2, startHour: 9, endHour: 12 }, // Tr 9–12
    ],
    unavailableDates: [],
    preferences: '',
  },

  {
    id: 'ambrozaitis',
    name: 'Ambrozaitis',
    role: 'doctor',
    canRepublic: true,
    canDepartment: false,
    maxRepublicPerMonth: null,
    maxDepartmentPerMonth: null,
    maxTotalPerMonth: null,
    allowedWeekdays: null,
    polyclinicSchedule: [
      { weekday: 0, startHour: 8, endHour: 12 }, // Pr 8–12
    ],
    unavailableDates: [],
    preferences: '',
  },

  {
    id: 'vaitkevicius',
    name: 'Vaitkevičius',
    role: 'doctor',
    canRepublic: true,
    canDepartment: false,
    maxRepublicPerMonth: 3,
    maxDepartmentPerMonth: null,
    maxTotalPerMonth: null,
    allowedWeekdays: null,
    polyclinicSchedule: [
      { weekday: 2, startHour: 12, endHour: 16 }, // Tr 12–16
    ],
    unavailableDates: [],
    preferences: 'Max 3k/mėn.',
  },

  {
    id: 'deltuva',
    name: 'Deltuva',
    role: 'doctor',
    canRepublic: true,
    canDepartment: false,
    maxRepublicPerMonth: 3,
    maxDepartmentPerMonth: null,
    maxTotalPerMonth: null,
    // Gali budėti TIK antradieniais–trečiadieniais (taisyklė 8)
    allowedWeekdays: [1, 2],
    polyclinicSchedule: [
      { weekday: 0, startHour: 12, endHour: 15 }, // Pr 12–15
    ],
    unavailableDates: [],
    preferences: 'Budi tik antr–treč, max 3k/mėn.',
  },

  {
    id: 'urbonas',
    name: 'Urbonas',
    role: 'doctor',
    canRepublic: true,
    canDepartment: false,
    maxRepublicPerMonth: 3,
    maxDepartmentPerMonth: null,
    maxTotalPerMonth: null,
    allowedWeekdays: null,
    polyclinicSchedule: [
      { weekday: 0, startHour: 9, endHour: 12 }, // Pr 9–12
      { weekday: 3, startHour: 8, endHour: 12 }, // Kt 8–12
    ],
    unavailableDates: [],
    preferences: 'Max 3k/mėn.',
  },

  {
    id: 'matukevičius',
    name: 'Matukevičius',

    role: 'doctor',
    canRepublic: true,
    canDepartment: false,
    maxRepublicPerMonth: null,
    maxDepartmentPerMonth: null,
    maxTotalPerMonth: null,
    allowedWeekdays: null,
    polyclinicSchedule: [
      { weekday: 0, startHour: 9, endHour: 12 }, // Pr 9–12
    ],
    unavailableDates: [],
    preferences: '',
  },

  // ── TIKI SKYRIUS (canDepartment, !canRepublic) ────────────

  {
    id: 'tamasauskas-s',
    name: 'Tamašauskas Š.',
    role: 'doctor',
    canRepublic: false,
    canDepartment: true,
    maxRepublicPerMonth: null,
    maxDepartmentPerMonth: null,
    maxTotalPerMonth: null,
    // Negali budėti penktadieniais
    allowedWeekdays: [0, 1, 2, 3, 5, 6],
    polyclinicSchedule: [
      { weekday: 3, startHour: 12, endHour: 16 }, // Kt 12–16
    ],
    unavailableDates: [],
    preferences: 'Negali penktadieniais.',
  },

  {
    id: 'tamasauskas-d',
    name: 'Tamašauskas D.',
    role: 'doctor',
    canRepublic: false,
    canDepartment: true,
    maxRepublicPerMonth: null,
    maxDepartmentPerMonth: null,
    maxTotalPerMonth: null,
    allowedWeekdays: null,
    polyclinicSchedule: [
      { weekday: 1, startHour: 12, endHour: 16 }, // An 12–16
    ],
    unavailableDates: [],
    preferences: '',
  },

  {
    id: 'vaisvilas',
    name: 'Vaišvilas',
    role: 'doctor',
    canRepublic: false,
    canDepartment: true,
    maxRepublicPerMonth: null,
    maxDepartmentPerMonth: null,
    maxTotalPerMonth: null,
    allowedWeekdays: null,
    polyclinicSchedule: [
      { weekday: 1, startHour: 8, endHour: 12 }, // An 8–12
    ],
    unavailableDates: [],
    preferences: '',
  },

  {
    id: 'fedaravicius',
    name: 'Fedaravičius',
    role: 'doctor',
    canRepublic: false,
    canDepartment: true,
    maxRepublicPerMonth: null,
    maxDepartmentPerMonth: null,
    maxTotalPerMonth: null,
    allowedWeekdays: null,
    polyclinicSchedule: [
      { weekday: 4, startHour: 12, endHour: 16 }, // Pn 12–16
    ],
    unavailableDates: [],
    preferences: '',
  },

  {
    id: 'piliponis',
    name: 'Piliponis',
    role: 'doctor',
    canRepublic: false,
    canDepartment: true,
    maxRepublicPerMonth: null,
    maxDepartmentPerMonth: null,
    maxTotalPerMonth: null,
    allowedWeekdays: null,
    polyclinicSchedule: [
      { weekday: 4, startHour: 8, endHour: 12 }, // Pn 8–12
    ],
    unavailableDates: [],
    preferences: '',
  },

  {
    id: 'budenas',
    name: 'Budėnas',
    role: 'doctor',
    canRepublic: false,
    canDepartment: true,
    maxRepublicPerMonth: null,
    maxDepartmentPerMonth: null,
    maxTotalPerMonth: null,
    allowedWeekdays: null,
    polyclinicSchedule: [
      { weekday: 2, startHour: 12, endHour: 16 }, // Tr 12–16
    ],
    unavailableDates: [],
    preferences: '',
  },

  {
    id: 'bareikis',
    name: 'Bareikis',
    role: 'doctor',
    canRepublic: false,
    canDepartment: true,
    maxRepublicPerMonth: null,
    maxDepartmentPerMonth: null,
    maxTotalPerMonth: null,
    allowedWeekdays: null,
    polyclinicSchedule: [
      { weekday: 1, startHour: 8, endHour: 13 }, // An 8–13
    ],
    unavailableDates: [],
    preferences: '',
  },

  {
    id: 'simaitis',
    name: 'Simaitis',
    role: 'doctor',
    canRepublic: false,
    canDepartment: true,
    maxRepublicPerMonth: null,
    maxDepartmentPerMonth: null,
    maxTotalPerMonth: null,
    allowedWeekdays: null,
    polyclinicSchedule: [
      { weekday: 3, startHour: 12, endHour: 16 }, // Kt 12–16
    ],
    unavailableDates: [],
    preferences: '',
  },

  {
    id: 'sliauzys',
    name: 'Šliaužys',
    role: 'doctor',
    canRepublic: false,
    canDepartment: true,
    maxRepublicPerMonth: null,
    maxDepartmentPerMonth: null,
    maxTotalPerMonth: null,
    allowedWeekdays: null,
    polyclinicSchedule: [
      { weekday: 2, startHour: 8, endHour: 12 }, // Tr 8–12
    ],
    unavailableDates: [],
    preferences: '',
  },

  // ── ABU STULPELIAI (canRepublic + canDepartment) ──────────

  {
    id: 'kalasauskas',
    name: 'Kalasauskas',
    role: 'doctor',
    canRepublic: true,
    canDepartment: true,
    maxRepublicPerMonth: null,
    maxDepartmentPerMonth: null,
    maxTotalPerMonth: null,
    allowedWeekdays: null,
    polyclinicSchedule: [
      { weekday: 2, startHour: 8, endHour: 10 }, // Tr 8–10
    ],
    unavailableDates: [],
    preferences: 'Geidžiama po vienodą R ir D.',
  },

  {
    id: 'radziunas',
    name: 'Radžiūnas',
    role: 'doctor',
    canRepublic: true,
    canDepartment: true,
    maxRepublicPerMonth: null,
    maxDepartmentPerMonth: null,
    maxTotalPerMonth: null,
    allowedWeekdays: null,
    polyclinicSchedule: [
      { weekday: 0, startHour: 12, endHour: 16 }, // Pr 12–16
    ],
    unavailableDates: [],
    preferences: 'Geidžiama po vienodą R ir D.',
  },

  {
    id: 'marcinkevičius',
    name: 'Marcinkevičius',
    role: 'doctor',
    canRepublic: true,
    canDepartment: true,
    maxRepublicPerMonth: null,
    maxDepartmentPerMonth: null,
    maxTotalPerMonth: null,
    allowedWeekdays: null,
    polyclinicSchedule: [
      { weekday: 3, startHour: 9, endHour: 12 }, // Kt 9–12
    ],
    unavailableDates: [],
    preferences: 'Geidžiama po vienodą R ir D.',
  },

  {
    id: 'bernotas',
    name: 'Bernotas',
    role: 'doctor',
    canRepublic: true,
    canDepartment: true,
    maxRepublicPerMonth: null,
    maxDepartmentPerMonth: null,
    maxTotalPerMonth: null,
    allowedWeekdays: null,
    polyclinicSchedule: [
      { weekday: 2, startHour: 10, endHour: 12 }, // Tr 10–12
    ],
    unavailableDates: [],
    preferences: 'Geidžiama po vienodą R ir D.',
  },

  {
    id: 'sinkūnas',
    name: 'Šinkūnas',
    role: 'doctor',
    canRepublic: true,
    canDepartment: true,
    maxRepublicPerMonth: null,
    maxDepartmentPerMonth: null,
    maxTotalPerMonth: null,
    allowedWeekdays: null,
    polyclinicSchedule: [
      { weekday: 1, startHour: 13, endHour: 16 }, // An 13–16
    ],
    unavailableDates: [],
    preferences: 'Geidžiama po vienodą R ir D.',
  },

  {
    id: 'cikotas',
    name: 'Čikotas',
    role: 'doctor',
    canRepublic: true,
    canDepartment: true,
    maxRepublicPerMonth: null,
    maxDepartmentPerMonth: null,
    maxTotalPerMonth: null,
    // Negali budėti pirmadieniais
    allowedWeekdays: [1, 2, 3, 4, 5, 6],
    polyclinicSchedule: [
      { weekday: 4, startHour: 8, endHour: 12 }, // Pn 8–12
    ],
    unavailableDates: [],
    preferences: 'Negali pirmadieniais. Geidžiama po vienodą R ir D.',
  },

  // ── REZIDENTAI ────────────────────────────────────────────
  // Budi darbo dienomis 16–8, savaitgaliais/šventėmis 8–8.
  // Kartais budi po du tą pačią dieną (residentDoctor lauke saugoma "Vardas1, Vardas2").

  {
    id: 'juskytas',
    name: 'Juškys',
    role: 'resident',
    canRepublic: false,
    canDepartment: false,
    maxRepublicPerMonth: null,
    maxDepartmentPerMonth: null,
    maxTotalPerMonth: null,
    allowedWeekdays: null,
    polyclinicSchedule: [],
    unavailableDates: [],
    preferences: '',
  },

  {
    id: 'gustaitiene',
    name: 'Gustaitienė',
    role: 'resident',
    canRepublic: false,
    canDepartment: false,
    maxRepublicPerMonth: null,
    maxDepartmentPerMonth: null,
    maxTotalPerMonth: null,
    allowedWeekdays: null,
    polyclinicSchedule: [],
    unavailableDates: [],
    preferences: '',
  },

  {
    id: 'reimoris',
    name: 'Reimoris',
    role: 'resident',
    canRepublic: false,
    canDepartment: false,
    maxRepublicPerMonth: null,
    maxDepartmentPerMonth: null,
    maxTotalPerMonth: null,
    allowedWeekdays: null,
    polyclinicSchedule: [],
    unavailableDates: [],
    preferences: '',
  },

  {
    id: 'jakstas',
    name: 'Jakštas',
    role: 'resident',
    canRepublic: false,
    canDepartment: false,
    maxRepublicPerMonth: null,
    maxDepartmentPerMonth: null,
    maxTotalPerMonth: null,
    allowedWeekdays: null,
    polyclinicSchedule: [],
    unavailableDates: [],
    preferences: '',
  },

  {
    id: 'davainis',
    name: 'Davainis',
    role: 'resident',
    canRepublic: false,
    canDepartment: false,
    maxRepublicPerMonth: null,
    maxDepartmentPerMonth: null,
    maxTotalPerMonth: null,
    allowedWeekdays: null,
    polyclinicSchedule: [],
    unavailableDates: [],
    preferences: '',
  },

  {
    id: 'maslianikas',
    name: 'Maslianikas',
    role: 'resident',
    canRepublic: false,
    canDepartment: false,
    maxRepublicPerMonth: null,
    maxDepartmentPerMonth: null,
    maxTotalPerMonth: null,
    allowedWeekdays: null,
    polyclinicSchedule: [],
    unavailableDates: [],
    preferences: '',
  },
];
