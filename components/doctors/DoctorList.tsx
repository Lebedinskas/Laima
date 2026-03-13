'use client';

import { useState } from 'react';
import { useScheduleStore } from '@/hooks/useScheduleStore';
import { Doctor } from '@/lib/types';
import { WEEKDAY_NAMES_SHORT } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DoctorForm } from './DoctorForm';

export function DoctorList() {
  const { doctors, removeDoctor } = useScheduleStore();
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Gydytojai ({doctors.length})</h2>
        <Button size="sm" onClick={() => setShowNewForm(true)}>
          + Pridėti
        </Button>
      </div>

      <div className="space-y-2">
        {doctors.map(doc => (
          <div
            key={doc.id}
            className="border rounded-lg p-3 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">{doc.name}</span>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => setEditingDoctor(doc)}
                >
                  Redaguoti
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7 text-red-500 hover:text-red-700"
                  onClick={() => {
                    if (confirm(`Tikrai pašalinti ${doc.name}?`)) {
                      removeDoctor(doc.id);
                    }
                  }}
                >
                  ✗
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 text-xs">
              {doc.canRepublic && <Badge variant="outline">R</Badge>}
              {doc.canDepartment && <Badge variant="outline">D</Badge>}
              {doc.maxRepublicPerMonth !== null && (
                <Badge variant="secondary">Max R: {doc.maxRepublicPerMonth}</Badge>
              )}
              {doc.polyclinicSchedule.length > 0 && (
                <Badge variant="secondary">
                  Polikl: {doc.polyclinicSchedule.map(s =>
                    `${WEEKDAY_NAMES_SHORT[s.weekday]} ${s.startHour}-${s.endHour}`
                  ).join(', ')}
                </Badge>
              )}
              {doc.unavailableDates.length > 0 && (
                <Badge variant="destructive">
                  Negali: {doc.unavailableDates.length} d.
                </Badge>
              )}
            </div>
          </div>
        ))}
      </div>

      {(editingDoctor || showNewForm) && (
        <DoctorForm
          doctor={editingDoctor}
          onClose={() => {
            setEditingDoctor(null);
            setShowNewForm(false);
          }}
        />
      )}
    </div>
  );
}
