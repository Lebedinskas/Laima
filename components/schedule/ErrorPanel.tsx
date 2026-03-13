'use client';

import { useScheduleStore } from '@/hooks/useScheduleStore';

export function ErrorPanel() {
  const { errors, schedule } = useScheduleStore();

  if (schedule.length === 0 || errors.length === 0) return null;

  const hardErrors = errors.filter(e => e.type === 'error');
  const warnings = errors.filter(e => e.type === 'warning');

  return (
    <div className="mt-4 space-y-3">
      {hardErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <h4 className="font-semibold text-sm text-red-700 mb-2">
            Klaidos ({hardErrors.length})
          </h4>
          <ul className="space-y-1">
            {hardErrors.map((err, i) => (
              <li key={i} className="text-sm text-red-600">• {err.message}</li>
            ))}
          </ul>
        </div>
      )}
      {warnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <h4 className="font-semibold text-sm text-amber-700 mb-2">
            Įspėjimai ({warnings.length})
          </h4>
          <ul className="space-y-1">
            {warnings.map((err, i) => (
              <li key={i} className="text-sm text-amber-600">• {err.message}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
