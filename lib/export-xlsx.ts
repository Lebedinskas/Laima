import ExcelJS from 'exceljs';
import { Doctor, MonthConfig, ScheduleEntry, DoctorStats } from './types';
import { WEEKDAY_NAMES_SHORT, MONTH_NAMES, formatPolyclinicSchedule } from './constants';

export async function exportToXLSX(
  schedule: ScheduleEntry[],
  doctors: Doctor[],
  config: MonthConfig,
  stats: DoctorStats[]
): Promise<Blob> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Grafikas');
  const doctorMap = new Map(doctors.map(d => [d.id, d]));
  const monthName = MONTH_NAMES[config.month - 1].toUpperCase();

  // ========== TITLE ==========
  sheet.mergeCells('A1:E1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = 'NEUROCHIRURGIJOS KLINIKOS GYDYTOJŲ IR GYD. REZIDENTŲ';
  titleCell.font = { name: 'Arial', size: 10, bold: true };
  titleCell.alignment = { horizontal: 'center' };

  sheet.mergeCells('A2:E2');
  const titleCell2 = sheet.getCell('A2');
  titleCell2.value = `${config.year} m. ${monthName} MĖN. BUDĖJIMŲ GRAFIKAS`;
  titleCell2.font = { name: 'Arial', size: 10, bold: true };
  titleCell2.alignment = { horizontal: 'center' };

  // ========== SCHEDULE HEADERS (row 4) ==========
  const headerRow = sheet.getRow(4);
  const headers = [
    'Diena',
    'Skubiosios medicinos\nklinika\n(8-16 val. darbo d.)',
    'Budėjimas už\nrespubliką (8-8 val.)',
    'Skubiosios medicinos klinika,\nGalvos smeg.traumų, Stuburo,\nGSCh, Vaikų, Vaikų skubios\npag. sk. (8-8 val. poilsio,\nšventinės d.),\n(16-8 val. darbo d.)',
    'Gyd. rezidentai\n(8-8 val. poilsio,\nšventinės d.),\n(16-8 val. darbo d.)',
  ];
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.font = { name: 'Arial', size: 8, bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E2F3' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = thinBorder();
  });
  headerRow.height = 65;

  // Column widths
  sheet.getColumn(1).width = 8;
  sheet.getColumn(2).width = 22;
  sheet.getColumn(3).width = 22;
  sheet.getColumn(4).width = 28;
  sheet.getColumn(5).width = 22;

  // ========== SCHEDULE DATA ROWS ==========
  schedule.forEach((entry, idx) => {
    const row = sheet.getRow(5 + idx);
    const doctor = (id: string | null) => id ? doctorMap.get(id)?.name || '' : '';

    row.getCell(1).value = entry.day;
    row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(1).font = { name: 'Arial', size: 9, bold: true };

    row.getCell(2).value = doctor(entry.clinicDoctor);
    row.getCell(3).value = doctor(entry.republicDoctor);
    row.getCell(4).value = doctor(entry.departmentDoctor);
    row.getCell(5).value = doctor(entry.residentDoctor);

    for (let c = 1; c <= 5; c++) {
      const cell = row.getCell(c);
      if (c !== 1) cell.font = { name: 'Arial', size: 9 };
      cell.border = thinBorder();
      cell.alignment = { ...cell.alignment, vertical: 'middle' };

      if (entry.isWeekend || entry.isHoliday) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } };
        if (c !== 1) cell.font = { name: 'Arial', size: 9, bold: true };
      }
    }
  });

  // ========== DATE STAMP ==========
  const dateStampRow = 5 + schedule.length + 1;
  sheet.mergeCells(`D${dateStampRow}:E${dateStampRow}`);
  const dateCell = sheet.getCell(`D${dateStampRow}`);
  const today = new Date();
  dateCell.value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  dateCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFF0000' } };
  dateCell.alignment = { horizontal: 'right' };

  // ========== SUMMARY TABLE (below schedule) ==========
  const summaryStartRow = dateStampRow + 2;

  // Summary headers
  const summaryHeaderRow = sheet.getRow(summaryStartRow);
  const summaryHeaders = [
    'Pavardė:',
    'Poliklinika',
    'Budėj. už\nrespubliką',
    'Budėj. už\nskyrių',
    'Atostogos',
    'Negali',
    'Pageidavimai',
    'Budėjimų\nsk.',
  ];

  // We need columns A-H for the summary
  sheet.getColumn(6).width = 16;
  sheet.getColumn(7).width = 16;
  sheet.getColumn(8).width = 12;

  summaryHeaders.forEach((h, i) => {
    const cell = summaryHeaderRow.getCell(i + 1);
    cell.value = h;
    cell.font = { name: 'Arial', size: 8, bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E2F3' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = thinBorder();
  });
  summaryHeaderRow.height = 35;

  // Summary data — one row per doctor
  const sortedDoctors = doctors.slice().sort((a, b) => a.name.localeCompare(b.name, 'lt'));

  sortedDoctors.forEach((doc, idx) => {
    const row = sheet.getRow(summaryStartRow + 1 + idx);
    const stat = stats.find(s => s.doctorId === doc.id);

    // Find which days this doctor is assigned to R and D
    const rDays: number[] = [];
    const dDays: number[] = [];
    schedule.forEach(e => {
      if (e.republicDoctor === doc.id) rDays.push(e.day);
      if (e.departmentDoctor === doc.id) dDays.push(e.day);
    });

    // Pavardė
    row.getCell(1).value = doc.name;
    row.getCell(1).font = { name: 'Arial', size: 9, bold: true };

    // Poliklinika
    row.getCell(2).value = formatPolyclinicSchedule(doc.polyclinicSchedule);
    row.getCell(2).font = { name: 'Arial', size: 8 };

    // Budėj. už respubliką (day numbers)
    row.getCell(3).value = doc.canRepublic ? (rDays.length > 0 ? rDays.join(', ') : '-') : '-';
    row.getCell(3).font = { name: 'Arial', size: 9 };
    row.getCell(3).alignment = { horizontal: 'center' };

    // Budėj. už skyrių (day numbers)
    row.getCell(4).value = doc.canDepartment ? (dDays.length > 0 ? dDays.join(', ') : '-') : '-';
    row.getCell(4).font = { name: 'Arial', size: 9 };
    row.getCell(4).alignment = { horizontal: 'center' };

    // Atostogos
    const vacationDates = doc.unavailableDates
      .filter(d => {
        const date = new Date(d);
        return date.getFullYear() === config.year && date.getMonth() + 1 === config.month;
      })
      .map(d => new Date(d).getDate());
    row.getCell(5).value = vacationDates.length > 0 ? vacationDates.join(', ') : '';
    row.getCell(5).font = { name: 'Arial', size: 9 };
    row.getCell(5).alignment = { horizontal: 'center' };

    // Negali (restrictions summary)
    const negali: string[] = [];
    if (!doc.canRepublic) negali.push('ne resp.');
    if (!doc.canDepartment) negali.push('ne skyr.');
    if (doc.maxRepublicPerMonth) negali.push(`max ${doc.maxRepublicPerMonth} resp.`);
    row.getCell(6).value = negali.join('; ');
    row.getCell(6).font = { name: 'Arial', size: 8 };

    // Pageidavimai
    row.getCell(7).value = doc.preferences || '';
    row.getCell(7).font = { name: 'Arial', size: 8 };

    // Budėjimų sk.
    row.getCell(8).value = stat ? stat.totalCount : 0;
    row.getCell(8).font = { name: 'Arial', size: 9, bold: true };
    row.getCell(8).alignment = { horizontal: 'center' };

    // Borders for all cells
    for (let c = 1; c <= 8; c++) {
      row.getCell(c).border = thinBorder();
      if (!row.getCell(c).alignment) {
        row.getCell(c).alignment = { vertical: 'middle' };
      } else {
        row.getCell(c).alignment = { ...row.getCell(c).alignment, vertical: 'middle' };
      }
    }
  });

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

function thinBorder(): Partial<ExcelJS.Borders> {
  const side: Partial<ExcelJS.Border> = { style: 'thin', color: { argb: 'FF000000' } };
  return { top: side, bottom: side, left: side, right: side };
}
