'use client';

import { useMemo } from 'react';
import { useScheduleStore } from '@/hooks/useScheduleStore';
import { runDiagnostics, DiagnosticIssue } from '@/lib/diagnostics';
import { Badge } from '@/components/ui/badge';

const SEVERITY_STYLES: Record<DiagnosticIssue['severity'], { bg: string; text: string; label: string }> = {
  critical: { bg: 'bg-red-50 border-red-200', text: 'text-red-700', label: 'Kritinė' },
  warning: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', label: 'Perspėjimas' },
  info: { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700', label: 'Informacija' },
};

const CATEGORY_ICONS: Record<DiagnosticIssue['category'], string> = {
  capacity: '⚡',
  balance: '⚖',
  config: '⚙',
  availability: '📅',
};

export function DiagnosticsPanel() {
  const { doctors, config, rules } = useScheduleStore();

  const issues = useMemo(
    () => runDiagnostics(doctors, config, rules),
    [doctors, config, rules]
  );

  const criticalCount = issues.filter(i => i.severity === 'critical').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;
  const infoCount = issues.filter(i => i.severity === 'info').length;

  const isHealthy = criticalCount === 0 && warningCount === 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${
            criticalCount > 0 ? 'bg-red-500' : warningCount > 0 ? 'bg-amber-500' : 'bg-green-500'
          }`} />
          <h4 className="font-semibold text-sm">
            Sistemos diagnostika
          </h4>
        </div>
        <div className="flex items-center gap-1.5">
          {criticalCount > 0 && (
            <Badge variant="destructive" className="text-[10px] px-1.5 py-0">{criticalCount}</Badge>
          )}
          {warningCount > 0 && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-700">{warningCount}</Badge>
          )}
          {infoCount > 0 && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">{infoCount}</Badge>
          )}
        </div>
      </div>

      {isHealthy && (
        <div className="text-center py-3 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg">
          Visi nustatymai suderinti — sistema veikia optimaliai
        </div>
      )}

      <div className="space-y-2">
        {issues.map((issue, idx) => {
          const style = SEVERITY_STYLES[issue.severity];
          const icon = CATEGORY_ICONS[issue.category];
          return (
            <div key={idx} className={`border rounded-lg p-3 ${style.bg}`}>
              <div className="flex items-start gap-2">
                <span className="text-sm mt-0.5">{icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className={`text-xs font-semibold ${style.text}`}>{issue.title}</span>
                  </div>
                  <p className="text-[11px] text-gray-600 leading-relaxed">{issue.description}</p>
                  {issue.suggestion && (
                    <p className="text-[11px] text-gray-500 mt-1 italic">{issue.suggestion}</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
