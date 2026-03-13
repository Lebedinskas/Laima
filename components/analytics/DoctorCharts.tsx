'use client';

import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Cell, LineChart, Line,
} from 'recharts';
import { Doctor, DoctorStats, ScheduleEntry, ChangeRecord, MonthConfig } from '@/lib/types';
import { WEEKDAY_NAMES_SHORT } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';

interface DoctorChartsProps {
  doctor: Doctor;
  stat: DoctorStats;
  shifts: { day: number; weekday: number; type: 'R' | 'D'; isWeekend: boolean; isHoliday: boolean }[];
  schedule: ScheduleEntry[];
  doctors: Doctor[];
  stats: DoctorStats[];
  changeHistory: ChangeRecord[];
  config: MonthConfig;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

export function DoctorCharts({ doctor, stat, shifts, schedule, doctors, stats, changeHistory, config }: DoctorChartsProps) {
  // 1. Comparison with other doctors
  const comparisonData = useMemo(() => {
    return stats
      .slice()
      .sort((a, b) => b.totalCount - a.totalCount)
      .map(s => ({
        name: s.name.length > 12 ? s.name.slice(0, 12) + '…' : s.name,
        fullName: s.name,
        'Už respubliką': s.republicCount,
        'Už skyrių': s.departmentCount,
        isSelected: s.doctorId === doctor.id,
      }));
  }, [stats, doctor.id]);

  // 2. Day type distribution (pie)
  const dayTypeData = useMemo(() => {
    const weekday = shifts.filter(s => !s.isWeekend && !s.isHoliday).length;
    const weekend = shifts.filter(s => s.isWeekend && !s.isHoliday).length;
    const holiday = shifts.filter(s => s.isHoliday).length;
    return [
      { name: 'Darbo dienos', value: weekday, color: '#3b82f6' },
      { name: 'Savaitgaliai', value: weekend, color: '#f59e0b' },
      { name: 'Šventinės', value: holiday, color: '#ef4444' },
    ].filter(d => d.value > 0);
  }, [shifts]);

  // 3. Weekday distribution (radar)
  const weekdayData = useMemo(() => {
    const counts = Array(7).fill(0);
    shifts.forEach(s => counts[s.weekday]++);
    return WEEKDAY_NAMES_SHORT.map((name, i) => ({
      weekday: name,
      budėjimai: counts[i],
    }));
  }, [shifts]);

  // 4. Shift density across month (timeline)
  const daysInMonth = new Date(config.year, config.month, 0).getDate();
  const timelineData = useMemo(() => {
    const data = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const shift = shifts.find(s => s.day === d);
      data.push({
        diena: d,
        budėjimas: shift ? 1 : 0,
        tipas: shift?.type || '',
      });
    }
    return data;
  }, [shifts, daysInMonth]);

  // 5. Weekly hours
  const weeklyHoursData = useMemo(() => {
    const weeks = Object.entries(stat.weeklyHours)
      .map(([week, hours]) => ({
        savaitė: `Sav. ${week}`,
        valandos: hours,
        limitas: config.maxWeeklyHours,
      }))
      .sort((a, b) => parseInt(a.savaitė.split(' ')[1]) - parseInt(b.savaitė.split(' ')[1]));
    return weeks;
  }, [stat.weeklyHours, config.maxWeeklyHours]);

  // 6. Change frequency
  const manualChanges = changeHistory.filter(r => r.source !== 'generate');
  const changePartners = useMemo(() => {
    const partners = new Map<string, number>();
    manualChanges.forEach(r => {
      // Who was swapped with this doctor
      const partnerId = r.previousDoctorId === doctor.id ? r.newDoctorId : r.previousDoctorId;
      const partnerName = r.previousDoctorId === doctor.id ? r.newDoctorName : r.previousDoctorName;
      if (partnerId && partnerName) {
        partners.set(partnerName, (partners.get(partnerName) || 0) + 1);
      }
    });
    return Array.from(partners.entries())
      .map(([name, count]) => ({ name, keitimai: count }))
      .sort((a, b) => b.keitimai - a.keitimai);
  }, [manualChanges, doctor.id]);

