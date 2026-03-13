'use client';

import { useEffect } from 'react';
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

export function MonthSelector() {
  const { config, setConfig, generate, schedule } = useScheduleStore();

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

  const handleGenerate = () => {
    generate();
  };

  // Build mini calendar for the month
  const firstDayWeekday = jsToWeekday(new Date(config.year, config.month - 1, 1).getDay());
  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDayWeekday; i++) calendarDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d);

  return (
    <div className="flex items-end gap-4 flex-wrap">
      <div className="space-y-1">
        <Label className="text-sm">Metai</Label>
        <Select
          value={config.year.toString()}
          onValueChange={(v) => v && setConfig({ ...config, year: parseInt(v), holidays: [] })}
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
          onValueChange={(v) => v && setConfig({ ...config, month: parseInt(v), holidays: [] })}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTH_NAMES.map((name, i) => (
              <SelectItem key={i} value={(i + 1).toString()}>{name}</SelectItem>
            ))}
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
              {/* LT auto-detected holidays */}
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
              {/* Mini calendar */}
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

      <Button onClick={handleGenerate} className="bg-blue-600 hover:bg-blue-700">
        {schedule.length > 0 ? 'Pergeneruoti' : 'Generuoti grafiką'}
      </Button>
    </div>
  );
}
