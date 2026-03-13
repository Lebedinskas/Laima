'use client';

import { ChangeRecord } from '@/lib/types';
import { MONTH_NAMES } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';

interface ChangeLogProps {
  changes: ChangeRecord[];
  doctorId: string;
}

export function ChangeLog({ changes, doctorId }: ChangeLogProps) {
  const sortedChanges = [...changes].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="bg-white rounded-lg border p-4">
      <h3 className="text-sm font-semibold mb-3">
        Keitimų istorija
        <Badge variant="secondary" className="ml-2 text-xs">
          {changes.length}
        </Badge>
      </h3>

      <div className="space-y-2">
        {sortedChanges.map((change) => {
          const date = new Date(change.timestamp);
          const timeStr = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
          const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

          const isIncoming = change.newDoctorId === doctorId;
          const isOutgoing = change.previousDoctorId === doctorId;
          const slotName = change.slot === 'republicDoctor' ? 'Resp.' : change.slot === 'departmentDoctor' ? 'Skyr.' : 'Rez.';

          return (
            <div
              key={change.id}
              className={`flex items-start gap-3 p-3 rounded-lg text-sm ${
                isIncoming && !isOutgoing
                  ? 'bg-green-50 border border-green-200'
                  : isOutgoing && !isIncoming
                    ? 'bg-red-50 border border-red-200'
                    : 'bg-gray-50 border border-gray-200'
              }`}
            >
              {/* Icon */}
              <div className={`mt-0.5 text-lg ${
                isIncoming && !isOutgoing ? 'text-green-500' : isOutgoing && !isIncoming ? 'text-red-500' : 'text-gray-400'
              }`}>
                {isIncoming && !isOutgoing ? '↓' : isOutgoing && !isIncoming ? '↑' : '↔'}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-[10px] px-1.5">
                    {MONTH_NAMES[change.month - 1]} {change.day} d.
                  </Badge>
                  <Badge variant="outline" className="text-[10px] px-1.5">
                    {slotName}
                  </Badge>
                  {change.isHoliday && (
                    <Badge className="text-[10px] px-1.5 bg-amber-100 text-amber-700 border-amber-300">
                      Šventė
                    </Badge>
                  )}
                  {change.isWeekend && !change.isHoliday && (
                    <Badge variant="secondary" className="text-[10px] px-1.5">
                      Savaitgalis
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-[10px] px-1.5 text-muted-foreground">
                    {change.source === 'chat' ? 'Per pokalbį' : 'Rankiniu būdu'}
                  </Badge>
                </div>
                <div className="mt-1 text-xs">
                  {change.previousDoctorName && (
                    <span className="text-red-600 line-through mr-1">{change.previousDoctorName}</span>
                  )}
                  {change.previousDoctorName && change.newDoctorName && <span className="text-gray-400 mr-1">→</span>}
                  {change.newDoctorName && (
                    <span className="text-green-700 font-medium">{change.newDoctorName}</span>
                  )}
                  {!change.newDoctorName && change.previousDoctorName && (
                    <span className="text-gray-400 italic">pašalintas</span>
                  )}
                </div>
              </div>

              {/* Timestamp */}
              <div className="text-[10px] text-muted-foreground shrink-0 text-right">
                <div>{dateStr}</div>
                <div>{timeStr}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
