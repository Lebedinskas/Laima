'use client';

import { useScheduleStore } from '@/hooks/useScheduleStore';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { suggestAlternatives } from '@/lib/operations';

interface ScheduleCellProps {
  day: number;
  slot: 'republicDoctor' | 'departmentDoctor' | 'residentDoctor';
  doctorId: string | null;
  hasError?: boolean;
}

export function ScheduleCell({ day, slot, doctorId, hasError }: ScheduleCellProps) {
  const { doctors, schedule, config, assignDoctor } = useScheduleStore();
  const doctor = doctorId ? doctors.find(d => d.id === doctorId) : null;

  const baseClass = `w-full text-left px-2 py-1 text-sm hover:bg-blue-50 rounded cursor-pointer min-h-[28px] ${
    hasError ? 'bg-red-100 text-red-700 font-medium' : ''
  }`;

  if (slot === 'residentDoctor') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger className={baseClass}>
          {doctor?.name || '—'}
        </DropdownMenuTrigger>
        <DropdownMenuContent className="max-h-64 overflow-y-auto">
          <DropdownMenuItem onClick={() => assignDoctor(day, slot, null)}>
            <span className="text-muted-foreground">— Tuščias —</span>
          </DropdownMenuItem>
          {doctors.map(d => (
            <DropdownMenuItem key={d.id} onClick={() => assignDoctor(day, slot, d.id)}>
              {d.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  const alternatives = schedule.length > 0
    ? suggestAlternatives(schedule, doctors, config, day, slot)
    : [];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={baseClass}>
        {doctor?.name || '—'}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="max-h-80 overflow-y-auto min-w-[200px]">
        <DropdownMenuItem onClick={() => assignDoctor(day, slot, null)}>
          <span className="text-muted-foreground">— Tuščias —</span>
        </DropdownMenuItem>
        {alternatives.map(alt => (
          <DropdownMenuItem
            key={alt.doctorId}
            onClick={() => assignDoctor(day, slot, alt.doctorId)}
            className={alt.errors.length > 0 ? 'text-red-500' : 'text-green-700'}
          >
            <span className="flex items-center gap-2">
              <span>{alt.errors.length === 0 ? '✓' : '✗'}</span>
              <span>{alt.name}</span>
              {alt.errors.length > 0 && (
                <span className="text-xs text-red-400">({alt.errors.length} kl.)</span>
              )}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
