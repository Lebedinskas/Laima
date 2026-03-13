import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Doctor, MonthConfig, ScheduleEntry, ValidationError, ChatMessage, DoctorStats } from '@/lib/types';
import { generateSchedule } from '@/lib/scheduler';
import { validateSchedule, calculateStats } from '@/lib/validator';
import { swapDoctor } from '@/lib/operations';
import { defaultDoctors } from '@/data/default-doctors';

interface ScheduleStore {
  // Data
  doctors: Doctor[];
  schedule: ScheduleEntry[];
  config: MonthConfig;
  errors: ValidationError[];
  stats: DoctorStats[];
  chatMessages: ChatMessage[];
  undoStack: ScheduleEntry[][];

  // Actions
  setDoctors: (doctors: Doctor[]) => void;
  updateDoctor: (id: string, updates: Partial<Doctor>) => void;
  addDoctor: (doctor: Doctor) => void;
  removeDoctor: (id: string) => void;
  setConfig: (config: MonthConfig) => void;
  generate: () => void;
  assignDoctor: (day: number, slot: 'republicDoctor' | 'departmentDoctor' | 'residentDoctor', doctorId: string | null) => void;
  undo: () => void;
  addChatMessage: (message: ChatMessage) => void;
  setSchedule: (schedule: ScheduleEntry[]) => void;
}

const now = new Date();
const defaultConfig: MonthConfig = {
  year: now.getFullYear(),
  month: now.getMonth() + 1,
  holidays: [],
  maxWeeklyHours: 55.5,
  shiftDurationHours: 24,
};

export const useScheduleStore = create<ScheduleStore>()(
  persist(
    (set, get) => ({
      doctors: defaultDoctors,
      schedule: [],
      config: defaultConfig,
      errors: [],
      stats: [],
      chatMessages: [],
      undoStack: [],

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
        const { doctors, config } = get();
        const schedule = generateSchedule(doctors, config);
        const errors = validateSchedule(schedule, doctors, config);
        const stats = calculateStats(schedule, doctors, config);
        set({ schedule, errors, stats, undoStack: [] });
      },

      assignDoctor: (day, slot, doctorId) => {
        const { schedule, doctors, config, undoStack } = get();
        const result = swapDoctor(schedule, doctors, config, day, slot, doctorId);
        if (result) {
          const newStats = calculateStats(result.schedule, doctors, config);
          set({
            schedule: result.schedule,
            errors: result.errors,
            stats: newStats,
            undoStack: [...undoStack, schedule], // save current for undo
          });
        }
      },

      undo: () => {
        const { undoStack, doctors, config } = get();
        if (undoStack.length === 0) return;
        const previousSchedule = undoStack[undoStack.length - 1];
        const errors = validateSchedule(previousSchedule, doctors, config);
        const stats = calculateStats(previousSchedule, doctors, config);
        set({
          schedule: previousSchedule,
          errors,
          stats,
          undoStack: undoStack.slice(0, -1),
        });
      },

      addChatMessage: (message) => {
        set({ chatMessages: [...get().chatMessages, message] });
      },

      setSchedule: (schedule) => {
        const { doctors, config, undoStack } = get();
        const currentSchedule = get().schedule;
        const errors = validateSchedule(schedule, doctors, config);
        const stats = calculateStats(schedule, doctors, config);
        set({
          schedule,
          errors,
          stats,
          undoStack: currentSchedule.length > 0 ? [...undoStack, currentSchedule] : undoStack,
        });
      },
    }),
    {
      name: 'laima-schedule-store',
      partialize: (state) => ({
        doctors: state.doctors,
        schedule: state.schedule,
        config: state.config,
        chatMessages: state.chatMessages,
      }),
    }
  )
);
