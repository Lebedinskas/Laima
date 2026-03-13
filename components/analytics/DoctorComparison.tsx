'use client';

import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Doctor, DoctorStats, ScheduleEntry, MonthConfig } from '@/lib/types';
import { formatPolyclinicSchedule, WEEKDAY_NAMES_SHORT } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';

interface Shift {
  day: number;
  weekday: number;
  type: 'R' | 'D';
  isWeekend: boolean;
  isHoliday: boolean;
}

interface DoctorComparionProps {
  doctorA: Doctor;
  doctorB: Doctor;
  statA: DoctorStats;
  statB: DoctorStats;
  shiftsA: Shift[];
  shiftsB: Shift[];
  schedule: ScheduleEntry[];
  config: MonthConfig;
  averageShifts: number;
}

export function DoctorComparison({
  doctorA, doctorB, statA, statB, shiftsA, shiftsB, schedule, config, averageShifts,
}: DoctorComparionProps) {
  // Metrics comparison data
  const metricsData = useMemo(() => [
    { metrika: 'Iš viso', [doctorA.name]: statA.totalCount, [doctorB.name]: statB.totalCount },
    { metrika: 'Už resp.', [doctorA.name]: statA.republicCount, [doctorB.name]: statB.republicCount },
    { metrika: 'Už skyr.', [doctorA.name]: statA.departmentCount, [doctorB.name]: statB.departmentCount },
    { metrika: 'Savaitg.', [doctorA.name]: statA.weekendCount, [doctorB.name]: statB.weekendCount },
    { metrika: 'Šventinės', [doctorA.name]: shiftsA.filter(s => s.isHoliday).length, [doctorB.name]: shiftsB.filter(s => s.isHoliday).length },
  ], [doctorA, doctorB, statA, statB, shiftsA, shiftsB]);

  // Weekday radar comparison
  const weekdayData = useMemo(() => {
    const countsA = Array(7).fill(0);
    const countsB = Array(7).fill(0);
    shiftsA.forEach(s => countsA[s.weekday]++);
    shiftsB.forEach(s => countsB[s.weekday]++);
    return WEEKDAY_NAMES_SHORT.map((name, i) => ({
      weekday: name,
      [doctorA.name]: countsA[i],
      [doctorB.name]: countsB[i],
    }));
  }, [shiftsA, shiftsB, doctorA.name, doctorB.name]);

  // Month timeline — who works which day
  const daysInMonth = new Date(config.year, config.month, 0).getDate();
  const timelineData = useMemo(() => {
    const data = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const a = shiftsA.find(s => s.day === d);
      const b = shiftsB.find(s => s.day === d);
      data.push({
        diena: d,
        [doctorA.name]: a ? 1 : 0,
        [doctorB.name]: b ? -1 : 0,
      });
    }
    return data;
  }, [shiftsA, shiftsB, daysInMonth, doctorA.name, doctorB.name]);

  // Days where both work
  const overlapDays = useMemo(() => {
    const aDays = new Set(shiftsA.map(s => s.day));
    return shiftsB.filter(s => aDays.has(s.day)).map(s => s.day);
  }, [shiftsA, shiftsB]);

  return (
    <div className="space-y-6">
      {/* Side-by-side profiles */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ProfileCard doctor={doctorA} stat={statA} shifts={shiftsA} averageShifts={averageShifts} color="blue" />
        <ProfileCard doctor={doctorB} stat={statB} shifts={shiftsB} averageShifts={averageShifts} color="emerald" />
      </div>

      {/* Overlap info */}
      {overlapDays.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
          <span className="font-medium text-amber-800">Sutampančios dienos ({overlapDays.length}):</span>{' '}
          <span className="text-amber-700">{overlapDays.join(', ')} d.</span>
        </div>
      )}

      {/* Charts row 1: Bar comparison + Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border p-4">
          <h3 className="text-sm font-semibold mb-3">Metrikų palyginimas</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={metricsData} margin={{ bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="metrika" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey={doctorA.name} fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey={doctorB.name} fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg border p-4">
          <h3 className="text-sm font-semibold mb-3">Savaitės dienų palyginimas</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={weekdayData} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
              <YAxis type="category" dataKey="weekday" tick={{ fontSize: 11 }} width={30} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey={doctorA.name} fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={10} />
              <Bar dataKey={doctorB.name} fill="#10b981" radius={[0, 4, 4, 0]} barSize={10} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Timeline — who works when */}
      <div className="bg-white rounded-lg border p-4">
        <h3 className="text-sm font-semibold mb-3">Mėnesio budėjimų palyginimas</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={timelineData} stackOffset="sign">
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="diena" tick={{ fontSize: 9 }} />
            <YAxis hide domain={[-1.5, 1.5]} />
            <Tooltip
              formatter={(value, name) => [Math.abs(Number(value)) > 0 ? 'Budėjo' : '—', name]}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey={doctorA.name} fill="#3b82f6" radius={[2, 2, 0, 0]} />
            <Bar dataKey={doctorB.name} fill="#10b981" radius={[0, 0, 2, 2]} />
          </BarChart>
        </ResponsiveContainer>
        <div className="text-xs text-muted-foreground mt-2 text-center">
          Viršuje — {doctorA.name}, apačioje — {doctorB.name}
        </div>
      </div>
    </div>
  );
}

