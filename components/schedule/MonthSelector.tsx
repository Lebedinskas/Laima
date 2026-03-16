'use client';

import { useEffect, useState, useCallback } from 'react';
import { useScheduleStore } from '@/hooks/useScheduleStore';
import { MONTH_NAMES, getHolidaysForMonth, WEEKDAY_NAMES_SHORT } from '@/lib/constants';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

function jsToWeekday(jsDay: number): number {
  return jsDay === 0 ? 6 : jsDay - 1;
}

type GenerateStatus = 'idle' | 'generating' | 'success' | 'error';

export function MonthSelector() {
  const { config, setConfig, generate, generatePeriod, switchMonth, schedule, scheduleCache, yearGenerated } = useScheduleStore();
  const [status, setStatus] = useState<GenerateStatus>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [periodMonths, setPeriodMonths] = useState(1);

  // Clear success message after 4s
  useEffect(() => {
    if (status === 'success' || status === 'error') {
      const timer = setTimeout(() => {
        setStatus('idle');
        setStatusMessage('');
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  // Watch for schedule changes to detect when generation completes
  const handleGenerate = useCallback(() => {
    setStatus('generating');
    setStatusMessage('Generuojamas grafikas...');

    generate();

    let done = false;
    // Poll for completion (generate is async internally)
    const check = setInterval(() => {
      if (done) return;
      const current = useScheduleStore.getState();
      if (current.schedule.length > 0 && current.schedule !== schedule) {
        done = true;
        clearInterval(check);
        const errors = current.errors.filter(e => e.type === 'error');
        if (errors.length > 0) {
          setStatus('error');
          setStatusMessage(`Sugeneruota su ${errors.length} klaidomis`);
        } else {
          setStatus('success');
          setStatusMessage('Grafikas sugeneruotas!');
        }
      }
    }, 200);

    // Timeout after 60s
    setTimeout(() => {
      if (done) return;
      done = true;
      clearInterval(check);
      setStatus('error');
      setStatusMessage('Generavimas užtruko per ilgai');
    }, 60000);
  }, [generate, schedule]);

  const handleGeneratePeriod = useCallback((months: number) => {
    setStatus('generating');
    setStatusMessage(`Generuojami ${months} mėn...`);

    // generatePeriod replaces scheduleCache with a NEW object when done.
    // Detect completion by comparing object reference.
    const cacheBefore = useScheduleStore.getState().scheduleCache;

    generatePeriod(months);

    let done = false;
    // Poll for completion — detect when scheduleCache object reference changes
    const check = setInterval(() => {
      if (done) return;
      const current = useScheduleStore.getState();
      if (current.scheduleCache !== cacheBefore && current.schedule.length > 0) {
        done = true;
        clearInterval(check);
        const cachedCount = Object.keys(current.scheduleCache).filter(k => current.scheduleCache[k]?.length > 0).length;
        setStatus('success');
        setStatusMessage(`${cachedCount} mėn. sugeneruota!`);
      }
    }, 500);

    // Timeout scales with month count
    const timeoutMs = Math.max(30000, months * 15000);
    setTimeout(() => {
      if (done) return;
      done = true;
      clearInterval(check);
      const current = useScheduleStore.getState();
      const cachedCount = Object.keys(current.scheduleCache).filter(k => current.scheduleCache[k]?.length > 0).length;
      if (cachedCount >= months) {
        setStatus('success');
        setStatusMessage(`${cachedCount} mėn. sugeneruota`);
      } else if (current.schedule.length > 0) {
        setStatus('success');
        setStatusMessage(`${cachedCount}/${months} mėn. sugeneruota`);
      } else {
        setStatus('error');
        setStatusMessage('Generavimas užtruko per ilgai');
      }
    }, timeoutMs);
  }, [generatePeriod]);

  // Auto-fill LT holidays when holidays array is empty (after year/month change)
  useEffect(() => {
    if (config.holidays.length === 0) {
      const ltHolidays = getHolidaysForMonth(config.year, config.month);
      const holidayDays = ltHolidays.map(h => h.day);
      if (holidayDays.length > 0) {
        setConfig({ ...config, holidays: holidayDays });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.year, config.month, config.holidays.length]);

  const ltHolidays = getHolidaysForMonth(config.year, config.month);
  const daysInMonth = new Date(config.year, config.month, 0).getDate();

  const toggleHoliday = (day: number) => {
    const newHolidays = config.holidays.includes(day)
      ? config.holidays.filter(d => d !== day)
      : [...config.holidays, day].sort((a, b) => a - b);
    setConfig({ ...config, holidays: newHolidays });
  };

  const handleMonthChange = (month: number) => {
    if (yearGenerated || Object.keys(scheduleCache).length > 0) {
      switchMonth(config.year, month);
    } else {
      setConfig({ ...config, month, holidays: [] });
    }
  };

  const handleYearChange = (year: number) => {
    if (yearGenerated || Object.keys(scheduleCache).length > 0) {
      switchMonth(year, config.month);
    } else {
      setConfig({ ...config, year, holidays: [] });
    }
  };

  // Count how many months have schedules in cache
  const cachedMonths = Object.keys(scheduleCache).filter(k => {
    const entries = scheduleCache[k];
    return entries && entries.length > 0;
  }).length;

  // Build mini calendar for the month
  const firstDayWeekday = jsToWeekday(new Date(config.year, config.month - 1, 1).getDay());
  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDayWeekday; i++) calendarDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d);

  const isGenerating = status === 'generating';

  return (
    <div className="space-y-2">
      <div className="flex items-end gap-4 flex-wrap">
        <div className="space-y-1">
          <Label className="text-sm">Metai</Label>
          <Select
            value={config.year.toString()}
            onValueChange={(v) => v && handleYearChange(parseInt(v))}
          >
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[2025, 2026, 2027, 2028, 2029, 2030].map(y => (
                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-sm">Mėnuo</Label>
          <Select
            value={config.month.toString()}
            onValueChange={(v) => v && handleMonthChange(parseInt(v))}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTH_NAMES.map((name, i) => {
                const key = `${config.year}-${i + 1}`;
                const hasCached = scheduleCache[key]?.length > 0;
                return (
                  <SelectItem key={i} value={(i + 1).toString()}>
                    {name} {hasCached && '•'}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-sm">Šventinės dienos</Label>
          <Popover>
            <PopoverTrigger>
              <div className="flex items-center gap-1.5 border rounded-md px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 min-w-[200px]">
                {config.holidays.length > 0 ? (
                  <span className="flex flex-wrap gap-1">
                    {config.holidays.map(d => {
                      const ltH = ltHolidays.find(h => h.day === d);
                      return (
                        <Badge key={d} variant={ltH ? 'default' : 'secondary'} className="text-xs px-1.5">
                          {d}
                        </Badge>
                      );
                    })}
                  </span>
                ) : (
                  <span className="text-muted-foreground">Nėra švenčių</span>
                )}
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-3" align="start">
              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground">
                  Paspauskite dieną — pažymėti/atžymėti šventę
                </p>
                {ltHolidays.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-semibold">LT šventės šį mėnesį:</p>
                    {ltHolidays.map(h => (
                      <label key={h.day} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.holidays.includes(h.day)}
                          onChange={() => toggleHoliday(h.day)}
                        />
                        <span>{h.day} d. — {h.name}</span>
                      </label>
                    ))}
                  </div>
                )}
                <div>
                  <p className="text-xs font-semibold mb-1">Kalendorius:</p>
                  <div className="grid grid-cols-7 gap-0.5 text-center">
                    {WEEKDAY_NAMES_SHORT.map(d => (
                      <div key={d} className="text-[10px] font-medium text-muted-foreground py-0.5">{d}</div>
                    ))}
                    {calendarDays.map((day, i) => {
                      if (day === null) return <div key={`empty-${i}`} />;
                      const isHoliday = config.holidays.includes(day);
                      const isLtHoliday = ltHolidays.some(h => h.day === day);
                      const date = new Date(config.year, config.month - 1, day);
                      const isWeekend = jsToWeekday(date.getDay()) >= 5;
                      return (
                        <button
                          key={day}
                          onClick={() => toggleHoliday(day)}
                          className={`w-7 h-7 rounded text-xs transition-colors ${
                            isHoliday
                              ? 'bg-amber-400 text-white font-bold'
                              : isWeekend
                                ? 'bg-gray-100 text-gray-500 hover:bg-amber-100'
                                : 'hover:bg-amber-100'
                          } ${isLtHoliday && !isHoliday ? 'ring-1 ring-amber-300' : ''}`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={periodMonths.toString()}
            onValueChange={(v) => v && setPeriodMonths(parseInt(v))}
          >
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 mėn.</SelectItem>
              <SelectItem value="3">3 mėn.</SelectItem>
              <SelectItem value="6">6 mėn.</SelectItem>
              <SelectItem value="12">12 mėn.</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={() => periodMonths === 1 ? handleGenerate() : handleGeneratePeriod(periodMonths)}
            disabled={isGenerating}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isGenerating ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                {statusMessage}
              </span>
            ) : (
              schedule.length > 0 ? 'Pergeneruoti' : 'Generuoti'
            )}
          </Button>
        </div>

        {cachedMonths > 1 && status !== 'success' && (
          <Badge variant="secondary" className="text-xs">
            {cachedMonths} mėn. sugeneruota
          </Badge>
        )}

        {status === 'success' && (
          <Badge className="bg-green-100 text-green-800 border-green-300 text-xs animate-in fade-in">
            {statusMessage}
          </Badge>
        )}
        {status === 'error' && (
          <Badge variant="destructive" className="text-xs animate-in fade-in">
            {statusMessage}
          </Badge>
        )}
      </div>
    </div>
  );
}
