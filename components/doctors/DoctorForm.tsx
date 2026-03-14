'use client';

import { useState } from 'react';
import { useScheduleStore } from '@/hooks/useScheduleStore';
import { Doctor, DoctorRole, PolyclinicSlot } from '@/lib/types';
import { WEEKDAY_NAMES_FULL } from '@/lib/constants';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface DoctorFormProps {
  doctor: Doctor | null; // null = new doctor
  onClose: () => void;
}

export function DoctorForm({ doctor, onClose }: DoctorFormProps) {
  const { updateDoctor, addDoctor } = useScheduleStore();
  const isNew = !doctor;

  const [name, setName] = useState(doctor?.name || '');
  const [role, setRole] = useState<DoctorRole>(doctor?.role || 'doctor');
  const [canRepublic, setCanRepublic] = useState(doctor?.canRepublic ?? true);
  const [canDepartment, setCanDepartment] = useState(doctor?.canDepartment ?? true);
  const [maxRepublic, setMaxRepublic] = useState(doctor?.maxRepublicPerMonth?.toString() || '');
  const [maxDepartment, setMaxDepartment] = useState(doctor?.maxDepartmentPerMonth?.toString() || '');
  const [maxTotal, setMaxTotal] = useState(doctor?.maxTotalPerMonth?.toString() || '');
  const [polyclinic, setPolyclinic] = useState<PolyclinicSlot[]>(doctor?.polyclinicSchedule || []);
  const [unavailable, setUnavailable] = useState(doctor?.unavailableDates.join(', ') || '');
  const [preferences, setPreferences] = useState(doctor?.preferences || '');

  // New polyclinic slot form
  const [newPolyDay, setNewPolyDay] = useState('0');
  const [newPolyStart, setNewPolyStart] = useState('8');
  const [newPolyEnd, setNewPolyEnd] = useState('12');

  const handleSave = () => {
    const data: Omit<Doctor, 'id'> & { id?: string } = {
      name,
      role,
      canRepublic,
      canDepartment,
      maxRepublicPerMonth: maxRepublic ? parseInt(maxRepublic) : null,
      maxDepartmentPerMonth: maxDepartment ? parseInt(maxDepartment) : null,
      maxTotalPerMonth: maxTotal ? parseInt(maxTotal) : null,
      polyclinicSchedule: polyclinic,
      unavailableDates: unavailable
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0),
      preferences,
    };

    if (isNew) {
      const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      addDoctor({ ...data, id } as Doctor);
    } else {
      updateDoctor(doctor.id, data);
    }
    onClose();
  };

  const addPolyclinicSlot = () => {
    setPolyclinic([
      ...polyclinic,
      {
        weekday: parseInt(newPolyDay),
        startHour: parseInt(newPolyStart),
        endHour: parseInt(newPolyEnd),
      },
    ]);
  };

  const removePolyclinicSlot = (index: number) => {
    setPolyclinic(polyclinic.filter((_, i) => i !== index));
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isNew ? 'Naujas gydytojas' : `Redaguoti: ${doctor.name}`}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label>Vardas, pavardė</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Pvz. Petraitis A." />
          </div>

          <div className="space-y-1">
            <Label>Rolė</Label>
            <Select value={role} onValueChange={(v) => v && setRole(v as DoctorRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="doctor">Gydytojas</SelectItem>
                <SelectItem value="resident">Rezidentas</SelectItem>
                <SelectItem value="head">Skyriaus vedėjas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-6">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={canRepublic} onChange={e => setCanRepublic(e.target.checked)} />
              <span className="text-sm">Gali budėti už respubliką</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={canDepartment} onChange={e => setCanDepartment(e.target.checked)} />
              <span className="text-sm">Gali budėti už skyrių</span>
            </label>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Max R/mėn.</Label>
              <Input
                type="number"
                value={maxRepublic}
                onChange={e => setMaxRepublic(e.target.value)}
                placeholder="∞"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Max D/mėn.</Label>
              <Input
                type="number"
                value={maxDepartment}
                onChange={e => setMaxDepartment(e.target.value)}
                placeholder="∞"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Max viso/mėn.</Label>
              <Input
                type="number"
                value={maxTotal}
                onChange={e => setMaxTotal(e.target.value)}
                placeholder="∞"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Poliklinikos grafikas</Label>
            {polyclinic.map((slot, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span>{WEEKDAY_NAMES_FULL[slot.weekday]} {slot.startHour}:00-{slot.endHour}:00</span>
                <Button variant="ghost" size="sm" className="h-6 text-red-500" onClick={() => removePolyclinicSlot(i)}>
                  ✗
                </Button>
              </div>
            ))}
            <div className="flex items-end gap-2">
              <Select value={newPolyDay} onValueChange={(v) => v && setNewPolyDay(v)}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WEEKDAY_NAMES_FULL.map((name, i) => (
                    <SelectItem key={i} value={i.toString()}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                className="w-16"
                value={newPolyStart}
                onChange={e => setNewPolyStart(e.target.value)}
                min={0}
                max={23}
              />
              <span className="text-sm">-</span>
              <Input
                type="number"
                className="w-16"
                value={newPolyEnd}
                onChange={e => setNewPolyEnd(e.target.value)}
                min={0}
                max={24}
              />
              <Button variant="outline" size="sm" onClick={addPolyclinicSlot}>+</Button>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Negalėjimo dienos (ISO datos, atskirtos kableliu)</Label>
            <Input
              value={unavailable}
              onChange={e => setUnavailable(e.target.value)}
              placeholder="2026-04-15, 2026-04-16"
            />
          </div>

          <div className="space-y-1">
            <Label>Pastabos / pageidavimai</Label>
            <Textarea
              value={preferences}
              onChange={e => setPreferences(e.target.value)}
              placeholder="Laisvo teksto pastabos..."
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Atšaukti</Button>
            <Button onClick={handleSave} disabled={!name.trim()}>
              {isNew ? 'Pridėti' : 'Išsaugoti'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
