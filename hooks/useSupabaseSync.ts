'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from './useAuth';
import { useScheduleStore } from './useScheduleStore';
import * as db from '@/lib/database';

/**
 * Syncs Zustand store ↔ Supabase.
 * - On login: loads all data from Supabase into the store
 * - On store changes: debounced save back to Supabase
 */
export function useSupabaseSync() {
  const { user } = useAuth();
  const loaded = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load from Supabase when user logs in
  useEffect(() => {
    if (!user || loaded.current) return;

    const load = async () => {
      try {
        const store = useScheduleStore.getState();
        const { config } = store;

        const [doctors, savedConfig, schedule, changeHistory, snapshots, chatMessages] = await Promise.all([
          db.loadDoctors(user.id),
          db.loadMonthConfig(user.id, config.year, config.month),
          db.loadSchedule(user.id, config.year, config.month),
          db.loadChangeHistory(user.id),
          db.loadSnapshots(user.id),
          db.loadChatMessages(user.id),
        ]);

        // Only override if Supabase has data
        if (doctors.length > 0) {
          store.setDoctors(doctors);
        }
        if (savedConfig) {
          store.setConfig(savedConfig);
        }
        if (schedule.length > 0) {
          store.setSchedule(schedule);
        }

        // Load all cached schedules from Supabase
        const scheduleCache: Record<string, typeof schedule> = {};
        if (schedule.length > 0) {
          scheduleCache[`${config.year}-${config.month}`] = schedule;
        }

        // Load schedules from snapshots (they tell us which months have data)
        if (snapshots.length > 0) {
          const otherMonths = snapshots.filter(
            s => !(s.year === config.year && s.month === config.month)
          );
          const otherSchedules = await Promise.all(
            otherMonths.map(s => db.loadSchedule(user.id, s.year, s.month).then(entries => ({
              key: `${s.year}-${s.month}`,
              entries,
            })))
          );
          otherSchedules.forEach(({ key, entries }) => {
            if (entries.length > 0) scheduleCache[key] = entries;
          });
        }

        useScheduleStore.setState({
          ...(changeHistory.length > 0 ? { changeHistory } : {}),
          ...(snapshots.length > 0 ? { monthlySnapshots: snapshots } : {}),
          ...(chatMessages.length > 0 ? { chatMessages } : {}),
          ...(Object.keys(scheduleCache).length > 0 ? { scheduleCache, yearGenerated: Object.keys(scheduleCache).length > 1 } : {}),
        });

        loaded.current = true;
      } catch (err) {
        console.error('Failed to load from Supabase:', err);
        loaded.current = true;
      }
    };

    load();
  }, [user]);

  // Save to Supabase on store changes (debounced)
  const saveToSupabase = useCallback(async () => {
    if (!user || !loaded.current) return;

    const state = useScheduleStore.getState();
    try {
      // Save all cached schedules
      const cacheEntries = Object.entries(state.scheduleCache);
      const scheduleSaves = cacheEntries.map(([key, entries]) => {
        const [y, m] = key.split('-').map(Number);
        return db.saveSchedule(user.id, y, m, entries);
      });

      // Also save current month config for all cached months
      const configSaves = cacheEntries.map(([key]) => {
        const [y, m] = key.split('-').map(Number);
        return db.saveMonthConfig(user.id, {
          ...state.config,
          year: y,
          month: m,
          holidays: [], // holidays are auto-detected per month
        });
      });

      await Promise.all([
        db.saveDoctors(user.id, state.doctors),
        db.saveMonthConfig(user.id, state.config),
        ...scheduleSaves,
        ...configSaves,
        db.saveChangeRecords(user.id, state.changeHistory),
        ...state.monthlySnapshots.map(s => db.saveSnapshot(user.id, s)),
        ...state.chatMessages.slice(-5).map(m => db.saveChatMessage(user.id, m)),
      ]);
    } catch (err) {
      console.error('Failed to save to Supabase:', err);
    }
  }, [user]);

  useEffect(() => {
    if (!user || !loaded.current) return;

    const unsub = useScheduleStore.subscribe(() => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(saveToSupabase, 2000);
    });

    return () => {
      unsub();
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [user, saveToSupabase]);

  useEffect(() => {
    if (!user) loaded.current = false;
  }, [user]);
}
