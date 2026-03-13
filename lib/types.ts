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

// Change tracking for doctor analytics
export interface ChangeRecord {
  id: string;
  timestamp: number;
  year: number;
  month: number;
  day: number;
  slot: 'republicDoctor' | 'departmentDoctor' | 'residentDoctor';
  previousDoctorId: string | null;
  newDoctorId: string | null;
  previousDoctorName: string | null;
  newDoctorName: string | null;
  source: 'manual' | 'chat' | 'generate'; // how the change was made
  isWeekend: boolean;
  isHoliday: boolean;
}

// Dynamic scheduling rules
export type RuleType =
  | 'max_weekly_hours'       // Max valandų per savaitę
  | 'min_rest_days'          // Min poilsio dienų tarp budėjimų
  | 'no_polyclinic_same_day' // Negali budėti poliklinikos dieną
  | 'no_polyclinic_prev_day' // Negali budėti prieš poliklinikos dieną
  | 'require_both_slots'     // Kiekviena diena turi turėti R ir D
  | 'respect_unavailable'    // Gerbti negalimas datas
  | 'respect_slot_types'     // Gerbti canRepublic/canDepartment
  | 'respect_monthly_limits' // Gerbti mėnesinius limitus
  | 'balance_distribution'   // Tolygus paskirstymas (warning)
  | 'dept_only_priority'     // Skyriaus-only gydytojai pirmenybė D stulpelyje
  | 'max_weekend_shifts'     // Max savaitgalinių budėjimų per mėnesį
  | 'custom';                // Vartotojo sukurta taisyklė

export interface ScheduleRule {
  id: string;
  name: string;           // LT pavadinimas
  description: string;    // LT aprašymas
  type: RuleType;
  enabled: boolean;
  severity: 'error' | 'warning'; // error = griežta, warning = rekomendacija
  params: Record<string, number | string | boolean>;
  builtIn: boolean;       // ar sisteminė (negalima ištrinti)
}

// Monthly snapshot for historical trends
export interface MonthlySnapshot {
  year: number;
  month: number;
  doctorStats: DoctorStats[];
  generatedAt: number;
  totalChanges: number; // how many manual changes were made after generation
}
