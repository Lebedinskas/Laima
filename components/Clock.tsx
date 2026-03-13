'use client';

import { useState, useEffect } from 'react';
import { WEEKDAY_NAMES_FULL, MONTH_NAMES } from '@/lib/constants';

export function Clock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  if (!now) return null;

  const weekday = now.getDay() === 0 ? 6 : now.getDay() - 1;
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const day = now.getDate();
  const month = MONTH_NAMES[now.getMonth()];
  const year = now.getFullYear();

  return (
    <div className="text-right text-sm text-muted-foreground">
      <div className="font-medium text-gray-700">
        {hours}:{minutes}
      </div>
      <div className="text-xs">
        {WEEKDAY_NAMES_FULL[weekday]}, {year} m. {month.toLowerCase()} {day} d.
      </div>
    </div>
  );
}
