import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Doctor, MonthConfig, ScheduleEntry, ValidationError, ChatMessage, DoctorStats, ChangeRecord, MonthlySnapshot, ScheduleRule } from '@/lib/types';
import { generateSchedule, generateScheduleAsync } from '@/lib/scheduler';
import { validateSchedule, calculateStats } from '@/lib/validator';

// Server-side ILP generation via API route — precise algorithm, no browser limits.
// Falls back to client-side greedy if server unreachable.
async function generateViaServer(
  doctors: Doctor[],
  config: MonthConfig,
  rules: ScheduleRule[],
  clinicHistory: Record<string, number>,
): Promise<{ schedule: ScheduleEntry[]; usedFallback: boolean }> {
  try {
    const res = await fetch('/api/schedule/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ doctors, config, rules, clinicHistory }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { schedule } = await res.json();
    return { schedule: schedule as ScheduleEntry[], usedFallback: false };
  } catch (err) {
    console.warn('Server ILP unavailable, falling back to greedy:', err);
    const schedule = await generateScheduleAsync(doctors, config, rules, clinicHistory);
    return { schedule, usedFallback: true };
  }
}
import { swapDoctor } from '@/lib/operations';
import { defaultDoctors } from '@/data/default-doctors';
import { defaultRules } from '@/lib/default-rules';
import { getHolidaysForMonth } from '@/lib/constants';

interface ScheduleStore {
  // Data
  doctors: Doctor[];
  schedule: ScheduleEntry[];
  config: MonthConfig;
  errors: ValidationError[];
  stats: DoctorStats[];
  chatMessages: ChatMessage[];       // current session chat (cleared on login)
  chatArchive: ChatMessage[];        // full history across sessions
  undoStack: ScheduleEntry[][];
  redoStack: ScheduleEntry[][];
  changeHistory: ChangeRecord[];
  monthlySnapshots: MonthlySnapshot[];
  scheduleCache: Record<string, ScheduleEntry[]>; // "year-month" -> entries
  yearGenerated: boolean; // whether year-ahead generation is active
  rules: ScheduleRule[]; // dynamic scheduling rules

  // Actions
  setDoctors: (doctors: Doctor[]) => void;
  updateDoctor: (id: string, updates: Partial<Doctor>) => void;
  addDoctor: (doctor: Doctor) => void;
  removeDoctor: (id: string) => void;
  setConfig: (config: MonthConfig) => void;
  generate: () => void;
  generateYear: () => void;
  generatePeriod: (monthCount: number) => void;
  switchMonth: (year: number, month: number) => void;
  assignDoctor: (day: number, slot: 'republicDoctor' | 'departmentDoctor' | 'residentDoctor', doctorId: string | null, source?: 'manual' | 'chat') => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  addChatMessage: (message: ChatMessage) => void;
  clearChatSession: () => void;
  setSchedule: (schedule: ScheduleEntry[]) => void;
  setRules: (rules: ScheduleRule[]) => void;
  updateRule: (id: string, updates: Partial<ScheduleRule>) => void;
  addRule: (rule: ScheduleRule) => void;
  removeRule: (id: string) => void;
  resetRules: () => void;
}

const now = new Date();
const defaultConfig: MonthConfig = {
  year: now.getFullYear(),
  month: now.getMonth() + 1,
  holidays: [],
  maxWeeklyHours: 55.5,
  shiftDurationHours: 24,
};

function createChangeId(): string {
  return `ch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Apskaičiuoja kiek kartų mama rankiniu būdu pasirinko kiekvieną gydytoją klinikos stulpeliui.
 * Naudojama mokymosi mechanizme — labiau pageidaujami gydytojai gauna prioritetą generuojant.
 */
function buildClinicHistory(changeHistory: ChangeRecord[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const r of changeHistory) {
    if (r.slot === 'clinicDoctor' && r.source === 'manual' && r.newDoctorId) {
      counts[r.newDoctorId] = (counts[r.newDoctorId] || 0) + 1;
    }
  }
  return counts;
}

function monthKey(year: number, month: number): string {
  return `${year}-${month}`;
}

function getConfigForMonth(baseConfig: MonthConfig, year: number, month: number): MonthConfig {
  const holidays = getHolidaysForMonth(year, month).map(h => h.day);
  return {
    ...baseConfig,
    year,
    month,
    holidays,
  };
}

/** Get next month (year, month) */
function nextMonth(year: number, month: number): { year: number; month: number } {
  return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
}

/** Check if (y1,m1) is before (y2,m2) */
function isBefore(y1: number, m1: number, y2: number, m2: number): boolean {
  return y1 * 12 + m1 < y2 * 12 + m2;
}

function createGenRecords(schedule: ScheduleEntry[], doctors: Doctor[], config: MonthConfig): ChangeRecord[] {
  return schedule.flatMap(entry => {
    const records: ChangeRecord[] = [];
    if (entry.republicDoctor) {
      const doc = doctors.find(d => d.id === entry.republicDoctor);
      records.push({
        id: createChangeId(),
        timestamp: Date.now(),
        year: config.year,
        month: config.month,
        day: entry.day,
        slot: 'republicDoctor',
        previousDoctorId: null,
        newDoctorId: entry.republicDoctor,
        previousDoctorName: null,
        newDoctorName: doc?.name || null,
        source: 'generate',
        isWeekend: entry.isWeekend,
        isHoliday: entry.isHoliday,
      });
    }
    if (entry.departmentDoctor) {
      const doc = doctors.find(d => d.id === entry.departmentDoctor);
      records.push({
        id: createChangeId(),
        timestamp: Date.now(),
        year: config.year,
        month: config.month,
        day: entry.day,
        slot: 'departmentDoctor',
        previousDoctorId: null,
        newDoctorId: entry.departmentDoctor,
        previousDoctorName: null,
        newDoctorName: doc?.name || null,
        source: 'generate',
        isWeekend: entry.isWeekend,
        isHoliday: entry.isHoliday,
      });
    }
    return records;
  });
}

export const useScheduleStore = create<ScheduleStore>()(
  persist(
    (set, get) => ({
      doctors: defaultDoctors,
      schedule: [],
      config: defaultConfig,
      errors: [],
      stats: [],
      chatMessages: [],
      chatArchive: [],
      undoStack: [],
      redoStack: [],
      changeHistory: [],
      monthlySnapshots: [],
      scheduleCache: {},
      yearGenerated: false,
      rules: defaultRules,

      setDoctors: (doctors) => set({ doctors }),

      updateDoctor: (id, updates) => {
        const doctors = get().doctors.map(d =>
          d.id === id ? { ...d, ...updates } : d
        );
        set({ doctors });
      },

      addDoctor: (doctor) => {
        set({ doctors: [...get().doctors, doctor] });
      },

      removeDoctor: (id) => {
        set({ doctors: get().doctors.filter(d => d.id !== id) });
      },

      setConfig: (config) => set({ config }),

      generate: () => {
        const { doctors, config, changeHistory, scheduleCache, rules } = get();

        // Use async ILP solver, update state when done
        generateViaServer(doctors, config, rules, buildClinicHistory(changeHistory)).then(({ schedule, usedFallback }) => {
          const currentState = get();
          // Check config hasn't changed while solving
          if (currentState.config.year !== config.year || currentState.config.month !== config.month) return;

          if (usedFallback) {
            console.warn('⚠️ Grafikas sugeneruotas atsarginiu algoritmu (greedy) — serveris nepasiekiamas');
          }

          const errors = validateSchedule(schedule, doctors, config, rules);
          const stats = calculateStats(schedule, doctors, config);

          const snapshot: MonthlySnapshot = {
            year: config.year,
            month: config.month,
            doctorStats: stats,
            generatedAt: Date.now(),
            totalChanges: 0,
          };

          const genRecords = createGenRecords(schedule, doctors, config);

          const otherHistory = changeHistory.filter(
            r => !(r.year === config.year && r.month === config.month)
          );
          const otherSnapshots = currentState.monthlySnapshots.filter(
            s => !(s.year === config.year && s.month === config.month)
          );

          const key = monthKey(config.year, config.month);
          // Single-month generation: only keep this month in cache
          const newCache = { [key]: schedule };

          set({
            schedule,
            errors,
            stats,
            undoStack: [],
            redoStack: [],
            changeHistory: [...otherHistory, ...genRecords],
            monthlySnapshots: [...otherSnapshots, snapshot],
            scheduleCache: newCache,
            yearGenerated: false,
          });
        });
      },

      generateYear: () => {
        get().generatePeriod(12);
      },

      generatePeriod: (monthCount: number) => {
        const { doctors, config, changeHistory: existingHistory, rules } = get();

        // Build list of months to generate
        const months: { year: number; month: number; config: MonthConfig }[] = [];
        let y = config.year;
        let m = config.month;
        for (let i = 0; i < monthCount; i++) {
          const monthConfig = getConfigForMonth(config, y, m);
          months.push({ year: y, month: m, config: monthConfig });
          const next = nextMonth(y, m);
          y = next.year;
          m = next.month;
        }

        // Run all months in sequence (ILP async)
        (async () => {
          const newCache: Record<string, ScheduleEntry[]> = {};
          const allSnapshots: MonthlySnapshot[] = [];
          let allGenRecords: ChangeRecord[] = [];

          let anyFallback = false;
          for (const mo of months) {
            const { schedule, usedFallback } = await generateViaServer(doctors, mo.config, rules, buildClinicHistory(existingHistory));
            if (usedFallback) anyFallback = true;
            const stats = calculateStats(schedule, doctors, mo.config);

            newCache[monthKey(mo.year, mo.month)] = schedule;
            allSnapshots.push({
              year: mo.year,
              month: mo.month,
              doctorStats: stats,
              generatedAt: Date.now(),
              totalChanges: 0,
            });
            allGenRecords = [...allGenRecords, ...createGenRecords(schedule, doctors, mo.config)];
          }

          // Current month's schedule
          const currentKey = monthKey(config.year, config.month);
          const currentSchedule = newCache[currentKey] || [];
          const currentConfig = getConfigForMonth(config, config.year, config.month);
          const errors = validateSchedule(currentSchedule, doctors, currentConfig, rules);
          const stats = calculateStats(currentSchedule, doctors, currentConfig);

          // Remove old history for generated months, keep unrelated
          const generatedMonths = new Set(Object.keys(newCache));
          const keptHistory = existingHistory.filter(
            r => !generatedMonths.has(monthKey(r.year, r.month))
          );

          if (anyFallback) {
            console.warn('⚠️ Kai kurie mėnesiai sugeneruoti atsarginiu algoritmu (greedy) — serveris buvo nepasiekiamas');
          }

          set({
            schedule: currentSchedule,
            config: currentConfig,
            errors,
            stats,
            undoStack: [],
            redoStack: [],
            scheduleCache: newCache,
            changeHistory: [...keptHistory, ...allGenRecords],
            monthlySnapshots: allSnapshots,
            yearGenerated: monthCount >= 12,
          });
        })();
      },

      switchMonth: (year, month) => {
        const { config, schedule, scheduleCache, doctors, rules } = get();

        // Save current month to cache
        const currentKey = monthKey(config.year, config.month);
        const updatedCache = { ...scheduleCache, [currentKey]: schedule };

        // Load target month from cache
        const targetKey = monthKey(year, month);
        const targetSchedule = updatedCache[targetKey] || [];
        const targetConfig = getConfigForMonth(config, year, month);
        const errors = validateSchedule(targetSchedule, doctors, targetConfig, rules);
        const stats = calculateStats(targetSchedule, doctors, targetConfig);

        set({
          config: targetConfig,
          schedule: targetSchedule,
          errors,
          stats,
          undoStack: [],
          redoStack: [],
          scheduleCache: updatedCache,
        });
      },

      assignDoctor: (day, slot, doctorId, source = 'manual') => {
        const { schedule, doctors, config, undoStack, changeHistory, monthlySnapshots, yearGenerated, scheduleCache, rules } = get();

        const entry = schedule.find(e => e.day === day);
        const previousId = entry ? entry[slot] : null;
        const previousDoc = previousId ? doctors.find(d => d.id === previousId) : null;
        const newDoc = doctorId ? doctors.find(d => d.id === doctorId) : null;

        const result = swapDoctor(schedule, doctors, config, day, slot, doctorId);
        if (result) {
          const newStats = calculateStats(result.schedule, doctors, config);

          const record: ChangeRecord = {
            id: createChangeId(),
            timestamp: Date.now(),
            year: config.year,
            month: config.month,
            day,
            slot,
            previousDoctorId: previousId,
            newDoctorId: doctorId,
            previousDoctorName: previousDoc?.name || null,
            newDoctorName: newDoc?.name || null,
            source,
            isWeekend: entry?.isWeekend || false,
            isHoliday: entry?.isHoliday || false,
          };

          const updatedSnapshots = monthlySnapshots.map(s =>
            s.year === config.year && s.month === config.month
              ? { ...s, totalChanges: s.totalChanges + 1 }
              : s
          );

          // Save current to cache
          const currentKey = monthKey(config.year, config.month);
          let newCache = { ...scheduleCache, [currentKey]: result.schedule };

          // If year is generated, regenerate all future months
          let newHistory = [...changeHistory, record];
          let newSnaps = updatedSnapshots;

          if (yearGenerated) {
            let y = config.year;
            let m = config.month;
            const next = nextMonth(y, m);
            y = next.year;
            m = next.month;

            // Find the last month in cache
            const cacheKeys = Object.keys(newCache);
            const lastCached = cacheKeys
              .map(k => { const [cy, cm] = k.split('-').map(Number); return { year: cy, month: cm }; })
              .sort((a, b) => (b.year * 12 + b.month) - (a.year * 12 + a.month))[0];

            if (lastCached) {
              while (!isBefore(lastCached.year, lastCached.month, y, m)) {
                const futureConfig = getConfigForMonth(config, y, m);
                const futureSchedule = generateSchedule(doctors, futureConfig, rules);
                const futureStats = calculateStats(futureSchedule, doctors, futureConfig);
                const futureKey = monthKey(y, m);

                newCache[futureKey] = futureSchedule;

                // Update snapshot
                newSnaps = newSnaps.filter(s => !(s.year === y && s.month === m));
                newSnaps.push({
                  year: y,
                  month: m,
                  doctorStats: futureStats,
                  generatedAt: Date.now(),
                  totalChanges: 0,
                });

                // Replace gen records for this month
                newHistory = newHistory.filter(r => !(r.year === y && r.month === m && r.source === 'generate'));
                newHistory = [...newHistory, ...createGenRecords(futureSchedule, doctors, futureConfig)];

                const n = nextMonth(y, m);
                y = n.year;
                m = n.month;
              }
            }
          }

          set({
            schedule: result.schedule,
            errors: result.errors,
            stats: newStats,
            undoStack: [...undoStack, schedule],
            redoStack: [], // new action clears redo
            changeHistory: newHistory,
            monthlySnapshots: newSnaps,
            scheduleCache: newCache,
          });
        }
      },

      undo: () => {
        const { undoStack, redoStack, schedule, doctors, config, rules } = get();
        if (undoStack.length === 0) return;
        const previousSchedule = undoStack[undoStack.length - 1];
        const errors = validateSchedule(previousSchedule, doctors, config, rules);
        const stats = calculateStats(previousSchedule, doctors, config);
        set({
          schedule: previousSchedule,
          errors,
          stats,
          undoStack: undoStack.slice(0, -1),
          redoStack: [...redoStack, schedule],
        });
      },

      redo: () => {
        const { redoStack, undoStack, schedule, doctors, config, rules } = get();
        if (redoStack.length === 0) return;
        const nextSchedule = redoStack[redoStack.length - 1];
        const errors = validateSchedule(nextSchedule, doctors, config, rules);
        const stats = calculateStats(nextSchedule, doctors, config);
        set({
          schedule: nextSchedule,
          errors,
          stats,
          undoStack: [...undoStack, schedule],
          redoStack: redoStack.slice(0, -1),
        });
      },

      canUndo: () => get().undoStack.length > 0,
      canRedo: () => get().redoStack.length > 0,

      addChatMessage: (message) => {
        set({
          chatMessages: [...get().chatMessages, message],
          chatArchive: [...get().chatArchive, message],
        });
      },

      clearChatSession: () => {
        set({ chatMessages: [] });
      },

      setSchedule: (schedule) => {
        const { doctors, config, undoStack, rules } = get();
        const currentSchedule = get().schedule;
        const errors = validateSchedule(schedule, doctors, config, rules);
        const stats = calculateStats(schedule, doctors, config);
        set({
          schedule,
          errors,
          stats,
          undoStack: currentSchedule.length > 0 ? [...undoStack, currentSchedule] : undoStack,
          redoStack: [],
        });
      },

      setRules: (rules) => set({ rules }),

      updateRule: (id, updates) => {
        const rules = get().rules.map(r =>
          r.id === id ? { ...r, ...updates } : r
        );
        set({ rules });
      },

      addRule: (rule) => {
        set({ rules: [...get().rules, rule] });
      },

      removeRule: (id) => {
        set({ rules: get().rules.filter(r => r.id !== id) });
      },

      resetRules: () => {
        const { schedule, doctors, config } = get();
        const rules = [...defaultRules];
        const errors = schedule.length > 0 ? validateSchedule(schedule, doctors, config, rules) : [];
        const stats = schedule.length > 0 ? calculateStats(schedule, doctors, config) : [];
        set({ rules, errors, stats });
      },
    }),
    {
      name: 'laima-schedule-store',
      partialize: (state) => ({
        doctors: state.doctors,
        schedule: state.schedule,
        config: state.config,
        // chatMessages NOT persisted — each session starts with clean chat
        chatArchive: state.chatArchive,
        changeHistory: state.changeHistory,
        monthlySnapshots: state.monthlySnapshots,
        scheduleCache: state.scheduleCache,
        yearGenerated: state.yearGenerated,
        rules: state.rules,
        // Note: undoStack/redoStack intentionally NOT persisted — session-only
      }),
      version: 5,
      migrate: (persisted: unknown) => {
        const state = persisted as Record<string, unknown>;
        // v1→v2: Remove chatMessages from old localStorage entries
        const { chatMessages: _, ...rest } = state;
        // v2→v3: Update balance threshold + add max_weekend_shifts rule
        if (Array.isArray(rest.rules)) {
          const rules = rest.rules as ScheduleRule[];
          const balance = rules.find(r => r.id === 'balance_distribution');
          if (balance && balance.params.threshold === 1.5) {
            balance.params.threshold = 2.5;
          }
          if (!rules.find(r => r.id === 'max_weekend_shifts')) {
            rules.push({
              id: 'max_weekend_shifts',
              name: 'Max savaitgalio budėjimų',
              description: 'Maksimalus savaitgalio/švenčių budėjimų skaičius vienam gydytojui per mėnesį',
              type: 'max_weekend_shifts',
              enabled: true,
              severity: 'warning',
              params: { maxShifts: 4 },
              builtIn: true,
            });
          }
        }
        // v3→v4: Add role field to doctors
        // v4→v5: Add allowedWeekdays field (null = nėra apribojimų)
        if (Array.isArray(rest.doctors)) {
          for (const doc of rest.doctors as Record<string, unknown>[]) {
            if (!doc.role) doc.role = 'doctor';
            if (doc.allowedWeekdays === undefined) doc.allowedWeekdays = null;
          }
        }
        return rest;
      },
      merge: (persisted, current) => ({
        ...current,
        ...(persisted as Partial<typeof current>),
        // Always start with empty chat — ignore any old persisted chatMessages
        chatMessages: [],
      }),
      onRehydrateStorage: () => (state) => {
        // Recalculate non-persisted derived state (errors, stats) after hydration
        if (state && state.schedule.length > 0) {
          const errors = validateSchedule(state.schedule, state.doctors, state.config, state.rules);
          const stats = calculateStats(state.schedule, state.doctors, state.config);
          useScheduleStore.setState({ errors, stats });
        }
      },
    }
  )
);
