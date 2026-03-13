'use client';

import { useScheduleStore } from '@/hooks/useScheduleStore';
import { WEEKDAY_NAMES_SHORT, MONTH_NAMES } from '@/lib/constants';
import { ScheduleCell } from './ScheduleCell';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export function ScheduleTable() {
  const { schedule, errors, config, undo, undoStack } = useScheduleStore();

  if (schedule.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Pasirinkite mėnesį ir spauskite „Generuoti grafiką"
      </div>
    );
  }

  // Build error lookup by day and doctorId
  const dayErrors = new Map<string, string[]>();
  for (const err of errors) {
    if (err.day && err.doctorId) {
      const key = `${err.day}-${err.doctorId}`;
      if (!dayErrors.has(key)) dayErrors.set(key, []);
      dayErrors.get(key)!.push(err.message);
    }
  }

  const hardErrors = errors.filter(e => e.type === 'error');
  const warnings = errors.filter(e => e.type === 'warning');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {MONTH_NAMES[config.month - 1]} {config.year} m.
        </h2>
        <div className="flex items-center gap-3">
          {hardErrors.length > 0 && (
            <Badge variant="destructive">{hardErrors.length} klaidų</Badge>
          )}
          {warnings.length > 0 && (
            <Badge variant="secondary">{warnings.length} įspėjimų</Badge>
          )}
          {undoStack.length > 0 && (
            <Button variant="outline" size="sm" onClick={undo}>
              ↩ Atšaukti
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-blue-50">
              <TableHead className="w-16 text-center font-semibold">Diena</TableHead>
              <TableHead className="min-w-[150px] font-semibold">
                Klinika<br />
                <span className="text-xs font-normal text-muted-foreground">8-16 val. (darbo d.)</span>
              </TableHead>
              <TableHead className="min-w-[150px] font-semibold">
                Už respubliką<br />
                <span className="text-xs font-normal text-muted-foreground">8-8 val.</span>
              </TableHead>
              <TableHead className="min-w-[150px] font-semibold">
                Už skyrių<br />
                <span className="text-xs font-normal text-muted-foreground">8-8 val.</span>
              </TableHead>
              <TableHead className="min-w-[150px] font-semibold">
                Rezidentai<br />
                <span className="text-xs font-normal text-muted-foreground">8-8 val.</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {schedule.map((entry) => {
              const isHighlight = entry.isWeekend || entry.isHoliday;
              const repError = entry.republicDoctor
                ? dayErrors.has(`${entry.day}-${entry.republicDoctor}`)
                : !entry.republicDoctor;
              const depError = entry.departmentDoctor
                ? dayErrors.has(`${entry.day}-${entry.departmentDoctor}`)
                : !entry.departmentDoctor;

              return (
                <TableRow
                  key={entry.day}
                  className={isHighlight ? 'bg-amber-50' : ''}
                >
                  <TableCell className="text-center font-medium">
                    <span className="text-sm">
                      {entry.day} {WEEKDAY_NAMES_SHORT[entry.weekday]}
                    </span>
                    {entry.isHoliday && (
                      <span className="ml-1 text-xs text-amber-600">★</span>
                    )}
                  </TableCell>
                  <TableCell className="p-1">
                    {!entry.isWeekend && !entry.isHoliday ? (
                      <div className="px-2 py-1 text-sm text-muted-foreground">
                        {entry.clinicDoctor
                          ? useScheduleStore.getState().doctors.find(d => d.id === entry.clinicDoctor)?.name
                          : '—'}
                      </div>
                    ) : (
                      <div className="px-2 py-1 text-sm text-muted-foreground">—</div>
                    )}
                  </TableCell>
                  <TableCell className="p-1">
                    <ScheduleCell
                      day={entry.day}
                      slot="republicDoctor"
                      doctorId={entry.republicDoctor}
                      hasError={repError}
                    />
                  </TableCell>
                  <TableCell className="p-1">
                    <ScheduleCell
                      day={entry.day}
                      slot="departmentDoctor"
                      doctorId={entry.departmentDoctor}
                      hasError={depError}
                    />
                  </TableCell>
                  <TableCell className="p-1">
                    <ScheduleCell
                      day={entry.day}
                      slot="residentDoctor"
                      doctorId={entry.residentDoctor}
                      hasError={false}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
