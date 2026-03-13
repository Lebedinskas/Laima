'use client';

import { useScheduleStore } from '@/hooks/useScheduleStore';
import { Badge } from '@/components/ui/badge';

export function Summary() {
  const { stats, doctors, schedule } = useScheduleStore();

  if (schedule.length === 0) return null;

  const totalShifts = stats.reduce((s, st) => s + st.totalCount, 0);
  const average = doctors.length > 0 ? totalShifts / doctors.length : 0;

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-sm">Suvestinė</h3>
      <div className="space-y-1.5">
        {stats
          .filter(s => s.totalCount > 0 || doctors.find(d => d.id === s.doctorId))
          .sort((a, b) => b.totalCount - a.totalCount)
          .map(s => {
            const deviation = Math.abs(s.totalCount - average);
            const status = deviation > 1.5 ? 'destructive' : deviation > 0.5 ? 'secondary' : 'default';
            return (
              <div key={s.doctorId} className="flex items-center justify-between text-sm py-1 border-b border-dashed last:border-0">
                <span className="truncate mr-2">{s.name}</span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Badge variant="outline" className="text-xs px-1.5">
                    R:{s.republicCount}
                  </Badge>
                  <Badge variant="outline" className="text-xs px-1.5">
                    D:{s.departmentCount}
                  </Badge>
                  <Badge variant={status as 'default' | 'secondary' | 'destructive'} className="text-xs px-1.5">
                    {s.totalCount}
                  </Badge>
                  {s.weekendCount > 0 && (
                    <span className="text-xs text-amber-600">
                      ({s.weekendCount} sv.)
                    </span>
                  )}
                </div>
              </div>
            );
          })}
      </div>
      <div className="text-xs text-muted-foreground pt-2 border-t">
        Vidurkis: {average.toFixed(1)} budėjimų/gydytoją
      </div>
    </div>
  );
}
