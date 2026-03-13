import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Doctor, MonthConfig, ScheduleEntry, DoctorStats } from './types';
import { WEEKDAY_NAMES_SHORT, MONTH_NAMES, formatPolyclinicSchedule } from './constants';

export function exportToPDF(
  schedule: ScheduleEntry[],
  doctors: Doctor[],
  config: MonthConfig,
  stats: DoctorStats[]
): jsPDF {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const doctorMap = new Map(doctors.map(d => [d.id, d]));
  const monthName = MONTH_NAMES[config.month - 1].toUpperCase();
  const getName = (id: string | null) => (id ? doctorMap.get(id)?.name || '' : '');

  // ===== TITLE =====
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('NEUROCHIRURGIJOS KLINIKOS GYDYTOJU IR GYD. REZIDENTU', 148.5, 10, { align: 'center' });
  doc.text(`${config.year} m. ${monthName} MEN. BUDEJIMU GRAFIKAS`, 148.5, 16, { align: 'center' });

  // ===== SCHEDULE TABLE =====
  const scheduleHeaders = [
    'Diena',
    'Klinika\n(8-16 val.)',
    'Budejimas uz\nrespublika (8-8)',
    'Skyrius\n(16-8 / 8-8)',
    'Rezidentai',
  ];

  const scheduleBody = schedule.map(entry => [
    `${entry.day} ${WEEKDAY_NAMES_SHORT[entry.weekday]}`,
    getName(entry.clinicDoctor),
    getName(entry.republicDoctor),
    getName(entry.departmentDoctor),
    getName(entry.residentDoctor),
  ]);

  const weekendRows = new Set<number>();
  schedule.forEach((entry, i) => {
    if (entry.isWeekend || entry.isHoliday) weekendRows.add(i);
  });

  autoTable(doc, {
    startY: 20,
    head: [scheduleHeaders],
    body: scheduleBody,
    theme: 'grid',
    styles: {
      fontSize: 7,
      cellPadding: 1,
      lineWidth: 0.1,
      lineColor: [0, 0, 0],
      font: 'helvetica',
    },
    headStyles: {
      fillColor: [217, 226, 243],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 7,
    },
    columnStyles: {
      0: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 40 },
      2: { cellWidth: 40 },
      3: { cellWidth: 40 },
      4: { cellWidth: 35 },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && weekendRows.has(data.row.index)) {
        data.cell.styles.fillColor = [255, 242, 204];
        if (data.column.index > 0) {
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
  });

  // ===== DATE STAMP =====
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scheduleEndY = (doc as any).lastAutoTable?.finalY || 200;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 0, 0);
  const today = new Date();
  const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  doc.text(dateStr, 287, scheduleEndY + 5, { align: 'right' });
  doc.setTextColor(0, 0, 0);

  // ===== SUMMARY TABLE (new page if needed) =====
  const summaryStartY = scheduleEndY + 10;
  const pageHeight = doc.internal.pageSize.getHeight();

  if (summaryStartY + 20 > pageHeight) {
    doc.addPage();
  }

  const summaryHeaders = [
    'Pavarde',
    'Poliklinika',
    'Resp. dienos',
    'Skyr. dienos',
    'Atostogos',
    'Apribojimai',
    'Budej. sk.',
  ];

  const sortedDoctors = doctors.slice().sort((a, b) => a.name.localeCompare(b.name, 'lt'));

  const summaryBody = sortedDoctors.map(d => {
    const stat = stats.find(s => s.doctorId === d.id);
    const rDays: number[] = [];
    const dDays: number[] = [];
    schedule.forEach(e => {
      if (e.republicDoctor === d.id) rDays.push(e.day);
      if (e.departmentDoctor === d.id) dDays.push(e.day);
    });

    const vacationDates = d.unavailableDates
      .filter(dt => {
        const date = new Date(dt);
        return date.getFullYear() === config.year && date.getMonth() + 1 === config.month;
      })
      .map(dt => new Date(dt).getDate());

    const restrictions: string[] = [];
    if (!d.canRepublic) restrictions.push('ne resp.');
    if (!d.canDepartment) restrictions.push('ne skyr.');
    if (d.maxRepublicPerMonth) restrictions.push(`max ${d.maxRepublicPerMonth} resp.`);
    if (d.maxTotalPerMonth) restrictions.push(`max ${d.maxTotalPerMonth} viso`);

    return [
      d.name,
      formatPolyclinicSchedule(d.polyclinicSchedule),
      d.canRepublic ? (rDays.length > 0 ? rDays.join(', ') : '-') : '-',
      d.canDepartment ? (dDays.length > 0 ? dDays.join(', ') : '-') : '-',
      vacationDates.length > 0 ? vacationDates.join(', ') : '',
      restrictions.join('; '),
      stat ? String(stat.totalCount) : '0',
    ];
  });

  autoTable(doc, {
    startY: summaryStartY > pageHeight ? 15 : summaryStartY,
    head: [summaryHeaders],
    body: summaryBody,
    theme: 'grid',
    styles: {
      fontSize: 7,
      cellPadding: 1.5,
      lineWidth: 0.1,
      lineColor: [0, 0, 0],
      font: 'helvetica',
    },
    headStyles: {
      fillColor: [217, 226, 243],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 7,
    },
    columnStyles: {
      0: { cellWidth: 35, fontStyle: 'bold' },
      1: { cellWidth: 40 },
      2: { cellWidth: 35, halign: 'center' },
      3: { cellWidth: 35, halign: 'center' },
      4: { cellWidth: 25, halign: 'center' },
      5: { cellWidth: 45 },
      6: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
    },
  });

  return doc;
}

/** Download the PDF in browser */
export function downloadPDF(
  schedule: ScheduleEntry[],
  doctors: Doctor[],
  config: MonthConfig,
  stats: DoctorStats[]
): void {
  const doc = exportToPDF(schedule, doctors, config, stats);
  const monthName = MONTH_NAMES[config.month - 1];
  doc.save(`Budejimai_${config.year}_${monthName}.pdf`);
}
