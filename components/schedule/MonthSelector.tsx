'use client';

import { useScheduleStore } from '@/hooks/useScheduleStore';
import { MONTH_NAMES } from '@/lib/constants';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';

export function MonthSelector() {
  const { config, setConfig, generate, schedule } = useScheduleStore();
  const [holidayInput, setHolidayInput] = useState(config.holidays.join(', '));

  const handleGenerate = () => {
    // Parse holidays
    const holidays = holidayInput
      .split(',')
      .map(s => parseInt(s.trim()))
      .filter(n => !isNaN(n) && n >= 1 && n <= 31);
    setConfig({ ...config, holidays });
    // Small delay to let config update
    setTimeout(() => {
      generate();
    }, 0);
  };

  return (
    <div className="flex items-end gap-4 flex-wrap">
      <div className="space-y-1">
        <Label className="text-sm">Metai</Label>
        <Select
          value={config.year.toString()}
          onValueChange={(v) => v && setConfig({ ...config, year: parseInt(v) })}
        >
          <SelectTrigger className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[2025, 2026, 2027, 2028].map(y => (
              <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label className="text-sm">Mėnuo</Label>
        <Select
          value={config.month.toString()}
          onValueChange={(v) => v && setConfig({ ...config, month: parseInt(v) })}
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
        <Input
          className="w-48"
          placeholder="pvz. 1, 15, 20"
          value={holidayInput}
          onChange={(e) => setHolidayInput(e.target.value)}
        />
      </div>

      <Button onClick={handleGenerate} className="bg-blue-600 hover:bg-blue-700">
        {schedule.length > 0 ? 'Pergeneruoti' : 'Generuoti grafiką'}
      </Button>
    </div>
  );
}