  return (
    <div className="space-y-6">
      {/* Row 1: Comparison + Day type */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Comparison bar chart */}
        <div className="lg:col-span-2 bg-white rounded-lg border p-4">
          <h3 className="text-sm font-semibold mb-3">Budėjimų palyginimas su kolegomis</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={comparisonData} margin={{ bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(value, name) => [value, name]}
                labelFormatter={(label, payload) => {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const p = payload as any;
                  return p?.[0]?.payload?.fullName || label;
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Už respubliką" fill="#3b82f6" radius={[2, 2, 0, 0]} />
              <Bar dataKey="Už skyrių" fill="#10b981" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Day type breakdown */}
        <div className="bg-white rounded-lg border p-4">
          <h3 className="text-sm font-semibold mb-3">Dienų tipai</h3>
          {dayTypeData.length > 0 ? (
            <div className="flex flex-col justify-center h-[280px] space-y-4">
              {/* Stacked bar */}
              <div className="space-y-1.5">
                <div className="flex rounded-lg overflow-hidden h-8">
                  {dayTypeData.map((entry, i) => {
                    const total = dayTypeData.reduce((s, d) => s + d.value, 0);
                    const pct = total > 0 ? (entry.value / total) * 100 : 0;
                    return (
                      <div
                        key={i}
                        className="flex items-center justify-center text-white text-xs font-medium transition-all"
                        style={{ width: `${pct}%`, backgroundColor: entry.color, minWidth: pct > 0 ? '28px' : 0 }}
                      >
                        {entry.value}
                      </div>
                    );
                  })}
                </div>
                <div className="text-[10px] text-muted-foreground text-right">
                  Iš viso: {dayTypeData.reduce((s, d) => s + d.value, 0)} budėjimų
                </div>
              </div>

              {/* Stat cards */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Darbo dienos', color: '#3b82f6', bg: 'bg-blue-50', text: 'text-blue-700' },
                  { label: 'Savaitgaliai', color: '#f59e0b', bg: 'bg-amber-50', text: 'text-amber-700' },
                  { label: 'Šventinės', color: '#ef4444', bg: 'bg-red-50', text: 'text-red-700' },
                ].map(({ label, color, bg, text }) => {
                  const item = dayTypeData.find(d => d.name === label);
                  const value = item?.value ?? 0;
                  return (
                    <div key={label} className={`rounded-lg p-3 ${bg} text-center`}>
                      <div className={`text-2xl font-bold ${text}`}>{value}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{label}</div>
                      <div className="w-full h-1 rounded-full bg-white/60 mt-2">
                        <div
                          className="h-full rounded-full"
                          style={{
                            backgroundColor: color,
                            width: `${dayTypeData.reduce((s, d) => s + d.value, 0) > 0
                              ? (value / dayTypeData.reduce((s, d) => s + d.value, 0)) * 100
                              : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[280px] text-sm text-muted-foreground">
              Nėra duomenų
            </div>
          )}
        </div>
      </div>

      {/* Row 2: Weekday radar + Weekly hours */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekday distribution */}
        <div className="bg-white rounded-lg border p-4">
          <h3 className="text-sm font-semibold mb-3">Budėjimai pagal savaitės dieną</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={weekdayData} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
              <YAxis type="category" dataKey="weekday" tick={{ fontSize: 11 }} width={30} />
              <Tooltip />
              <Bar dataKey="budėjimai" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Weekly hours bar */}
        <div className="bg-white rounded-lg border p-4">
          <h3 className="text-sm font-semibold mb-3">Savaitinės valandos</h3>
          {weeklyHoursData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={weeklyHoursData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="savaitė" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value) => [`${value}h`, '']} />
                <Bar dataKey="valandos" fill="#8b5cf6" radius={[4, 4, 0, 0]}>
                  {weeklyHoursData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.valandos > config.maxWeeklyHours ? '#ef4444' : '#8b5cf6'}
                    />
                  ))}
                </Bar>
                <Line type="monotone" dataKey="limitas" stroke="#ef4444" strokeDasharray="5 5" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[260px] text-sm text-muted-foreground">
              Nėra duomenų
            </div>
          )}
        </div>
      </div>

      {/* Row 3: Month timeline + Change partners */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Month timeline */}
        <div className="lg:col-span-2 bg-white rounded-lg border p-4">
          <h3 className="text-sm font-semibold mb-3">Mėnesio budėjimų kreivė</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={timelineData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="diena" tick={{ fontSize: 9 }} />
              <YAxis hide domain={[0, 1]} />
              <Tooltip
                formatter={(value, _name, props) => {
                  if (value === 0) return ['—', 'Laisva'];
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const p = (props as any).payload;
                  return [p.tipas, `${p.diena} d.`];
                }}
              />
              <Bar dataKey="budėjimas" radius={[2, 2, 0, 0]}>
                {timelineData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.tipas === 'R' ? '#3b82f6' : entry.tipas === 'D' ? '#10b981' : '#e5e7eb'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-500" /> Respublika</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500" /> Skyrius</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-200" /> Laisva</span>
          </div>
        </div>

        {/* Change partners */}
        <div className="bg-white rounded-lg border p-4">
          <h3 className="text-sm font-semibold mb-3">Keitimų partneriai</h3>
          {changePartners.length > 0 ? (
            <div className="space-y-2">
              {changePartners.map((p, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="truncate">{p.name}</span>
                  <Badge variant="outline" className="text-xs">
                    {p.keitimai}×
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
              Keitimų nebuvo
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
