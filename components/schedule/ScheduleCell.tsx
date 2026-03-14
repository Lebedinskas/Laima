'use client';

import { memo, useState } from 'react';
import { useScheduleStore } from '@/hooks/useScheduleStore';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { suggestAlternatives, AlternativeResult } from '@/lib/operations';

interface ScheduleCellProps {
  day: number;
  slot: 'republicDoctor' | 'departmentDoctor' | 'residentDoctor';
  doctorId: string | null;
  hasError?: boolean;
}

function buildTooltip(alt: AlternativeResult): string {
  const lines: string[] = [];
  if (alt.newErrors.length === 0 && alt.resolvedErrors.length === 0) {
    lines.push('Jokių naujų problemų');
  }
  if (alt.resolvedErrors.length > 0) {
    lines.push(`Išsprendžia (${alt.resolvedErrors.length}):`);
    alt.resolvedErrors.slice(0, 3).forEach(e => lines.push(`  + ${e.message}`));
  }
  if (alt.newErrors.length > 0) {
    lines.push(`Naujos pastabos (${alt.newErrors.length}):`);
    alt.newErrors.slice(0, 3).forEach(e => lines.push(`  - ${e.message}`));
    if (alt.newErrors.length > 3) lines.push(`  ...ir dar ${alt.newErrors.length - 3}`);
  }
  return lines.join('\n');
}

function AlternativeItem({ alt, onSelect }: { alt: AlternativeResult; onSelect: () => void }) {
  const hasNewErrors = alt.newErrors.length > 0;
  const fixes = alt.resolvedErrors.length;
  const isClean = !hasNewErrors;

  const colorClass = hasNewErrors ? 'text-amber-700' : 'text-green-700';
  const icon = hasNewErrors ? '!' : '✓';

  return (
    <DropdownMenuItem onClick={onSelect} className={colorClass} title={buildTooltip(alt)}>
      <span className="flex items-center gap-2 w-full">
        <span className={hasNewErrors ? 'text-amber-500' : 'text-green-500'}>{icon}</span>
        <span className="flex-1">{alt.name}</span>
        {isClean && fixes > 0 && (
          <span className="text-[10px] text-green-500">-{fixes} kl.</span>
        )}
        {isClean && fixes === 0 && (
          <span className="text-[10px] text-green-400">OK</span>
        )}
        {hasNewErrors && (
          <span className="text-[10px] text-amber-400">+{alt.newErrors.length}</span>
        )}
        {hasNewErrors && fixes > 0 && (
          <span className="text-[10px] text-blue-400">-{fixes}</span>
        )}
      </span>
    </DropdownMenuItem>
  );
}

export const ScheduleCell = memo(function ScheduleCell({ day, slot, doctorId, hasError }: ScheduleCellProps) {
  const { doctors, schedule, config, assignDoctor, rules } = useScheduleStore();
  const [alternatives, setAlternatives] = useState<AlternativeResult[]>([]);
  const doctor = doctorId ? doctors.find(d => d.id === doctorId) : null;

  const baseClass = `w-full text-left px-2 py-1 text-sm hover:bg-blue-50 rounded cursor-pointer min-h-[28px] ${
    hasError ? 'bg-red-100 text-red-700 font-medium' : ''
  }`;

  // Compute alternatives only when dropdown opens
  const onOpenChange = (open: boolean) => {
    if (open && slot !== 'residentDoctor' && schedule.length > 0) {
      setAlternatives(suggestAlternatives(schedule, doctors, config, day, slot, rules));
    }
  };

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

  const clean = alternatives.filter(a => a.newErrors.length === 0);
  const withIssues = alternatives.filter(a => a.newErrors.length > 0);

  return (
    <DropdownMenu onOpenChange={onOpenChange}>
      <DropdownMenuTrigger className={baseClass}>
        {doctor?.name || '—'}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="max-h-80 overflow-y-auto min-w-[240px]">
        <DropdownMenuItem onClick={() => assignDoctor(day, slot, null)}>
          <span className="text-muted-foreground">— Tuščias —</span>
        </DropdownMenuItem>

        {clean.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 py-1 text-[10px] font-semibold text-green-700 uppercase tracking-wide">
              Galima keisti ({clean.length})
            </div>
            {clean.map(alt => (
              <AlternativeItem
                key={alt.doctorId}
                alt={alt}
                onSelect={() => assignDoctor(day, slot, alt.doctorId)}
              />
            ))}
          </>
        )}

        {withIssues.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 py-1 text-[10px] font-semibold text-amber-600 uppercase tracking-wide">
              Su pastabomis ({withIssues.length})
            </div>
            {withIssues.map(alt => (
              <AlternativeItem
                key={alt.doctorId}
                alt={alt}
                onSelect={() => assignDoctor(day, slot, alt.doctorId)}
              />
            ))}
          </>
        )}

        {clean.length === 0 && withIssues.length === 0 && (
          <div className="px-2 py-2 text-xs text-muted-foreground text-center">
            Nėra kandidatų
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
});
