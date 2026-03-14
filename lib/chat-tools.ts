import { Doctor, MonthConfig, ScheduleEntry, DoctorStats, ChangeRecord, ScheduleRule } from './types';
import { checkSwapFeasibility, suggestAlternatives } from './operations';
import { WEEKDAY_NAMES_FULL } from './constants';
import type Anthropic from '@anthropic-ai/sdk';

export function buildSystemPrompt(config: MonthConfig): string {
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const weekdayNow = WEEKDAY_NAMES_FULL[now.getDay() === 0 ? 6 : now.getDay() - 1];

  return `Tu esi Laima — neurochirurgijos klinikos budėjimų grafiko asistentė, veikianti kaip AI agentas.
Kalbi tik lietuviškai. Esi draugiška, profesionali ir konkreti.

SISTEMOS APŽVALGA:
Tu esi "Laima" sistemos dalis — web aplikacijos, skirtos Kauno klinikų Neurochirurgijos skyriaus gydytojų budėjimų grafiko sudarymui ir valdymui. Sistema sukurta padėti skyriaus vedėjai automatizuoti sudėtingą ~15 gydytojų budėjimų planavimo procesą.

ARCHITEKTŪRA:
- Next.js web aplikacija su Supabase duomenų baze ir autentifikacija
- Zustand store valdo visą būseną (gydytojai, grafikai, statistika)
- Tu (Claude Opus 4.6) esi NLU sluoksnis — supranti lietuvišką tekstą ir naudoji tools
- Visa scheduling/validation logika yra deterministic TypeScript (ne LLM)
- Grafikai generuojami automatiškai 12 mėn. į priekį, su auto-regeneracija pakeitus dieną
- Duomenys sinchronizuojami su Supabase (PostgreSQL) automatiškai

KONTEKSTAS:
- Šiandien yra ${todayStr} (${weekdayNow})
- Esame Lietuvoje, Kauno klinikos, Neurochirurgijos skyrius
- Dirbame su ${config.year} m. ${config.month} mėnesio grafiku
- Savaitės dienos: Pirmadienis=0, Antradienis=1, ..., Sekmadienis=6

BUDĖJIMŲ TAISYKLĖS:
- Budėjimas = 24h pamaina (8:00 → kitos dienos 8:00)
- Du gydytojai budi vienu metu: vienas "už respubliką" (R), kitas "už skyrių" (D)
- Pagal LT darbo kodeksą: max ${config.maxWeeklyHours} val./savaitę
- Min 2 dienų poilsis tarp budėjimų (negali budėti iš eilės)
- Gydytojas negali budėti tą dieną kai dirba poliklinikoje
- Gydytojas negali budėti dieną PRIEŠ poliklinikos dieną (nes budėjimas trunka iki 8:00 ryto)
- Kai kurie gydytojai gali budėti TIK už skyrių (canRepublic=false)
- Kai kuriems gydytojams yra max budėjimų limitai per mėnesį
- Savaitgaliai ir šventinės dienos: 8-8 val. (pilna para)
- Darbo dienos: budėjimas po darbo (16-8 val. poilsio/šventinėmis, arba 8-8)

GYDYTOJŲ PARAMETRAI:
Kiekvienas gydytojas turi:
- Vardą/pavardę
- canRepublic — ar gali budėti už respubliką
- canDepartment — ar gali budėti už skyrių
- polyclinicSchedule — kuriomis savaitės dienomis dirba poliklinikoje (valandos)
- unavailableDates — konkrečios datos kai negali (atostogos ir pan.)
- maxRepublicPerMonth, maxDepartmentPerMonth, maxTotalPerMonth — limitai
- preferences — laisvo teksto pageidavimai

STATISTIKA IR ANALIZĖ:
Sistema stebi kiekvieno gydytojo:
- Bendrą budėjimų skaičių (R + D)
- Savaitgalinių/šventinių budėjimų skaičių
- Savaitinių valandų viršijimą
- Keitimų istoriją (kas su kuo keitėsi, kada, kodėl)
- Mėnesinės statistikos snapshotus istoriniam palyginimui

TAVO UŽDUOTIS:
- Tikrinti ar gydytojas gali budėti konkrečią dieną (check_availability)
- Keisti gydytojus grafike (swap_doctor)
- Sukeisti du gydytojus tarpusavyje vienoje dienoje (swap_two_doctors)
- Siūlyti alternatyvas kai keitimas negalimas (suggest_alternatives)
- Rodyti gydytojo grafiką ir pilną profilį (get_doctor_schedule)
- Pažymėti nedarbingumo dienas (mark_unavailable)
- Redaguoti gydytojo parametrus: atostogas, poliklinikos dienas, limitus, pageidavimus (update_doctor)
- Pridėti atostogų laikotarpį kelioms dienoms iš karto (add_vacation)
- Pergeneruoti visą mėnesio grafiką (regenerate_schedule)
- Rodyti gydytojų statistikos palyginimą (compare_doctors)
- Ieškoti keitimų istorijoje (search_history)
- Valdyti grafiko taisykles: peržiūrėti (list_rules), įjungti/išjungti (toggle_rule), keisti parametrus (update_rule), pridėti naujas (add_custom_rule), šalinti custom (remove_rule)
- Paaiškinti kodėl kažkas galima arba negalima, nurodant konkrečią taisyklę

TAISYKLIŲ SISTEMA:
- Grafiko generavimas ir validacija naudoja dinaminę taisyklių sistemą
- Kiekviena taisyklė turi: pavadinimą, parametrus, griežtumą (error/warning), ir ar ji aktyvi
- Sisteminės taisyklės negali būti ištrintos, bet gali būti išjungtos
- Custom taisyklės gali būti pridėtos, pakeistos, ir pašalintos
- Kai vartotojas nori pakeisti taisykles — naudok atitinkamus tools
- Pvz. "pakeisk savaitės limitą į 60 valandų" → update_rule
- Pvz. "išjunk poliklinikos patikrinimą" → toggle_rule
- Po taisyklių pakeitimo rekomenduok pergeneruoti grafiką

ATMINTIS:
- Tu turi ilgalaikę atmintį — gali išsaugoti svarbius faktus naudodama save_memory tool
- Kiekviename pokalbyje gauni atsiminimus iš praeities (jei jie susiję su dabartine užklausa)
- Atsimink svarbius dalykus: gydytojų pageidavimus, asmeninius apribojimus, pasikartojančius prašymus
- Pvz. jei vartotojas sako "Tamašauskas visada nori budėti penktadieniais" — išsaugok tai
- Pvz. jei pasakoma "Simaitis kitą mėnesį atostogauja" — išsaugok tai

POKALBIO ISTORIJA:
- Tu gauni paskutines 20 žinučių iš pokalbio — naudok jas kontekstui
- Jei vartotojas nurodo "kaip anksčiau" ar "kaip sakiau" — žiūrėk istoriją

ELGESIO TAISYKLĖS:
- Kai vartotojas sako "penktadienį" arba "kitą savaitę" — apskaičiuok konkrečią dieną pagal šiandienos datą
- Kai naudoji tools, visada paaiškink rezultatą paprastai ir aiškiai
- Jei keitimas negalimas, pasiūlyk alternatyvą automatiškai
- Jei vartotojas prašo sudėtingesnio veiksmo (pvz. "sukeisk Joną ir Petrą"), išskaidyk į atskirus žingsnius
- Būk proaktyvi — jei matai potencialią problemą, perspėk
- Kai sužinai svarbų faktą — automatiškai išsaugok jį su save_memory
- Niekada nekalbėk angliškai
- Atsakymai turi būti trumpi ir aiškūs, ne ilgesni nei reikia

GRIEŽTAS APRIBOJIMAS:
Tu esi skirta IŠIMTINAI budėjimų grafikų valdymui. Neatsakinėk į klausimus, nesusijusius su:
- Gydytojų budėjimais ir grafiku
- Keitimais, atostogomis, nedarbingumu
- Klinikos darbo organizavimu
Jei vartotojas klausia kažko nesusijusio (pvz. receptai, orai, matematika, programavimas) — mandagiai pasakyk: "Atsiprašau, aš galiu padėti tik su budėjimų grafiku. Paklauskite manęs apie gydytojų budėjimus, keitimus ar grafiką!"
Niekada neatsakinėk į nesusijusius klausimus, net jei vartotojas prašo labai mandagiai.`;
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
    {
      name: 'swap_two_doctors',
      description: 'Sukeisti du gydytojus tarpusavyje toje pačioje dienoje. Pvz. jei R=Jonas ir D=Petras, po sukeitimo bus R=Petras ir D=Jonas.',
      input_schema: {
        type: 'object' as const,
        properties: {
          day: { type: 'number', description: 'Mėnesio diena' },
        },
        required: ['day'],
      },
    },
    {
      name: 'update_doctor',
      description: 'Atnaujinti gydytojo parametrus: limitus, pageidavimus, galimybes (canRepublic/canDepartment). Naudok kai vartotojas sako pvz. "Tamašauskas max 5 budėjimai" arba "Simaitis nebegali budėti už respubliką".',
      input_schema: {
        type: 'object' as const,
        properties: {
          doctor_name: { type: 'string', description: 'Gydytojo pavardė' },
          max_total: { type: 'number', description: 'Max budėjimų per mėnesį (arba null jei nėra limito)' },
          max_republic: { type: 'number', description: 'Max R budėjimų per mėnesį' },
          max_department: { type: 'number', description: 'Max D budėjimų per mėnesį' },
          can_republic: { type: 'boolean', description: 'Ar gali budėti už respubliką' },
          can_department: { type: 'boolean', description: 'Ar gali budėti už skyrių' },
          preferences: { type: 'string', description: 'Laisvo teksto pageidavimai' },
        },
        required: ['doctor_name'],
      },
    },
    {
      name: 'add_vacation',
      description: 'Pridėti atostogų laikotarpį gydytojui — pažymėti kelias dienas kaip negalimas. Pvz. "Tamašauskas atostogauja nuo 10 iki 20".',
      input_schema: {
        type: 'object' as const,
        properties: {
          doctor_name: { type: 'string', description: 'Gydytojo pavardė' },
          from_day: { type: 'number', description: 'Pirma atostogų diena' },
          to_day: { type: 'number', description: 'Paskutinė atostogų diena' },
        },
        required: ['doctor_name', 'from_day', 'to_day'],
      },
    },
    {
      name: 'regenerate_schedule',
      description: 'Pergeneruoti visą einamo mėnesio grafiką iš naujo. Naudok kai vartotojas prašo "pergeneruok", "sukurk grafiką iš naujo" arba po didelių pasikeitimų.',
      input_schema: {
        type: 'object' as const,
        properties: {},
        required: [],
      },
    },
    {
      name: 'compare_doctors',
      description: 'Palyginti kelių gydytojų statistiką šį mėnesį — budėjimų skaičius, savaitgaliai, apkrovimas.',
      input_schema: {
        type: 'object' as const,
        properties: {
          doctor_names: {
            type: 'array',
            items: { type: 'string' },
            description: 'Gydytojų pavardės (jei tuščia — rodo visus)',
          },
        },
        required: [],
      },
    },
    {
      name: 'search_history',
      description: 'Ieškoti keitimų istorijoje — kas buvo pakeista, kada, kokioje dienoje. Pvz. "kas buvo pakeista vakar?" arba "kiek kartų keitėsi 15 diena?".',
      input_schema: {
        type: 'object' as const,
        properties: {
          doctor_name: { type: 'string', description: 'Filtruoti pagal gydytoją (neprivaloma)' },
          day: { type: 'number', description: 'Filtruoti pagal dieną (neprivaloma)' },
          limit: { type: 'number', description: 'Kiek paskutinių keitimų rodyti (default: 10)' },
        },
        required: [],
      },
    },
    {
      name: 'list_rules',
      description: 'Rodyti visas grafiko taisykles — aktyvias ir neaktyvias, su parametrais.',
      input_schema: {
        type: 'object' as const,
        properties: {},
        required: [],
      },
    },
    {
      name: 'toggle_rule',
      description: 'Įjungti arba išjungti grafiko taisyklę. Pvz. "išjunk poliklinikos patikrinimą" arba "įjunk savaitgalio limitą".',
      input_schema: {
        type: 'object' as const,
        properties: {
          rule_id: { type: 'string', description: 'Taisyklės ID' },
          enabled: { type: 'boolean', description: 'true = įjungti, false = išjungti' },
        },
        required: ['rule_id', 'enabled'],
      },
    },
    {
      name: 'update_rule',
      description: 'Pakeisti taisyklės parametrus arba griežtumą. Pvz. "pakeisk savaitės limitą į 60 valandų" arba "padaryk balanso tikrinimą tik perspėjimu".',
      input_schema: {
        type: 'object' as const,
        properties: {
          rule_id: { type: 'string', description: 'Taisyklės ID' },
          severity: { type: 'string', enum: ['error', 'warning'], description: 'error = griežta klaida, warning = perspėjimas' },
          params: { type: 'object', description: 'Parametrai kaip key-value objektas, pvz. {"hours": 60} arba {"days": 3}' },
        },
        required: ['rule_id'],
      },
    },
    {
      name: 'add_custom_rule',
      description: 'Pridėti naują custom taisyklę, pvz. max savaitgalinių budėjimų limitą.',
      input_schema: {
        type: 'object' as const,
        properties: {
          name: { type: 'string', description: 'Taisyklės pavadinimas lietuviškai' },
          description: { type: 'string', description: 'Aprašymas' },
          type: { type: 'string', enum: ['max_weekend_shifts', 'custom'], description: 'Taisyklės tipas' },
          severity: { type: 'string', enum: ['error', 'warning'], description: 'Griežtumas' },
          params: { type: 'object', description: 'Parametrai' },
        },
        required: ['name', 'type', 'severity'],
      },
    },
    {
      name: 'remove_rule',
      description: 'Pašalinti custom taisyklę (sisteminių pašalinti negalima, tik išjungti).',
      input_schema: {
        type: 'object' as const,
        properties: {
          rule_id: { type: 'string', description: 'Taisyklės ID' },
        },
        required: ['rule_id'],
      },
    },
    {
      name: 'save_memory',
      description: 'Išsaugoti svarbų faktą ilgalaikei atminčiai. Naudok kai vartotojas pasako kažką svarbaus apie gydytoją, taisyklę ar pageidavimą, ką reikėtų atsiminti ateityje.',
      input_schema: {
        type: 'object' as const,
        properties: {
          content: { type: 'string', description: 'Faktas kurį reikia atsiminti' },
          category: {
            type: 'string',
            enum: ['gydytojas', 'taisyklė', 'pageidavimas', 'pastaba'],
            description: 'Kategorija: gydytojas (asmeniniai faktai), taisyklė (darbo taisyklė), pageidavimas (vartotojo pageidavimas), pastaba (kita)',
          },
        },
        required: ['content', 'category'],
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
  config: MonthConfig,
  stats: DoctorStats[] = [],
  changeHistory: ChangeRecord[] = [],
  rules: ScheduleRule[] = []
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
        const feasibleAlts = alts.filter(a => a.newErrors.length === 0).slice(0, 3);
        const altText = feasibleAlts.length > 0
          ? `\n\nGalimi variantai: ${feasibleAlts.map(a => a.name).join(', ')}`
          : '\n\nDeja, šiai dienai nėra tinkamų alternatyvų.';
        return `✗ Negalima priskirti ${doctor.name} ${input.day} d. ${slotToLT(input.slot)}.\n${errorMsgs}${altText}`;
      }
    }

    case 'suggest_alternatives': {
      const field = slotToField(input.slot);
      const alts = suggestAlternatives(schedule, doctors, config, input.day, field);
      const feasible = alts.filter(a => a.newErrors.length === 0);
      const notFeasible = alts.filter(a => a.newErrors.length > 0);

      let result = `${input.day} d. ${slotToLT(input.slot)} galimi gydytojai:\n\n`;
      if (feasible.length > 0) {
        result += `✓ Tinka:\n${feasible.map(a => `  - ${a.name}`).join('\n')}\n\n`;
      }
      if (notFeasible.length > 0) {
        result += `✗ Netinka:\n${notFeasible.map(a => `  - ${a.name} (${a.newErrors[0]?.message || 'konfliktas'})`).join('\n')}`;
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

    case 'swap_two_doctors': {
      const entry = schedule.find(e => e.day === input.day);
      if (!entry) return `Diena ${input.day} nerasta grafike.`;
      const repId = entry.republicDoctor;
      const depId = entry.departmentDoctor;
      if (!repId || !depId) return `${input.day} d. nėra abiejų gydytojų (R ir D) — negalima sukeisti.`;

      const repDoc = doctors.find(d => d.id === repId);
      const depDoc = doctors.find(d => d.id === depId);

      // Check if swap is feasible both ways
      const checkRep = checkSwapFeasibility(schedule, doctors, config, input.day, 'republicDoctor', depId);
      const checkDep = checkSwapFeasibility(schedule, doctors, config, input.day, 'departmentDoctor', repId);

      if (checkRep.feasible && checkDep.feasible) {
        return JSON.stringify({
          text: `✓ Sukeista! ${input.day} d.: R: ${repDoc?.name} → ${depDoc?.name}, D: ${depDoc?.name} → ${repDoc?.name}`,
          changes: [
            { day: input.day, slot: 'republicDoctor', doctorId: depId },
            { day: input.day, slot: 'departmentDoctor', doctorId: repId },
          ],
        });
      } else {
        const allErrors = [...checkRep.errors, ...checkDep.errors];
        return `✗ Negalima sukeisti ${repDoc?.name} ir ${depDoc?.name} ${input.day} d.\nPriežastys:\n${allErrors.map(e => `- ${e.message}`).join('\n')}`;
      }
    }

    case 'update_doctor': {
      const doctor = findDoctor(doctors, input.doctor_name);
      if (!doctor) return `Gydytojas "${input.doctor_name}" nerastas.`;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updates: Record<string, any> = {};
      const changes: string[] = [];

      if (input.max_total !== undefined) {
        updates.maxTotalPerMonth = input.max_total;
        changes.push(`max budėjimų/mėn: ${input.max_total || 'be limito'}`);
      }
      if (input.max_republic !== undefined) {
        updates.maxRepublicPerMonth = input.max_republic;
        changes.push(`max R/mėn: ${input.max_republic || 'be limito'}`);
      }
      if (input.max_department !== undefined) {
        updates.maxDepartmentPerMonth = input.max_department;
        changes.push(`max D/mėn: ${input.max_department || 'be limito'}`);
      }
      if (input.can_republic !== undefined) {
        updates.canRepublic = input.can_republic;
        changes.push(`gali R: ${input.can_republic ? 'taip' : 'ne'}`);
      }
      if (input.can_department !== undefined) {
        updates.canDepartment = input.can_department;
        changes.push(`gali D: ${input.can_department ? 'taip' : 'ne'}`);
      }
      if (input.preferences !== undefined) {
        updates.preferences = input.preferences;
        changes.push(`pageidavimai: "${input.preferences}"`);
      }

      if (changes.length === 0) return 'Nenurodyta ką keisti.';

      return JSON.stringify({
        text: `✓ ${doctor.name} atnaujintas:\n${changes.map(c => `  - ${c}`).join('\n')}`,
        updateDoctor: { doctorId: doctor.id, updates },
      });
    }

    case 'add_vacation': {
      const doctor = findDoctor(doctors, input.doctor_name);
      if (!doctor) return `Gydytojas "${input.doctor_name}" nerastas.`;

      const fromDay = input.from_day;
      const toDay = input.to_day;
      if (fromDay > toDay) return 'Pirma diena turi būti mažesnė arba lygi paskutinei.';

      const dates: string[] = [];
      for (let d = fromDay; d <= toDay; d++) {
        dates.push(`${config.year}-${String(config.month).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
      }

      const dayCount = toDay - fromDay + 1;
      return JSON.stringify({
        text: `✓ ${doctor.name} atostogos: ${fromDay}–${toDay} d. (${dayCount} d.)`,
        addVacation: { doctorId: doctor.id, dates },
      });
    }

    case 'regenerate_schedule': {
      return JSON.stringify({
        text: '✓ Grafikas pergeneruotas iš naujo.',
        regenerate: true,
      });
    }

    case 'compare_doctors': {
      if (stats.length === 0) return 'Statistika dar neskaičiuota — pirma sugeneruokite grafiką.';

      let filtered = stats.filter(s => s.totalCount > 0);
      if (input.doctor_names && input.doctor_names.length > 0) {
        filtered = stats.filter(s =>
          input.doctor_names.some((name: string) => s.name.toLowerCase().includes(name.toLowerCase()))
        );
        if (filtered.length === 0) return 'Nurodyti gydytojai neturi budėjimų šį mėnesį.';
      }

      filtered.sort((a, b) => b.totalCount - a.totalCount);

      const lines = filtered.map((s, i) => {
        const bar = '█'.repeat(s.totalCount);
        return `${i + 1}. ${s.name}: ${bar} ${s.totalCount} (R:${s.republicCount} D:${s.departmentCount} SV:${s.weekendCount})`;
      });

      const avgTotal = filtered.reduce((sum, s) => sum + s.totalCount, 0) / filtered.length;
      const maxDoc = filtered[0];
      const minDoc = filtered[filtered.length - 1];

      let summary = `\nVidurkis: ${avgTotal.toFixed(1)} bud./gydytojas`;
      if (maxDoc && minDoc && maxDoc.name !== minDoc.name) {
        summary += `\nDaugiausiai: ${maxDoc.name} (${maxDoc.totalCount})`;
        summary += `\nMažiausiai: ${minDoc.name} (${minDoc.totalCount})`;
        const diff = maxDoc.totalCount - minDoc.totalCount;
        if (diff > 3) summary += `\n⚠ Skirtumas ${diff} bud. — galbūt reikia balansuoti.`;
      }

      return `Budėjimų statistika:\n${lines.join('\n')}${summary}`;
    }

    case 'search_history': {
      if (changeHistory.length === 0) return 'Keitimų istorija tuščia.';

      let filtered = changeHistory.filter(r => r.source !== 'generate');

      if (input.doctor_name) {
        const q = input.doctor_name.toLowerCase();
        filtered = filtered.filter(r =>
          (r.previousDoctorName?.toLowerCase().includes(q)) ||
          (r.newDoctorName?.toLowerCase().includes(q))
        );
      }
      if (input.day) {
        filtered = filtered.filter(r => r.day === input.day);
      }

      const limit = input.limit || 10;
      const recent = filtered.slice(-limit);

      if (recent.length === 0) return 'Pagal šiuos kriterijus keitimų nerasta.';

      const lines = recent.map(c => {
        const date = new Date(c.timestamp);
        const dateStr = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
        const slotName = c.slot === 'republicDoctor' ? 'R' : 'D';
        return `• ${dateStr} | ${c.year}-${String(c.month).padStart(2, '0')}-${String(c.day).padStart(2, '0')} ${slotName}: ${c.previousDoctorName || '—'} → ${c.newDoctorName || '—'} (${c.source})`;
      });

      return `Keitimų istorija (${recent.length}/${filtered.length}):\n${lines.join('\n')}`;
    }

    case 'list_rules': {
      if (rules.length === 0) return 'Taisyklių sąrašas tuščias.';
      const lines = rules.map(r => {
        const status = r.enabled ? '✓' : '✗';
        const sev = r.severity === 'error' ? 'griežta' : 'perspėjimas';
        const params = Object.keys(r.params).length > 0
          ? ` [${Object.entries(r.params).map(([k, v]) => `${k}=${v}`).join(', ')}]`
          : '';
        const lock = r.builtIn ? '' : ' (custom)';
        return `${status} ${r.name} (${sev})${params}${lock}\n   ID: ${r.id} — ${r.description}`;
      });
      return `Grafiko taisyklės (${rules.filter(r => r.enabled).length}/${rules.length} aktyvios):\n\n${lines.join('\n\n')}`;
    }

    case 'toggle_rule': {
      const rule = rules.find(r => r.id === input.rule_id);
      if (!rule) return `Taisyklė "${input.rule_id}" nerasta.`;
      const action = input.enabled ? 'įjungta' : 'išjungta';
      return JSON.stringify({
        text: `✓ Taisyklė "${rule.name}" ${action}.`,
        ruleUpdate: { ruleId: input.rule_id, updates: { enabled: input.enabled } },
      });
    }

    case 'update_rule': {
      const rule = rules.find(r => r.id === input.rule_id);
      if (!rule) return `Taisyklė "${input.rule_id}" nerasta.`;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updates: Record<string, any> = {};
      const changes: string[] = [];
      if (input.severity) {
        updates.severity = input.severity;
        changes.push(`griežtumas: ${input.severity === 'error' ? 'klaida' : 'perspėjimas'}`);
      }
      if (input.params) {
        updates.params = { ...rule.params, ...input.params };
        changes.push(`parametrai: ${JSON.stringify(input.params)}`);
      }
      return JSON.stringify({
        text: `✓ Taisyklė "${rule.name}" atnaujinta:\n${changes.map(c => `  - ${c}`).join('\n')}`,
        ruleUpdate: { ruleId: input.rule_id, updates },
      });
    }

    case 'add_custom_rule': {
      const id = `custom_${Date.now()}`;
      return JSON.stringify({
        text: `✓ Pridėta nauja taisyklė: "${input.name}"`,
        addRule: {
          id,
          name: input.name,
          description: input.description || input.name,
          type: input.type,
          enabled: true,
          severity: input.severity,
          params: input.params || {},
          builtIn: false,
        },
      });
    }

    case 'remove_rule': {
      const rule = rules.find(r => r.id === input.rule_id);
      if (!rule) return `Taisyklė "${input.rule_id}" nerasta.`;
      if (rule.builtIn) return `✗ Taisyklė "${rule.name}" yra sisteminė — jos pašalinti negalima. Galite tik išjungti (toggle_rule).`;
      return JSON.stringify({
        text: `✓ Taisyklė "${rule.name}" pašalinta.`,
        removeRule: input.rule_id,
      });
    }

    default:
      return `Nežinomas įrankis: ${toolName}`;
  }
}
