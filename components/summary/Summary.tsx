'use client';

import { useScheduleStore } from '@/hooks/useScheduleStore';
import { Badge } from '@/components/ui/badge';
import { formatPolyclinicSchedule } from '@/lib/constants';

export function Summary() {
  const { stats, doctors, schedule } = useScheduleStore();

  if (schedule.length === 0) return null;

  const totalShifts = stats.reduce((s, st) => s + st.totalCount, 0);
  const average = doctors.length > 0 ? totalShifts / doctors.length : 0;

  // Build assigned days lookup
  const rDaysMap = new Map<string, number[]>();
  const dDaysMap = new Map<string, number[]>();
  schedule.forEach(e => {
    if (e.republicDoctor) {
      if (!rDaysMap.has(e.republicDoctor)) rDaysMap.set(e.republicDoctor, []);
      rDaysMap.get(e.republicDoctor)!.push(e.day);
    }
    if (e.departmentDoctor) {
      if (!dDaysMap.has(e.departmentDoctor)) dDaysMap.set(e.departmentDoctor, []);
      dDaysMap.get(e.departmentDoctor)!.push(e.day);
    }
  });

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-sm">Suvestinė</h3>
      <div className="space-y-2">
        {stats
          .filter(s => s.totalCount > 0 || doctors.find(d => d.id === s.doctorId))
          .sort((a, b) => b.totalCount - a.totalCount)
          .map(s => {
            const doc = doctors.find(d => d.id === s.doctorId);
            const deviation = Math.abs(s.totalCount - average);
            const status = deviation > 1.5 ? 'destructive' : deviation > 0.5 ? 'secondary' : 'default';
            const rDays = rDaysMap.get(s.doctorId) || [];
            const dDays = dDaysMap.get(s.doctorId) || [];

            return (
              <div key={s.doctorId} className="py-1.5 border-b border-dashed last:border-0">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium truncate mr-2">{s.name}</span>
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
                {/* Details row */}
                <div className="text-[11px] text-muted-foreground mt-0.5 space-y-0.5">
                  {doc && doc.polyclinicSchedule.length > 0 && (
                    <div>Polikl: {formatPolyclinicSchedule(doc.polyclinicSchedule)}</div>
                  )}
                  {rDays.length > 0 && (
                    <div>R: {rDays.join(', ')} d.</div>
                  )}
                  {dDays.length > 0 && (
                    <div>D: {dDays.join(', ')} d.</div>
                  )}
                  {doc && !doc.canRepublic && (
                    <div className="text-amber-600">Tik skyrius</div>
                  )}
                  {doc && doc.maxRepublicPerMonth && (
                    <div className="text-amber-600">Max {doc.maxRepublicPerMonth} resp.</div>
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
