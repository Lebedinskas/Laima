'use client';

import { useState, useMemo } from 'react';
import { useScheduleStore } from '@/hooks/useScheduleStore';
import { MONTH_NAMES } from '@/lib/constants';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DoctorProfile } from './DoctorProfile';
import { DoctorCharts } from './DoctorCharts';
import { DoctorComparison } from './DoctorComparison';
import { ChangeLog } from './ChangeLog';
import { PeriodSelector, Period, isInPeriod, getPresets } from './PeriodSelector';

export function DoctorAnalytics() {
  const { doctors, schedule, stats, changeHistory, monthlySnapshots, config } = useScheduleStore();
  const [search, setSearch] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [compareDoctorId, setCompareDoctorId] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState(false);

  const [period, setPeriod] = useState<Period>(() =>
    getPresets(config.year, config.month)[0]
  );

  const isCurrentMonth = period.fromYear === config.year && period.fromMonth === config.month &&
    period.toYear === config.year && period.toMonth === config.month;

  const filteredHistory = useMemo(() => {
    return changeHistory.filter(r => isInPeriod(r.year, r.month, period));
  }, [changeHistory, period]);

  const periodStats = useMemo(() => {
    if (isCurrentMonth) return stats;

    const aggregated = new Map<string, { republicCount: number; departmentCount: number; totalCount: number; weekendCount: number; weeklyHours: Record<number, number> }>();
    doctors.forEach(d => {
      aggregated.set(d.id, { republicCount: 0, departmentCount: 0, totalCount: 0, weekendCount: 0, weeklyHours: {} });
    });

    monthlySnapshots
      .filter(s => isInPeriod(s.year, s.month, period) && !(s.year === config.year && s.month === config.month))
      .forEach(snapshot => {
        snapshot.doctorStats.forEach(ds => {
          const existing = aggregated.get(ds.doctorId);
          if (existing) {
            existing.republicCount += ds.republicCount;
            existing.departmentCount += ds.departmentCount;
            existing.totalCount += ds.totalCount;
            existing.weekendCount += ds.weekendCount;
          }
        });
      });

    if (isInPeriod(config.year, config.month, period)) {
      stats.forEach(ds => {
        const existing = aggregated.get(ds.doctorId);
        if (existing) {
          existing.republicCount += ds.republicCount;
          existing.departmentCount += ds.departmentCount;
          existing.totalCount += ds.totalCount;
          existing.weekendCount += ds.weekendCount;
          existing.weeklyHours = ds.weeklyHours;
        }
      });
    }

    return doctors.map(d => {
      const agg = aggregated.get(d.id)!;
      return { doctorId: d.id, name: d.name, ...agg };
    });
  }, [isCurrentMonth, stats, monthlySnapshots, period, config, doctors]);

  const filteredDoctors = useMemo(() => {
    if (!search.trim()) return doctors;
    const q = search.toLowerCase();
    return doctors.filter(d => d.name.toLowerCase().includes(q));
  }, [doctors, search]);

  // Helper to get shifts for any doctor
  const getShiftsForDoctor = (doctorId: string) => {
    if (!isInPeriod(config.year, config.month, period)) return [];
    return schedule
      .filter(e => e.republicDoctor === doctorId || e.departmentDoctor === doctorId)
      .map(e => ({
        day: e.day,
        weekday: e.weekday,
        date: e.date,
        type: e.republicDoctor === doctorId ? 'R' as const : 'D' as const,
        isWeekend: e.isWeekend,
        isHoliday: e.isHoliday,
      }));
  };

  const selectedDoctor = selectedDoctorId ? doctors.find(d => d.id === selectedDoctorId) || null : null;
  const compareDoctor = compareDoctorId ? doctors.find(d => d.id === compareDoctorId) || null : null;

  const doctorStat = selectedDoctorId ? periodStats.find(s => s.doctorId === selectedDoctorId) : null;
  const compareStat = compareDoctorId ? periodStats.find(s => s.doctorId === compareDoctorId) : null;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const doctorShifts = useMemo(() => selectedDoctorId ? getShiftsForDoctor(selectedDoctorId) : [], [selectedDoctorId, schedule, period, config]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const compareShifts = useMemo(() => compareDoctorId ? getShiftsForDoctor(compareDoctorId) : [], [compareDoctorId, schedule, period, config]);

  const doctorHistory = useMemo(() => {
    if (!selectedDoctorId) return [];
    return filteredHistory.filter(
      r => r.previousDoctorId === selectedDoctorId || r.newDoctorId === selectedDoctorId
    );
  }, [filteredHistory, selectedDoctorId]);

  const manualChanges = useMemo(() => doctorHistory.filter(r => r.source !== 'generate'), [doctorHistory]);

  const handleCardClick = (docId: string) => {
    if (compareMode) {
      if (!selectedDoctorId) {
        setSelectedDoctorId(docId);
      } else if (docId === selectedDoctorId) {
        setSelectedDoctorId(null);
        setCompareDoctorId(null);
      } else if (docId === compareDoctorId) {
        setCompareDoctorId(null);
      } else {
        setCompareDoctorId(docId);
      }
    } else {
      setSelectedDoctorId(selectedDoctorId === docId ? null : docId);
      setCompareDoctorId(null);
    }
  };

  const exitCompare = () => {
    setCompareMode(false);
    setCompareDoctorId(null);
  };

  const periodLabel = isCurrentMonth
    ? `${MONTH_NAMES[config.month - 1]} ${config.year} m.`
    : period.label !== 'Pasirinktinis'
      ? period.label
      : `${MONTH_NAMES[period.fromMonth - 1]} ${period.fromYear} — ${MONTH_NAMES[period.toMonth - 1]} ${period.toYear}`;

  const monthsWithData = useMemo(() => {
    const months = new Set<string>();
    filteredHistory.forEach(r => months.add(`${r.year}-${r.month}`));
    return months.size;
  }, [filteredHistory]);

  const averageShifts = periodStats.reduce((s, st) => s + st.totalCount, 0) / doctors.length;

  if (schedule.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Sugeneruokite grafiką, kad galėtumėte analizuoti gydytojų duomenis
      </div>
    );
  }

  const isComparing = compareMode && selectedDoctor && compareDoctor && doctorStat && compareStat;

  return (
    <div className="space-y-6">
      {/* Period selector + Search */}
      <div className="bg-white rounded-lg border p-4 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <PeriodSelector
            period={period}
            onChange={setPeriod}
            currentYear={config.year}
            currentMonth={config.month}
          />
          <div className="flex items-center gap-3">
            {monthsWithData > 0 && (
              <Badge variant="outline" className="text-xs">
                {monthsWithData} mėn. duomenų
              </Badge>
            )}
            <span className="text-sm font-medium text-gray-700">{periodLabel}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Input
              placeholder="Ieškoti gydytojo pagal pavardę..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-md"
            />
          </div>
          <Button
            variant={compareMode ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              if (compareMode) {
                exitCompare();
              } else {
                setCompareMode(true);
                setCompareDoctorId(null);
              }
            }}
            className={compareMode ? 'bg-blue-600 hover:bg-blue-700' : ''}
          >
            {compareMode ? '✕ Palyginimo režimas' : 'Palyginti du gydytojus'}
          </Button>
        </div>

        {/* Compare mode hint */}
        {compareMode && !isComparing && (
          <div className="text-sm text-blue-600 bg-blue-50 rounded-lg px-3 py-2 border border-blue-200">
            {!selectedDoctorId
              ? 'Pasirinkite pirmą gydytoją'
              : 'Dabar pasirinkite antrą gydytoją palyginimui'}
          </div>
        )}

        {/* Doctor cards grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
          {filteredDoctors.map(doc => {
            const stat = periodStats.find(s => s.doctorId === doc.id);
            const isSelected = doc.id === selectedDoctorId;
            const isCompared = doc.id === compareDoctorId;
            const changes = filteredHistory.filter(
              r => r.source !== 'generate' &&
                (r.previousDoctorId === doc.id || r.newDoctorId === doc.id)
            );

            let borderClass = 'border-gray-200 hover:border-blue-300 hover:bg-gray-50';
            if (isSelected) borderClass = 'border-blue-500 bg-blue-50 ring-2 ring-blue-200';
            if (isCompared) borderClass = 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200';

            return (
              <button
                key={doc.id}
                onClick={() => handleCardClick(doc.id)}
                className={`text-left p-3 rounded-lg border transition-all ${borderClass}`}
              >
                <div className="flex items-center gap-1.5">
                  {(isSelected || isCompared) && (
                    <div className={`w-2 h-2 rounded-full shrink-0 ${isSelected ? 'bg-blue-500' : 'bg-emerald-500'}`} />
                  )}
                  <div className="font-medium text-sm truncate">{doc.name}</div>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  {stat && (
                    <>
                      <Badge variant="outline" className="text-[10px] px-1 py-0">
                        {stat.totalCount} bud.
                      </Badge>
                      {stat.weekendCount > 0 && (
                        <Badge variant="secondary" className="text-[10px] px-1 py-0">
                          {stat.weekendCount} sv.
                        </Badge>
                      )}
                    </>
                  )}
                  {changes.length > 0 && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0 text-amber-600 border-amber-300">
                      {changes.length} keit.
                    </Badge>
                  )}
                </div>
                {!doc.canRepublic && (
                  <div className="text-[10px] text-amber-600 mt-0.5">Tik skyrius</div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Comparison view */}
      {isComparing && (
        <DoctorComparison
          doctorA={selectedDoctor!}
          doctorB={compareDoctor!}
          statA={doctorStat!}
          statB={compareStat!}
          shiftsA={doctorShifts}
          shiftsB={compareShifts}
          schedule={schedule}
          config={config}
          averageShifts={averageShifts}
        />
      )}

      {/* Single doctor analysis (non-compare mode) */}
      {!compareMode && selectedDoctor && doctorStat && (
        <div className="space-y-6">
          <DoctorProfile
            doctor={selectedDoctor}
            stat={doctorStat}
            shifts={doctorShifts}
            totalDoctors={doctors.length}
            averageShifts={averageShifts}
            manualChangeCount={manualChanges.length}
          />

          <DoctorCharts
            doctor={selectedDoctor}
            stat={doctorStat}
            shifts={doctorShifts}
            schedule={schedule}
            doctors={doctors}
            stats={periodStats}
            changeHistory={doctorHistory}
            config={config}
          />

          {manualChanges.length > 0 && (
            <ChangeLog
              changes={manualChanges}
              doctorId={selectedDoctorId!}
            />
          )}
        </div>
      )}
    </div>
  );
}
