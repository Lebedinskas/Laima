import { Doctor, MonthConfig, ScheduleEntry } from './types';
import { checkSwapFeasibility, suggestAlternatives } from './operations';
import { WEEKDAY_NAMES_FULL } from './constants';
import type Anthropic from '@anthropic-ai/sdk';

export function buildSystemPrompt(config: MonthConfig): string {
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const weekdayNow = WEEKDAY_NAMES_FULL[now.getDay() === 0 ? 6 : now.getDay() - 1];

  return `Tu esi Laima — neurochirurgijos klinikos budėjimų grafiko asistentė.
Kalbi tik lietuviškai. Esi draugiška, profesionali ir konkreti.

KONTEKSTAS:
- Šiandien yra ${todayStr} (${weekdayNow})
- Esame Lietuvoje, Kauno klinikos, Neurochirurgijos skyrius
- Dirbame su ${config.year} m. ${config.month} mėnesio grafiku
- Savaitės dienos: Pirmadienis=0, Antradienis=1, ..., Sekmadienis=6
- Budėjimas = 24h pamaina (8:00 → kitos dienos 8:00)
- Pagal LT darbo kodeksą: max 55,5 val./savaitę, min 2 dienų poilsis tarp budėjimų
- Gydytojas negali budėti tą dieną kai dirba poliklinikoje, ir dieną PRIEŠ poliklinikos dieną

Tavo užduotis — padėti valdyti gydytojų budėjimų grafiką:
- Tikrinti ar gydytojas gali budėti konkrečią dieną
- Keisti gydytojus grafike (swap)
- Siūlyti alternatyvas kai keitimas negalimas
- Paaiškinti kodėl kažkas galima arba negalima

Kai vartotojas sako "penktadienį" arba "kitą savaitę" — apskaičiuok konkrečią dieną pagal šiandienos datą ir mėnesio kontekstą.
Kai naudoji tools, visada paaiškink rezultatą paprastai ir aiškiai.
Jei keitimas negalimas, pasiūlyk alternatyvą.
Niekada nekalbėk angliškai.`;
}

export function buildToolDefinitions(): Anthropic.Tool[] {
  return [
    {
      name: 'check_availability',
      description: 'Patikrinti ar gydytojas gali budėti konkrečią dieną konkrečiame stulpelyje. Grąžina ar tai galima ir kokios klaidos būtų.',
      input_schema: {
        type: 'object' as const,
        properties: {
          doctor_name: { type: 'string', description: 'Gydytojo pavardė arba dalis pavardės' },
          day: { type: 'number', description: 'Mėnesio diena (1-31)' },
          slot: { type: 'string', enum: ['republic', 'department'], description: 'Stulpelis: republic (už respubliką) arba department (už skyrių)' },
        },
        required: ['doctor_name', 'day', 'slot'],
      },
    },
    {
      name: 'swap_doctor',
      description: 'Pakeisti gydytoją konkrečioje dienoje ir stulpelyje. Prieš keičiant patikrina ar keitimas galimas.',
      input_schema: {
        type: 'object' as const,
        properties: {
          day: { type: 'number', description: 'Mėnesio diena' },
          slot: { type: 'string', enum: ['republic', 'department'], description: 'Stulpelis' },
          new_doctor_name: { type: 'string', description: 'Naujo gydytojo pavardė' },
        },
        required: ['day', 'slot', 'new_doctor_name'],
      },
    },
    {
      name: 'suggest_alternatives',
      description: 'Rasti visus gydytojus kurie galėtų budėti konkrečią dieną konkrečiame stulpelyje',
      input_schema: {
        type: 'object' as const,
        properties: {
          day: { type: 'number', description: 'Mėnesio diena' },
          slot: { type: 'string', enum: ['republic', 'department'], description: 'Stulpelis' },
        },
        required: ['day', 'slot'],
      },
    },
    {
      name: 'get_doctor_schedule',
      description: 'Gauti konkretaus gydytojo visus budėjimus šį mėnesį',
      input_schema: {
        type: 'object' as const,
        properties: {
          doctor_name: { type: 'string', description: 'Gydytojo pavardė' },
        },
        required: ['doctor_name'],
      },
    },
    {
      name: 'mark_unavailable',
      description: 'Pažymėti gydytoją kaip negalintį budėti konkrečią dieną',
      input_schema: {
        type: 'object' as const,
        properties: {
          doctor_name: { type: 'string', description: 'Gydytojo pavardė' },
          day: { type: 'number', description: 'Mėnesio diena' },
        },
        required: ['doctor_name', 'day'],
      },
    },
  ];
}

function findDoctor(doctors: Doctor[], nameQuery: string): Doctor | null {
  const q = nameQuery.toLowerCase();
  return doctors.find(d =>
    d.name.toLowerCase().includes(q) ||
    d.id.toLowerCase().includes(q)
  ) || null;
}

function slotToField(slot: string): 'republicDoctor' | 'departmentDoctor' {
  return slot === 'republic' ? 'republicDoctor' : 'departmentDoctor';
}

function slotToLT(slot: string): string {
  return slot === 'republic' ? 'už respubliką' : 'už skyrių';
}

