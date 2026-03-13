// Laima — Neurochirurgijos klinikos budėjimų grafiko sistema

export interface PolyclinicSlot {
  weekday: number; // 0=Pirmadienis, 6=Sekmadienis
  startHour: number;
  endHour: number;
}

export interface Doctor {
  id: string;
  name: string;
  canRepublic: boolean;
  canDepartment: boolean;
  maxRepublicPerMonth: number | null;
  maxDepartmentPerMonth: number | null;
  maxTotalPerMonth: number | null;
  polyclinicSchedule: PolyclinicSlot[];
  unavailableDates: string[]; // ISO dates
  preferences: string;
}

export interface MonthConfig {
  year: number;
  month: number; // 1-12
  holidays: number[]; // day numbers that are holidays
  maxWeeklyHours: number; // default 55.5
  shiftDurationHours: number; // default 24
}

export interface ScheduleEntry {
  day: number;
  date: string; // ISO date
  weekday: number; // 0=Pr, 6=Sk
  isWeekend: boolean;
  isHoliday: boolean;
  clinicDoctor: string | null; // column B
  republicDoctor: string | null; // column C
  departmentDoctor: string | null; // column D
  residentDoctor: string | null; // column E (manual)
}

export interface ValidationError {
  type: 'error' | 'warning';
  message: string;
  day?: number;
  doctorId?: string;
}

export interface DoctorStats {
  doctorId: string;
  name: string;
  republicCount: number;
  departmentCount: number;
  totalCount: number;
  weekendCount: number;
  weeklyHours: Record<number, number>; // weekNumber -> hours
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}
