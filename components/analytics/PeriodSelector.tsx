'use client';

import { MONTH_NAMES } from '@/lib/constants';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

export interface Period {
  fromYear: number;
  fromMonth: number; // 1-12
  toYear: number;
  toMonth: number; // 1-12
  label: string;
}

interface PeriodSelectorProps {
  period: Period;
  onChange: (period: Period) => void;
  currentYear: number;
  currentMonth: number;
}

function subtractMonths(year: number, month: number, n: number): { year: number; month: number } {
  let m = month - n;
  let y = year;
  while (m < 1) {
    m += 12;
    y -= 1;
  }
  return { year: y, month: m };
}

export function getPresets(currentYear: number, currentMonth: number): Period[] {
  const m1 = subtractMonths(currentYear, currentMonth, 2);
  const m3 = subtractMonths(currentYear, currentMonth, 5);
  const m12 = subtractMonths(currentYear, currentMonth, 11);

  return [
    {
      fromYear: currentYear,
      fromMonth: currentMonth,
      toYear: currentYear,
      toMonth: currentMonth,
      label: 'Šis mėnuo',
    },
    {
      fromYear: m1.year,
      fromMonth: m1.month,
      toYear: currentYear,
      toMonth: currentMonth,
      label: 'Paskutiniai 3 mėn.',
    },
    {
      fromYear: m3.year,
      fromMonth: m3.month,
      toYear: currentYear,
      toMonth: currentMonth,
      label: 'Paskutiniai 6 mėn.',
    },
    {
      fromYear: m12.year,
      fromMonth: m12.month,
      toYear: currentYear,
      toMonth: currentMonth,
      label: 'Paskutiniai metai',
    },
  ];
}

export function PeriodSelector({ period, onChange, currentYear, currentMonth }: PeriodSelectorProps) {
  const presets = getPresets(currentYear, currentMonth);
  const years = Array.from({ length: 6 }, (_, i) => currentYear - 3 + i);

  const handlePreset = (label: string) => {
    const preset = presets.find(p => p.label === label);
    if (preset) onChange(preset);
  };

  const isCustom = !presets.some(
    p => p.fromYear === period.fromYear && p.fromMonth === period.fromMonth &&
      p.toYear === period.toYear && p.toMonth === period.toMonth
  );

  const activeLabel = isCustom ? 'Pasirinktinis' : period.label;

  return (
    <div className="flex items-end gap-3 flex-wrap">
      {/* Quick presets */}
      <div className="flex gap-1">
        {presets.map(p => (
          <button
            key={p.label}
            onClick={() => handlePreset(p.label)}
            className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
              activeLabel === p.label
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:bg-blue-50'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Custom range */}
      <div className="flex items-end gap-2 text-sm">
        <div className="space-y-0.5">
          <Label className="text-[10px] text-muted-foreground">Nuo</Label>
          <div className="flex gap-1">
            <Select
              value={period.fromMonth.toString()}
              onValueChange={(v) => v && onChange({ ...period, fromMonth: parseInt(v), label: 'Pasirinktinis' })}
            >
              <SelectTrigger className="w-28 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTH_NAMES.map((name, i) => (
                  <SelectItem key={i} value={(i + 1).toString()} className="text-xs">{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={period.fromYear.toString()}
              onValueChange={(v) => v && onChange({ ...period, fromYear: parseInt(v), label: 'Pasirinktinis' })}
            >
              <SelectTrigger className="w-20 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map(y => (
                  <SelectItem key={y} value={y.toString()} className="text-xs">{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <span className="text-muted-foreground pb-1">—</span>

        <div className="space-y-0.5">
          <Label className="text-[10px] text-muted-foreground">Iki</Label>
          <div className="flex gap-1">
            <Select
              value={period.toMonth.toString()}
              onValueChange={(v) => v && onChange({ ...period, toMonth: parseInt(v), label: 'Pasirinktinis' })}
            >
              <SelectTrigger className="w-28 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTH_NAMES.map((name, i) => (
                  <SelectItem key={i} value={(i + 1).toString()} className="text-xs">{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={period.toYear.toString()}
              onValueChange={(v) => v && onChange({ ...period, toYear: parseInt(v), label: 'Pasirinktinis' })}
            >
              <SelectTrigger className="w-20 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map(y => (
                  <SelectItem key={y} value={y.toString()} className="text-xs">{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Check if a year/month falls within a period */
export function isInPeriod(year: number, month: number, period: Period): boolean {
  const val = year * 12 + month;
  const from = period.fromYear * 12 + period.fromMonth;
  const to = period.toYear * 12 + period.toMonth;
  return val >= from && val <= to;
}