export interface ToolResult {
  response: string;
  scheduleChanges?: { day: number; slot: 'republicDoctor' | 'departmentDoctor'; doctorId: string | null }[];
}

export function handleToolCall(
  toolName: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  input: any,
  schedule: ScheduleEntry[],
  doctors: Doctor[],
  config: MonthConfig
): string {
  switch (toolName) {
    case 'check_availability': {
      const doctor = findDoctor(doctors, input.doctor_name);
      if (!doctor) return `Gydytojas "${input.doctor_name}" nerastas.`;
      const field = slotToField(input.slot);
      const check = checkSwapFeasibility(schedule, doctors, config, input.day, field, doctor.id);
      if (check.feasible) {
        return `✓ ${doctor.name} GALI budėti ${input.day} d. ${slotToLT(input.slot)}. Jokių pažeidimų.`;
      } else {
        const errorMsgs = check.errors.map(e => `- ${e.message}`).join('\n');
        return `✗ ${doctor.name} NEGALI budėti ${input.day} d. ${slotToLT(input.slot)}.\nPriežastys:\n${errorMsgs}`;
      }
    }

    case 'swap_doctor': {
      const doctor = findDoctor(doctors, input.new_doctor_name);
      if (!doctor) return `Gydytojas "${input.new_doctor_name}" nerastas.`;
      const field = slotToField(input.slot);
      const entry = schedule.find(e => e.day === input.day);
      const currentDoctorId = entry?.[field];
      const currentDoctor = currentDoctorId ? doctors.find(d => d.id === currentDoctorId) : null;
      const check = checkSwapFeasibility(schedule, doctors, config, input.day, field, doctor.id);

      if (check.feasible) {
        return JSON.stringify({
          text: `✓ Pakeista! ${input.day} d. ${slotToLT(input.slot)}: ${currentDoctor?.name || 'tuščia'} → ${doctor.name}`,
          change: { day: input.day, slot: field, doctorId: doctor.id },
        });
      } else {
        const errorMsgs = check.errors.map(e => `- ${e.message}`).join('\n');
        // Also suggest alternatives
        const alts = suggestAlternatives(schedule, doctors, config, input.day, field);
        const feasibleAlts = alts.filter(a => a.errors.length === 0).slice(0, 3);
        const altText = feasibleAlts.length > 0
          ? `\n\nGalimi variantai: ${feasibleAlts.map(a => a.name).join(', ')}`
          : '\n\nDeja, šiai dienai nėra tinkamų alternatyvų.';
        return `✗ Negalima priskirti ${doctor.name} ${input.day} d. ${slotToLT(input.slot)}.\n${errorMsgs}${altText}`;
      }
    }

    case 'suggest_alternatives': {
      const field = slotToField(input.slot);
      const alts = suggestAlternatives(schedule, doctors, config, input.day, field);
      const feasible = alts.filter(a => a.errors.length === 0);
      const notFeasible = alts.filter(a => a.errors.length > 0);

      let result = `${input.day} d. ${slotToLT(input.slot)} galimi gydytojai:\n\n`;
      if (feasible.length > 0) {
        result += `✓ Tinka:\n${feasible.map(a => `  - ${a.name}`).join('\n')}\n\n`;
      }
      if (notFeasible.length > 0) {
        result += `✗ Netinka:\n${notFeasible.map(a => `  - ${a.name} (${a.errors[0]?.message || 'konfliktas'})`).join('\n')}`;
      }
      return result;
    }

    case 'get_doctor_schedule': {
      const doctor = findDoctor(doctors, input.doctor_name);
      if (!doctor) return `Gydytojas "${input.doctor_name}" nerastas.`;

      const shifts = schedule.filter(e =>
        e.republicDoctor === doctor.id || e.departmentDoctor === doctor.id
      );

      if (shifts.length === 0) return `${doctor.name} šį mėnesį neturi budėjimų.`;

      const lines = shifts.map(e => {
        const type = e.republicDoctor === doctor.id ? 'R' : 'D';
        const dayName = WEEKDAY_NAMES_FULL[e.weekday];
        return `  ${e.day} d. (${dayName}) — ${type === 'R' ? 'respublika' : 'skyrius'}`;
      });

      // Polyclinic info
      const polyDays = doctor.polyclinicSchedule.map(s =>
        `${WEEKDAY_NAMES_FULL[s.weekday]} ${s.startHour}-${s.endHour}`
      ).join(', ');

      return `${doctor.name} budėjimai:\n${lines.join('\n')}\n\nPoliklinika: ${polyDays || 'nėra'}\nIš viso: ${shifts.length} budėjimų`;
    }

    case 'mark_unavailable': {
      const doctor = findDoctor(doctors, input.doctor_name);
      if (!doctor) return `Gydytojas "${input.doctor_name}" nerastas.`;
      const dateStr = `${config.year}-${String(config.month).padStart(2, '0')}-${String(input.day).padStart(2, '0')}`;
      return JSON.stringify({
        text: `✓ ${doctor.name} pažymėtas kaip negalintis ${input.day} d.`,
        markUnavailable: { doctorId: doctor.id, date: dateStr },
      });
    }

    default:
      return `Nežinomas įrankis: ${toolName}`;
  }
}