function ProfileCard({
  doctor, stat, shifts, averageShifts, color,
}: {
  doctor: Doctor;
  stat: DoctorStats;
  shifts: Shift[];
  averageShifts: number;
  color: 'blue' | 'emerald';
}) {
  const borderColor = color === 'blue' ? 'border-blue-300' : 'border-emerald-300';
  const bgColor = color === 'blue' ? 'bg-blue-50' : 'bg-emerald-50';
  const accentColor = color === 'blue' ? 'text-blue-700' : 'text-emerald-700';
  const dotColor = color === 'blue' ? 'bg-blue-500' : 'bg-emerald-500';

  const weekendShifts = shifts.filter(s => s.isWeekend).length;
  const holidayShifts = shifts.filter(s => s.isHoliday).length;
  const deviation = stat.totalCount - averageShifts;

  return (
    <div className={`rounded-lg border-2 ${borderColor} ${bgColor} p-4`}>
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-3 h-3 rounded-full ${dotColor}`} />
        <h3 className={`font-bold text-lg ${accentColor}`}>{doctor.name}</h3>
      </div>

      <div className="text-xs text-muted-foreground mb-3">
        Poliklinika: {formatPolyclinicSchedule(doctor.polyclinicSchedule)}
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="text-center p-2 bg-white rounded border">
          <div className="text-xl font-bold">{stat.totalCount}</div>
          <div className="text-[10px] text-muted-foreground">Iš viso</div>
        </div>
        <div className="text-center p-2 bg-white rounded border">
          <div className="text-xl font-bold">{stat.republicCount}</div>
          <div className="text-[10px] text-muted-foreground">Respublika</div>
        </div>
        <div className="text-center p-2 bg-white rounded border">
          <div className="text-xl font-bold">{stat.departmentCount}</div>
          <div className="text-[10px] text-muted-foreground">Skyrius</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 text-xs">
        <Badge variant="secondary" className="text-[10px]">
          {weekendShifts} savaitg.
        </Badge>
        <Badge variant="secondary" className="text-[10px]">
          {holidayShifts} švent.
        </Badge>
        <Badge
          variant={Math.abs(deviation) > 1.5 ? 'destructive' : 'outline'}
          className="text-[10px]"
        >
          {deviation > 0 ? '+' : ''}{deviation.toFixed(1)} nuo vidurk.
        </Badge>
        {!doctor.canRepublic && (
          <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">Tik skyrius</Badge>
        )}
        {doctor.maxRepublicPerMonth && (
          <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">
            Max {doctor.maxRepublicPerMonth} resp.
          </Badge>
        )}
      </div>

      {/* Shift days */}
      <div className="mt-3 flex flex-wrap gap-1">
        {shifts.map((s, i) => (
          <span
            key={i}
            className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${
              s.isHoliday ? 'bg-amber-200 text-amber-800'
                : s.isWeekend ? 'bg-amber-100 text-amber-700'
                  : 'bg-white text-gray-600 border'
            }`}
          >
            {s.day}
            <span className={s.type === 'R' ? 'text-blue-600' : 'text-green-600'}>{s.type}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
