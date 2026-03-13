import { Doctor } from '@/lib/types';

export const defaultDoctors: Doctor[] = [
  {
    id: 'tamasauskas-a',
    name: 'Tamašauskas A.',
    canRepublic: true,
    canDepartment: true,
    maxRepublicPerMonth: 3,
    maxDepartmentPerMonth: null,
    maxTotalPerMonth: null,
    polyclinicSchedule: [
      { weekday: 0, startHour: 11, endHour: 13 }, // Pr 11-13
      { weekday: 2, startHour: 9, endHour: 12 },  // Tr 9-12
    ],
    unavailableDates: [],
    preferences: '',
  },
  {
    id: 'vaitkevicius',
    name: 'Vaitkevičius',
    canRepublic: true,
    canDepartment: true,
    maxRepublicPerMonth: 3,
    maxDepartmentPerMonth: null,
    maxTotalPerMonth: null,
    polyclinicSchedule: [
      { weekday: 2, startHour: 12, endHour: 16 }, // Tr 12-16
    ],
    unavailableDates: [],
    preferences: '',
  },
  {
    id: 'tamasauskas-d',
    name: 'Tamašauskas D.',
    canRepublic: true,
    canDepartment: true,
    maxRepublicPerMonth: null,
    maxDepartmentPerMonth: null,
    maxTotalPerMonth: null,
    polyclinicSchedule: [
      { weekday: 1, startHour: 12, endHour: 16 }, // An 12-16
    ],
    unavailableDates: [],
    preferences: '',
  },
  {
    id: 'budenas',
    name: 'Budėnas',
    canRepublic: false,
    canDepartment: true,
    maxRepublicPerMonth: null,
    maxDepartmentPerMonth: null,
    maxTotalPerMonth: null,
    polyclinicSchedule: [
      { weekday: 2, startHour: 12, endHour: 16 }, // Tr 12-16
    ],
    unavailableDates: [],
    preferences: '',
  },
  {
    id: 'deltuva',
    name: 'Deltuva',
    canRepublic: true,
    canDepartment: true,
    maxRepublicPerMonth: 3,
    maxDepartmentPerMonth: null,
    maxTotalPerMonth: null,
    polyclinicSchedule: [
      { weekday: 0, startHour: 12, endHour: 15 }, // Pr 12-15
    ],
    unavailableDates: [],
    preferences: '',
  },
  {
    id: 'simaitis',
    name: 'Simaitis',
    canRepublic: true,
    canDepartment: true,
    maxRepublicPerMonth: null,
    maxDepartmentPerMonth: null,
    maxTotalPerMonth: null,
    polyclinicSchedule: [
      { weekday: 3, startHour: 12, endHour: 16 }, // Kt 12-16
    ],
    unavailableDates: [],
    preferences: '',
  },
  {
    id: 'sliauzys',
    name: 'Šliaužys',
    canRepublic: false,
    canDepartment: true,
    maxRepublicPerMonth: null,
    maxDepartmentPerMonth: null,
    maxTotalPerMonth: null,
    polyclinicSchedule: [
      { weekday: 1, startHour: 13, endHour: 16 }, // An 13-16
      { weekday: 2, startHour: 8, endHour: 12 },  // Tr 8-12
      { weekday: 3, startHour: 9, endHour: 12 },  // Kt 9-12
    ],
    unavailableDates: [],
    preferences: '',
  },
  {
    id: 'bareikis',
    name: 'Bareikis',
    canRepublic: true,
    canDepartment: true,
    maxRepublicPerMonth: null,
    maxDepartmentPerMonth: null,
    maxTotalPerMonth: null,
    polyclinicSchedule: [
      { weekday: 1, startHour: 8, endHour: 13 }, // An 8-13
    ],
    unavailableDates: [],
    preferences: '',
  },
  {
    id: 'cikotas',
    name: 'Čikotas',
    canRepublic: true,
    canDepartment: true,
    maxRepublicPerMonth: null,
    maxDepartmentPerMonth: null,
    maxTotalPerMonth: null,
    polyclinicSchedule: [
      { weekday: 4, startHour: 8, endHour: 12 }, // Pn 8-12
    ],
    unavailableDates: [],
    preferences: '',
  },
  {
    id: 'radziunas',
    name: 'Radžiūnas',
    canRepublic: true,
    canDepartment: true,
    maxRepublicPerMonth: null,
    maxDepartmentPerMonth: null,
    maxTotalPerMonth: null,
    polyclinicSchedule: [
      { weekday: 0, startHour: 12, endHour: 16 }, // Pr 12-16
    ],
    unavailableDates: [],
    preferences: '',
  },
  {
    id: 'tamasauskas-s',
    name: 'Tamašauskas Š.',
    canRepublic: true,
    canDepartment: true,
    maxRepublicPerMonth: null,
    maxDepartmentPerMonth: null,
    maxTotalPerMonth: null,
    polyclinicSchedule: [
      { weekday: 3, startHour: 12, endHour: 16 }, // Kt 12-16
    ],
    unavailableDates: [],
    preferences: '',
  },
  {
    id: 'vaisvilas',
    name: 'Vaišvilas',
    canRepublic: true,
    canDepartment: true,
    maxRepublicPerMonth: null,
    maxDepartmentPerMonth: null,
    maxTotalPerMonth: null,
    polyclinicSchedule: [
      { weekday: 1, startHour: 8, endHour: 12 }, // An 8-12
    ],
    unavailableDates: [],
    preferences: '',
  },
  {
    id: 'fedaravicius',
    name: 'Fedaravičius',
    canRepublic: false,
    canDepartment: true,
    maxRepublicPerMonth: null,
    maxDepartmentPerMonth: null,
    maxTotalPerMonth: null,
    polyclinicSchedule: [
      { weekday: 4, startHour: 12, endHour: 16 }, // Pn 12-16
    ],
    unavailableDates: [],
    preferences: '',
  },
  {
    id: 'urbonas',
    name: 'Urbonas',
    canRepublic: true,
    canDepartment: true,
    maxRepublicPerMonth: 3,
    maxDepartmentPerMonth: null,
    maxTotalPerMonth: null,
    polyclinicSchedule: [
      { weekday: 0, startHour: 9, endHour: 12 },  // Pr 9-12
      { weekday: 3, startHour: 8, endHour: 12 },  // Kt 8-12
    ],
    unavailableDates: [],
    preferences: '',
  },
  {
    id: 'piliponis',
    name: 'Piliponis',
    canRepublic: false,
    canDepartment: true,
    maxRepublicPerMonth: null,
    maxDepartmentPerMonth: null,
    maxTotalPerMonth: null,
    polyclinicSchedule: [
      { weekday: 4, startHour: 8, endHour: 12 }, // Pn 8-12
    ],
    unavailableDates: [],
    preferences: '',
  },
];
