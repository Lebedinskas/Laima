'use client';

import { useScheduleStore } from '@/hooks/useScheduleStore';
import { exportToXLSX } from '@/lib/export-xlsx';
import { downloadPDF } from '@/lib/export-pdf';
import { MONTH_NAMES } from '@/lib/constants';
import { Button } from '@/components/ui/button';

export function ExportButtons() {
  const { schedule, doctors, config, stats } = useScheduleStore();

  if (schedule.length === 0) return null;

  const handleExportXLSX = async () => {
    const blob = await exportToXLSX(schedule, doctors, config, stats);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Grafikas_${config.year}_${MONTH_NAMES[config.month - 1]}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    downloadPDF(schedule, doctors, config, stats);
  };

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={handleExportXLSX}>
        Eksportuoti XLSX
      </Button>
      <Button variant="outline" size="sm" onClick={handleExportPDF}>
        Eksportuoti PDF
      </Button>
    </div>
  );
}
