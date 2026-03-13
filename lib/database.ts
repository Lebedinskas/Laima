import { createClient } from './supabase';
import type { Doctor, ScheduleEntry, MonthConfig, ChangeRecord, MonthlySnapshot, ChatMessage, DoctorStats } from './types';

const supabase = createClient();

function getUserId() {
  // Will be set after login
  const session = supabase.auth.getSession();
  return session;
}

// ---- Doctors ----

export async function loadDoctors(userId: string): Promise<Doctor[]> {
  const { data, error } = await supabase
    .from('doctors')
    .select('*')
    .eq('user_id', userId)
    .order('name');

  if (error) throw error;
  return (data || []).map(row => ({
    id: row.id,
    name: row.name,
    canRepublic: row.can_republic,
    canDepartment: row.can_department,
    maxRepublicPerMonth: row.max_republic_per_month,
    maxDepartmentPerMonth: row.max_department_per_month,
    maxTotalPerMonth: row.max_total_per_month,
    polyclinicSchedule: row.polyclinic_schedule as Doctor['polyclinicSchedule'],
    unavailableDates: row.unavailable_dates as string[],
    preferences: row.preferences,
  }));
}

export async function saveDoctors(userId: string, doctors: Doctor[]) {
  // Upsert all doctors
  const rows = doctors.map(d => ({
    id: d.id,
    user_id: userId,
    name: d.name,
    can_republic: d.canRepublic,
    can_department: d.canDepartment,
    max_republic_per_month: d.maxRepublicPerMonth,
    max_department_per_month: d.maxDepartmentPerMonth,
    max_total_per_month: d.maxTotalPerMonth,
    polyclinic_schedule: d.polyclinicSchedule,
    unavailable_dates: d.unavailableDates,
    preferences: d.preferences,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from('doctors')
    .upsert(rows, { onConflict: 'id' });

  if (error) throw error;
}

export async function deleteDoctor(doctorId: string) {
  const { error } = await supabase
    .from('doctors')
    .delete()
    .eq('id', doctorId);

  if (error) throw error;
}

// ---- Month Config ----

export async function loadMonthConfig(userId: string, year: number, month: number): Promise<MonthConfig | null> {
  const { data, error } = await supabase
    .from('month_configs')
    .select('*')
    .eq('user_id', userId)
    .eq('year', year)
    .eq('month', month)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    year: data.year,
    month: data.month,
    holidays: data.holidays as number[],
    maxWeeklyHours: Number(data.max_weekly_hours),
    shiftDurationHours: data.shift_duration_hours,
  };
}

export async function saveMonthConfig(userId: string, config: MonthConfig) {
  const { error } = await supabase
    .from('month_configs')
    .upsert({
      user_id: userId,
      year: config.year,
      month: config.month,
      holidays: config.holidays,
      max_weekly_hours: config.maxWeeklyHours,
      shift_duration_hours: config.shiftDurationHours,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,year,month' });

  if (error) throw error;
}

// ---- Schedule Entries ----

export async function loadSchedule(userId: string, year: number, month: number): Promise<ScheduleEntry[]> {
  const { data, error } = await supabase
    .from('schedule_entries')
    .select('*')
    .eq('user_id', userId)
    .eq('year', year)
    .eq('month', month)
    .order('day');

  if (error) throw error;
  return (data || []).map(row => ({
    day: row.day,
    date: row.date,
    weekday: row.weekday,
    isWeekend: row.is_weekend,
    isHoliday: row.is_holiday,
    clinicDoctor: row.clinic_doctor,
    republicDoctor: row.republic_doctor,
    departmentDoctor: row.department_doctor,
    residentDoctor: row.resident_doctor,
  }));
}

export async function saveSchedule(userId: string, year: number, month: number, schedule: ScheduleEntry[]) {
  // Delete old entries for this month, then insert new
  const { error: delError } = await supabase
    .from('schedule_entries')
    .delete()
    .eq('user_id', userId)
    .eq('year', year)
    .eq('month', month);

  if (delError) throw delError;

  if (schedule.length === 0) return;

  const rows = schedule.map(e => ({
    user_id: userId,
    year,
    month,
    day: e.day,
    date: e.date,
    weekday: e.weekday,
    is_weekend: e.isWeekend,
    is_holiday: e.isHoliday,
    clinic_doctor: e.clinicDoctor,
    republic_doctor: e.republicDoctor,
    department_doctor: e.departmentDoctor,
    resident_doctor: e.residentDoctor,
  }));

  const { error } = await supabase
    .from('schedule_entries')
    .insert(rows);

  if (error) throw error;
}

// ---- Change History ----

export async function loadChangeHistory(userId: string): Promise<ChangeRecord[]> {
  const { data, error } = await supabase
    .from('change_history')
    .select('*')
    .eq('user_id', userId)
    .order('timestamp', { ascending: false })
    .limit(1000);

  if (error) throw error;
  return (data || []).map(row => ({
    id: row.id,
    timestamp: Number(row.timestamp),
    year: row.year,
    month: row.month,
    day: row.day,
    slot: row.slot as ChangeRecord['slot'],
    previousDoctorId: row.previous_doctor_id,
    newDoctorId: row.new_doctor_id,
    previousDoctorName: row.previous_doctor_name,
    newDoctorName: row.new_doctor_name,
    source: row.source as ChangeRecord['source'],
    isWeekend: row.is_weekend,
    isHoliday: row.is_holiday,
  }));
}

export async function saveChangeRecords(userId: string, records: ChangeRecord[]) {
  if (records.length === 0) return;

  const rows = records.map(r => ({
    id: r.id,
    user_id: userId,
    timestamp: r.timestamp,
    year: r.year,
    month: r.month,
    day: r.day,
    slot: r.slot,
    previous_doctor_id: r.previousDoctorId,
    new_doctor_id: r.newDoctorId,
    previous_doctor_name: r.previousDoctorName,
    new_doctor_name: r.newDoctorName,
    source: r.source,
    is_weekend: r.isWeekend,
    is_holiday: r.isHoliday,
  }));

  const { error } = await supabase
    .from('change_history')
    .upsert(rows, { onConflict: 'id' });

  if (error) throw error;
}

// ---- Monthly Snapshots ----

export async function loadSnapshots(userId: string): Promise<MonthlySnapshot[]> {
  const { data, error } = await supabase
    .from('monthly_snapshots')
    .select('*')
    .eq('user_id', userId)
    .order('year')
    .order('month');

  if (error) throw error;
  return (data || []).map(row => ({
    year: row.year,
    month: row.month,
    doctorStats: row.doctor_stats as DoctorStats[],
    generatedAt: Number(row.generated_at),
    totalChanges: row.total_changes,
  }));
}

export async function saveSnapshot(userId: string, snapshot: MonthlySnapshot) {
  const { error } = await supabase
    .from('monthly_snapshots')
    .upsert({
      user_id: userId,
      year: snapshot.year,
      month: snapshot.month,
      doctor_stats: snapshot.doctorStats,
      generated_at: snapshot.generatedAt,
      total_changes: snapshot.totalChanges,
    }, { onConflict: 'user_id,year,month' });

  if (error) throw error;
}

// ---- Chat Messages ----

export async function loadChatMessages(userId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('user_id', userId)
    .order('timestamp')
    .limit(200);

  if (error) throw error;
  return (data || []).map(row => ({
    id: row.id,
    role: row.role as ChatMessage['role'],
    content: row.content,
    timestamp: Number(row.timestamp),
  }));
}

export async function saveChatMessage(userId: string, message: ChatMessage) {
  const { error } = await supabase
    .from('chat_messages')
    .upsert({
      id: message.id,
      user_id: userId,
      role: message.role,
      content: message.content,
      timestamp: message.timestamp,
    }, { onConflict: 'id' });

  if (error) throw error;
}
