import ExcelJS from 'exceljs';
import { Doctor, MonthConfig, ScheduleEntry, DoctorStats } from './types';
import { WEEKDAY_NAMES_SHORT, MONTH_NAMES } from './constants';

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

  // Title
  sheet.mergeCells('A1:E1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = `NEUROCHIRURGIJOS KLINIKOS GYDYTOJŲ IR GYD. REZIDENTŲ`;
  titleCell.font = { name: 'Arial', size: 10, bold: true };
  titleCell.alignment = { horizontal: 'center' };

  sheet.mergeCells('A2:E2');
  const titleCell2 = sheet.getCell('A2');
  titleCell2.value = `${config.year} m. ${monthName} MĖN. BUDĖJIMŲ GRAFIKAS`;
  titleCell2.font = { name: 'Arial', size: 10, bold: true };
  titleCell2.alignment = { horizontal: 'center' };

  // Headers (row 4)
  const headerRow = sheet.getRow(4);
  const headers = [
    'Diena',
    'Skubiosios medicinos\nklinika (8-16 val.\ndarbo d.)',
    'Budėjimas už\nrespubliką\n(8-8 val.)',
    'Skyrius\n(8-8 val.)',
    'Gyd. rezidentai\n(8-8 val.)',
  ];
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.font = { name: 'Arial', size: 8, bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E2F3' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = thinBorder();
  });
  headerRow.height = 45;

  // Column widths
  sheet.getColumn(1).width = 8;
  sheet.getColumn(2).width = 22;
  sheet.getColumn(3).width = 22;
  sheet.getColumn(4).width = 22;
  sheet.getColumn(5).width = 22;

  // Data rows
  schedule.forEach((entry, idx) => {
    const row = sheet.getRow(5 + idx);
    const doctor = (id: string | null) => id ? doctorMap.get(id)?.name || '' : '';

    row.getCell(1).value = `${entry.day} ${WEEKDAY_NAMES_SHORT[entry.weekday]}`;
    row.getCell(2).value = doctor(entry.clinicDoctor);
    row.getCell(3).value = doctor(entry.republicDoctor);
    row.getCell(4).value = doctor(entry.departmentDoctor);
    row.getCell(5).value = doctor(entry.residentDoctor);

    for (let c = 1; c <= 5; c++) {
      const cell = row.getCell(c);
      cell.font = { name: 'Arial', size: 9 };
      cell.border = thinBorder();
      cell.alignment = { vertical: 'middle' };

      if (entry.isWeekend || entry.isHoliday) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2CC' } };
      }
    }
  });

  // Summary on the right (columns G-K)
  const summaryStartCol = 7;
  const summaryHeaders = ['Gydytojas', 'R', 'D', 'Viso', 'Sav.'];
  const summaryHeaderRow = sheet.getRow(4);
  summaryHeaders.forEach((h, i) => {
    const cell = summaryHeaderRow.getCell(summaryStartCol + i);
    cell.value = h;
    cell.font = { name: 'Arial', size: 8, bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E2F3' } };
    cell.border = thinBorder();
    cell.alignment = { horizontal: 'center' };
  });
  sheet.getColumn(summaryStartCol).width = 20;

  stats.forEach((s, idx) => {
    const row = sheet.getRow(5 + idx);
    row.getCell(summaryStartCol).value = s.name;
    row.getCell(summaryStartCol + 1).value = s.republicCount;
    row.getCell(summaryStartCol + 2).value = s.departmentCount;
    row.getCell(summaryStartCol + 3).value = s.totalCount;
    row.getCell(summaryStartCol + 4).value = s.weekendCount;

    for (let c = 0; c < 5; c++) {
      const cell = row.getCell(summaryStartCol + c);
      cell.font = { name: 'Arial', size: 9 };
      cell.border = thinBorder();
      if (c > 0) cell.alignment = { horizontal: 'center' };
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
