'use client';

import { Doctor, DoctorStats } from '@/lib/types';
import { formatPolyclinicSchedule, WEEKDAY_NAMES_SHORT } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';

interface DoctorProfileProps {
  doctor: Doctor;
  stat: DoctorStats;
  shifts: { day: number; weekday: number; date: string; type: 'R' | 'D'; isWeekend: boolean; isHoliday: boolean }[];
  totalDoctors: number;
  averageShifts: number;
  manualChangeCount: number;
}

export function DoctorProfile({ doctor, stat, shifts, totalDoctors, averageShifts, manualChangeCount }: DoctorProfileProps) {
  const deviation = stat.totalCount - averageShifts;
  const holidayShifts = shifts.filter(s => s.isHoliday).length;
  const weekendShifts = shifts.filter(s => s.isWeekend).length;
  const weekdayShifts = shifts.filter(s => !s.isWeekend && !s.isHoliday).length;

  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{doctor.name}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Poliklinika: {formatPolyclinicSchedule(doctor.polyclinicSchedule)}
          </p>
        </div>
        <div className="flex gap-2">
          {doctor.canRepublic && <Badge>Respublika</Badge>}
          {doctor.canDepartment && <Badge variant="secondary">Skyrius</Badge>}
          {doctor.maxRepublicPerMonth && (
            <Badge variant="outline" className="text-amber-600 border-amber-300">
              Max {doctor.maxRepublicPerMonth} resp./mėn.
            </Badge>
          )}
        </div>
      </div>

      {/* Key metrics grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <MetricCard
          label="Iš viso budėjimų"
          value={stat.totalCount}
          sublabel={`Vidurkis: ${averageShifts.toFixed(1)}`}
          color={Math.abs(deviation) > 1.5 ? 'red' : Math.abs(deviation) > 0.5 ? 'amber' : 'green'}
        />
        <MetricCard
          label="Už respubliką"
          value={stat.republicCount}
          sublabel={doctor.maxRepublicPerMonth ? `Limitas: ${doctor.maxRepublicPerMonth}` : undefined}
          color={doctor.maxRepublicPerMonth && stat.republicCount >= doctor.maxRepublicPerMonth ? 'amber' : 'blue'}
        />
        <MetricCard
          label="Už skyrių"
          value={stat.departmentCount}
          color="blue"
        />
        <MetricCard
          label="Savaitgaliai"
          value={weekendShifts}
          sublabel={`iš ${stat.totalCount} bud.`}
          color="purple"
        />
        <MetricCard
          label="Šventinės"
          value={holidayShifts}
          color="amber"
        />
        <MetricCard
          label="Darbo dienomis"
          value={weekdayShifts}
          color="gray"
        />
        <MetricCard
          label="Keitimai"
          value={manualChangeCount}
          sublabel={manualChangeCount > 0 ? 'po generavimo' : undefined}
          color={manualChangeCount > 3 ? 'red' : manualChangeCount > 0 ? 'amber' : 'gray'}
        />
      </div>

      {/* Shift list */}
      <div className="mt-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Budėjimų dienos</h3>
        <div className="flex flex-wrap gap-1.5">
          {shifts.map((s, i) => (
            <div
              key={i}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                s.isHoliday
                  ? 'bg-amber-100 text-amber-800 ring-1 ring-amber-300'
                  : s.isWeekend
                    ? 'bg-amber-50 text-amber-700'
                    : 'bg-gray-100 text-gray-700'
              }`}
            >
              <span className="font-bold">{s.day}</span>
              <span className="text-[10px]">{WEEKDAY_NAMES_SHORT[s.weekday]}</span>
              <span className={`text-[10px] font-bold ${s.type === 'R' ? 'text-blue-600' : 'text-green-600'}`}>
                {s.type}
              </span>
            </div>
          ))}
          {shifts.length === 0 && (
            <span className="text-sm text-muted-foreground">Nėra budėjimų šį mėnesį</span>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  sublabel,
  color,
}: {
  label: string;
  value: number;
  sublabel?: string;
  color: 'blue' | 'green' | 'red' | 'amber' | 'purple' | 'gray';
}) {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
    gray: 'bg-gray-50 border-gray-200 text-gray-700',
  };

  return (
    <div className={`rounded-lg border p-3 ${colorClasses[color]}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs font-medium mt-0.5">{label}</div>
      {sublabel && <div className="text-[10px] opacity-70 mt-0.5">{sublabel}</div>}
    </div>
  );
}
