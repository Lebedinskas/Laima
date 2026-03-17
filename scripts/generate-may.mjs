/**
 * Gegužės 2026 grafiko generavimas su tikrais mamos duomenimis
 * Atostogos, negali dienos, balandžio kontekstas
 */

// Helper: generate date range as YYYY-MM-DD strings
function dateRange(year, month, from, to) {
  const dates = [];
  for (let d = from; d <= to; d++) {
    dates.push(`${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`);
  }
  return dates;
}

const may = (from, to) => to ? dateRange(2026, 5, from, to) : [`2026-05-${String(from).padStart(2,'0')}`];

const doctors = [
  // ── TIK RESPUBLIKA ──
  {
    id:'tamasauskas-a', name:'Tamašauskas A.', role:'doctor',
    canRepublic:true, canDepartment:false,
    maxRepublicPerMonth:3, maxDepartmentPerMonth:null, maxTotalPerMonth:null,
    allowedWeekdays:[3], // tik ketvirtadieniais
    polyclinicSchedule:[{weekday:0,startHour:11,endHour:13}],
    unavailableDates:[],
    preferences:'',
  },
  {
    id:'vilcinis', name:'Vilcinis', role:'doctor',
    canRepublic:true, canDepartment:false,
    maxRepublicPerMonth:null, maxDepartmentPerMonth:null, maxTotalPerMonth:null,
    allowedWeekdays:null,
    polyclinicSchedule:[{weekday:2,startHour:9,endHour:12}],
    unavailableDates:[...may(20), ...may(23)], // Negali: 20, 23
    preferences:'',
  },
  {
    id:'ambrozaitis', name:'Ambrozaitis', role:'doctor',
    canRepublic:true, canDepartment:false,
    maxRepublicPerMonth:null, maxDepartmentPerMonth:null, maxTotalPerMonth:null,
    allowedWeekdays:null,
    polyclinicSchedule:[{weekday:0,startHour:8,endHour:12}],
    unavailableDates:[...may(1,3)], // Atostogos 04.27-05.03
    preferences:'',
  },
  {
    id:'vaitkevicius', name:'Vaitkevičius', role:'doctor',
    canRepublic:true, canDepartment:false,
    maxRepublicPerMonth:3, maxDepartmentPerMonth:null, maxTotalPerMonth:null,
    allowedWeekdays:null,
    polyclinicSchedule:[{weekday:2,startHour:12,endHour:16}],
    unavailableDates:[...may(18,24)], // Atostogos 18-24
    preferences:'',
  },
  {
    id:'deltuva', name:'Deltuva', role:'doctor',
    canRepublic:true, canDepartment:false,
    maxRepublicPerMonth:3, maxDepartmentPerMonth:null, maxTotalPerMonth:null,
    allowedWeekdays:[1,2], // antradieniais-trečiadieniais
    polyclinicSchedule:[{weekday:0,startHour:12,endHour:15}],
    unavailableDates:[...may(5,8)], // Atostogos 5-8
    preferences:'',
  },
  {
    id:'urbonas', name:'Urbonas', role:'doctor',
    canRepublic:true, canDepartment:false,
    maxRepublicPerMonth:3, maxDepartmentPerMonth:null, maxTotalPerMonth:null,
    allowedWeekdays:null,
    polyclinicSchedule:[{weekday:0,startHour:9,endHour:12},{weekday:3,startHour:8,endHour:12}],
    unavailableDates:[], // Jokių apribojimų gegužę
    preferences:'',
  },
  {
    id:'matukevičius', name:'Matukevičius', role:'doctor',
    canRepublic:true, canDepartment:false,
    maxRepublicPerMonth:null, maxDepartmentPerMonth:null, maxTotalPerMonth:null,
    allowedWeekdays:null,
    polyclinicSchedule:[{weekday:0,startHour:9,endHour:12}],
    unavailableDates:[], // Jokių apribojimų gegužę
    preferences:'',
  },

  // ── TIK SKYRIUS ──
  {
    id:'tamasauskas-s', name:'Tamašauskas Š.', role:'doctor',
    canRepublic:false, canDepartment:true,
    maxRepublicPerMonth:null, maxDepartmentPerMonth:null, maxTotalPerMonth:null,
    allowedWeekdays:[0,1,2,3,5,6], // negali penktadieniais
    polyclinicSchedule:[{weekday:3,startHour:12,endHour:16}],
    unavailableDates:[...may(1,10)], // Atostogos 1-10
    preferences:'',
  },
  {
    id:'tamasauskas-d', name:'Tamašauskas D.', role:'doctor',
    canRepublic:false, canDepartment:true,
    maxRepublicPerMonth:null, maxDepartmentPerMonth:null, maxTotalPerMonth:null,
    allowedWeekdays:null,
    polyclinicSchedule:[{weekday:1,startHour:12,endHour:16}],
    unavailableDates:[...may(29)], // Negali 29
    preferences:'',
  },
  {
    id:'vaisvilas', name:'Vaišvilas', role:'doctor',
    canRepublic:false, canDepartment:true,
    maxRepublicPerMonth:null, maxDepartmentPerMonth:null, maxTotalPerMonth:null,
    allowedWeekdays:null,
    polyclinicSchedule:[{weekday:1,startHour:8,endHour:12}],
    unavailableDates:[...may(1,11)], // TA iki 05.11
    preferences:'',
  },
  {
    id:'fedaravicius', name:'Fedaravičius', role:'doctor',
    canRepublic:false, canDepartment:true,
    maxRepublicPerMonth:null, maxDepartmentPerMonth:null, maxTotalPerMonth:null,
    allowedWeekdays:null,
    polyclinicSchedule:[{weekday:4,startHour:12,endHour:16}],
    unavailableDates:[...may(1,4), ...may(11)], // Atostogos 1-4, negali 11
    preferences:'',
  },
  {
    id:'piliponis', name:'Piliponis', role:'doctor',
    canRepublic:false, canDepartment:true,
    maxRepublicPerMonth:null, maxDepartmentPerMonth:null, maxTotalPerMonth:null,
    allowedWeekdays:null,
    polyclinicSchedule:[{weekday:4,startHour:8,endHour:12}],
    unavailableDates:[...may(1,3), ...may(8,10), ...may(15), ...may(22)], // A 04.25-05.03; negali 8-10, 15, 22
    preferences:'',
  },
  {
    id:'budenas', name:'Budėnas', role:'doctor',
    canRepublic:false, canDepartment:true,
    maxRepublicPerMonth:null, maxDepartmentPerMonth:null, maxTotalPerMonth:null,
    allowedWeekdays:null,
    polyclinicSchedule:[{weekday:2,startHour:12,endHour:16}],
    unavailableDates:[...may(22,24)], // Negali 22-24
    preferences:'',
  },
  {
    id:'bareikis', name:'Bareikis', role:'doctor',
    canRepublic:false, canDepartment:true,
    maxRepublicPerMonth:null, maxDepartmentPerMonth:null, maxTotalPerMonth:null,
    allowedWeekdays:null,
    polyclinicSchedule:[{weekday:1,startHour:8,endHour:13}],
    unavailableDates:[...may(8,10)], // M8 + negali 9-10
    preferences:'',
  },
  {
    id:'simaitis', name:'Simaitis', role:'doctor',
    canRepublic:false, canDepartment:true,
    maxRepublicPerMonth:null, maxDepartmentPerMonth:null, maxTotalPerMonth:null,
    allowedWeekdays:null,
    polyclinicSchedule:[{weekday:3,startHour:12,endHour:16}],
    unavailableDates:[...may(7,10), ...may(15,31)], // Negali 7-10 + Atostogos 15-31
    preferences:'',
  },
  {
    id:'sliauzys', name:'Šliaužys', role:'doctor',
    canRepublic:false, canDepartment:true,
    maxRepublicPerMonth:null, maxDepartmentPerMonth:null, maxTotalPerMonth:null,
    allowedWeekdays:null,
    polyclinicSchedule:[{weekday:2,startHour:8,endHour:12}],
    unavailableDates:[...may(26)], // Negali 26
    preferences:'',
  },

  // ── ABU STULPELIAI ──
  {
    id:'kalasauskas', name:'Kalasauskas', role:'doctor',
    canRepublic:true, canDepartment:true,
    maxRepublicPerMonth:null, maxDepartmentPerMonth:null, maxTotalPerMonth:null,
    allowedWeekdays:null,
    polyclinicSchedule:[{weekday:2,startHour:8,endHour:10}],
    unavailableDates:[...may(17,22), ...may(28)], // Negali 17-22, 28
    preferences:'',
  },
  {
    id:'radziunas', name:'Radžiūnas', role:'doctor',
    canRepublic:true, canDepartment:true,
    maxRepublicPerMonth:null, maxDepartmentPerMonth:null, maxTotalPerMonth:null,
    allowedWeekdays:null,
    polyclinicSchedule:[{weekday:0,startHour:12,endHour:16}],
    unavailableDates:[...may(9,16)], // Komandiruotė 9-16
    preferences:'',
  },
  {
    id:'marcinkevičius', name:'Marcinkevičius', role:'doctor',
    canRepublic:true, canDepartment:true,
    maxRepublicPerMonth:null, maxDepartmentPerMonth:null, maxTotalPerMonth:null,
    allowedWeekdays:null,
    polyclinicSchedule:[{weekday:3,startHour:9,endHour:12}],
    unavailableDates:[...may(4)], // Negali 4
    preferences:'',
  },
  {
    id:'bernotas', name:'Bernotas', role:'doctor',
    canRepublic:true, canDepartment:true,
    maxRepublicPerMonth:null, maxDepartmentPerMonth:null, maxTotalPerMonth:null,
    allowedWeekdays:null,
    polyclinicSchedule:[{weekday:2,startHour:10,endHour:12}],
    unavailableDates:[], // Jokių apribojimų gegužę
    preferences:'',
  },
  {
    id:'sinkūnas', name:'Šinkūnas', role:'doctor',
    canRepublic:true, canDepartment:true,
    maxRepublicPerMonth:null, maxDepartmentPerMonth:null, maxTotalPerMonth:null,
    allowedWeekdays:null,
    polyclinicSchedule:[{weekday:1,startHour:13,endHour:16}],
    unavailableDates:[...may(23)], // Negali 23
    preferences:'',
  },
  {
    id:'cikotas', name:'Čikotas', role:'doctor',
    canRepublic:true, canDepartment:true,
    maxRepublicPerMonth:null, maxDepartmentPerMonth:null, maxTotalPerMonth:null,
    allowedWeekdays:[1,2,3,4,5,6], // negali pirmadieniais
    polyclinicSchedule:[{weekday:4,startHour:8,endHour:12}],
    unavailableDates:[...may(1,3)], // Atostogos 04.27-05.03
    preferences:'',
  },

  // ── REZIDENTAI ──
  // Neurochirurgijos
  {
    id:'juskytas', name:'Juškys', role:'resident',
    canRepublic:false, canDepartment:false,
    maxRepublicPerMonth:null, maxDepartmentPerMonth:null, maxTotalPerMonth:null,
    allowedWeekdays:null, polyclinicSchedule:[], preferences:'',
    unavailableDates:[],
  },
  {
    id:'gustaitiene', name:'Gustaitienė', role:'resident',
    canRepublic:false, canDepartment:false,
    maxRepublicPerMonth:null, maxDepartmentPerMonth:null, maxTotalPerMonth:null,
    allowedWeekdays:null, polyclinicSchedule:[], preferences:'',
    unavailableDates:[...may(2,3)], // Negali 2-3
  },
  {
    id:'reimoris', name:'Reimoris', role:'resident',
    canRepublic:false, canDepartment:false,
    maxRepublicPerMonth:null, maxDepartmentPerMonth:null, maxTotalPerMonth:null,
    allowedWeekdays:null, polyclinicSchedule:[], preferences:'',
    unavailableDates:[],
  },
  {
    id:'jakstas', name:'Jakštas', role:'resident',
    canRepublic:false, canDepartment:false,
    maxRepublicPerMonth:null, maxDepartmentPerMonth:null, maxTotalPerMonth:null,
    allowedWeekdays:null, polyclinicSchedule:[], preferences:'',
    unavailableDates:[...may(1,31)], // Atostogos 05.01-06.02 (visą gegužę)
  },
  {
    id:'davainis', name:'Davainis', role:'resident',
    canRepublic:false, canDepartment:false,
    maxRepublicPerMonth:null, maxDepartmentPerMonth:null, maxTotalPerMonth:null,
    allowedWeekdays:null, polyclinicSchedule:[], preferences:'',
    unavailableDates:[...may(18), ...may(25,31)], // Negali 18; Atostogos 05.25-06.07
  },
  {
    id:'maslianikas', name:'Maslianikas', role:'resident',
    canRepublic:false, canDepartment:false,
    maxRepublicPerMonth:null, maxDepartmentPerMonth:null, maxTotalPerMonth:null,
    allowedWeekdays:null, polyclinicSchedule:[], preferences:'',
    unavailableDates:[],
  },
  // Svečiai iš kitų klinikų (budi rezidentų poste)
  {
    id:'dubosas', name:'Dubosas (OT)', role:'resident',
    canRepublic:false, canDepartment:false,
    maxRepublicPerMonth:null, maxDepartmentPerMonth:null, maxTotalPerMonth:null,
    allowedWeekdays:null, polyclinicSchedule:[], preferences:'',
    unavailableDates:[], // 05.01-06.15 — prieinamas visą gegužę
  },
  {
    id:'lukoseviciute', name:'Lukoševičiūtė (OT)', role:'resident',
    canRepublic:false, canDepartment:false,
    maxRepublicPerMonth:null, maxDepartmentPerMonth:null, maxTotalPerMonth:null,
    allowedWeekdays:null, polyclinicSchedule:[], preferences:'',
    unavailableDates:[...may(1,15)], // 05.16-06.30 — prieinamas tik nuo gegužės 16
  },
  {
    id:'drobuzaite', name:'Drobužaitė (KCh)', role:'resident',
    canRepublic:false, canDepartment:false,
    maxRepublicPerMonth:null, maxDepartmentPerMonth:null, maxTotalPerMonth:null,
    allowedWeekdays:null, polyclinicSchedule:[], preferences:'',
    unavailableDates:[...may(2), ...may(8), ...may(23)], // Negali 2, 8, 23
  },
];

const config = {year:2026, month:5, holidays:[], maxWeeklyHours:55.5, shiftDurationHours:24};

const rules = [
  {id:'max_weekly_hours',type:'max_weekly_hours',enabled:true,severity:'error',params:{hours:55.5},builtIn:true},
  {id:'min_rest_days',type:'min_rest_days',enabled:true,severity:'error',params:{days:2},builtIn:true},
  {id:'no_polyclinic_same_day',type:'no_polyclinic_same_day',enabled:true,severity:'error',params:{},builtIn:true},
  {id:'no_polyclinic_prev_day',type:'no_polyclinic_prev_day',enabled:true,severity:'error',params:{},builtIn:true},
  {id:'require_both_slots',type:'require_both_slots',enabled:true,severity:'error',params:{},builtIn:true},
  {id:'respect_unavailable',type:'respect_unavailable',enabled:true,severity:'error',params:{},builtIn:true},
  {id:'respect_slot_types',type:'respect_slot_types',enabled:true,severity:'error',params:{},builtIn:true},
  {id:'respect_monthly_limits',type:'respect_monthly_limits',enabled:true,severity:'error',params:{},builtIn:true},
  {id:'balance_distribution',type:'balance_distribution',enabled:true,severity:'warning',params:{threshold:2.5},builtIn:true},
  {id:'dept_only_priority',type:'dept_only_priority',enabled:true,severity:'warning',params:{},builtIn:true},
  {id:'max_weekend_shifts',type:'max_weekend_shifts',enabled:true,severity:'warning',params:{maxShifts:4},builtIn:true},
];

// Balandžio paskutinių dienų kontekstas (kas budėjo)
// Apr 30: R=Vilcinis, D=Marcinkevičius → jie turėtų ilsėtis May 1-2
// Apr 29: R=Radžiūnas, D=Šliaužys → ilsisi May 1
// Šie gydytojai neturėtų budėti pirmosiomis gegužės dienomis
const clinicHistory = {};

// ═══════════════════════════════════════════════════════════════
const WD = ['Pr','An','Tr','Kt','Pn','Št','Sk'];
const N = (id) => {
  if (!id) return '—';
  const d = doctors.find(d => d.id === id);
  return d ? d.name : id;
};

console.log('Siunčiama generavimo užklausa...');
const t0 = Date.now();

const res = await fetch('http://localhost:3000/api/schedule/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ doctors, config, rules, clinicHistory }),
});

if (!res.ok) {
  console.error('HTTP', res.status, await res.text());
  process.exit(1);
}

const { schedule: s } = await res.json();
const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

console.log(`\n${'═'.repeat(95)}`);
console.log(` GEGUŽĖ 2026 — ${s.length} dienų, sugeneruota per ${elapsed}s (ILP)`);
console.log(`${'═'.repeat(95)}\n`);

// ── Grafikas ──
console.log(' D. | Sav | Klinika            | Respublika         | Skyrius            | Rezidentai');
console.log('----|-----|--------------------|--------------------|--------------------|-----------------------');

for (const e of s) {
  const mark = (e.isWeekend || e.isHoliday) ? '*' : ' ';
  console.log(
    String(e.day).padStart(3) + mark + '| ' +
    WD[e.weekday].padEnd(4) + '| ' +
    N(e.clinicDoctor).padEnd(19) + '| ' +
    N(e.republicDoctor).padEnd(19) + '| ' +
    N(e.departmentDoctor).padEnd(19) + '| ' +
    N(e.residentDoctor)
  );
}

// ── Gydytojų statistika ──
console.log(`\n${'─'.repeat(95)}`);
console.log(' GYDYTOJŲ STATISTIKA');
console.log('─'.repeat(95));

const nonRes = doctors.filter(d => d.role !== 'resident');
const rC = {}, dC = {}, fridayC = {}, weekendC = {};
for (const d of nonRes) { rC[d.id] = 0; dC[d.id] = 0; fridayC[d.id] = 0; weekendC[d.id] = 0; }

for (const e of s) {
  for (const slot of ['republicDoctor', 'departmentDoctor']) {
    const did = e[slot];
    if (!did || rC[did] === undefined) continue;
    if (slot === 'republicDoctor') rC[did]++;
    else dC[did]++;
    if (e.weekday === 4) fridayC[did]++; // penktadienis
    if (e.isWeekend || e.isHoliday) weekendC[did]++;
  }
}

console.log(' Gydytojas          | R  | D  | Viso | Pnkt | Sav. | Atost./Neg. dienų');
console.log('--------------------|----|----|------|------|------|------------------');
for (const d of nonRes.sort((a, b) => a.name.localeCompare(b.name, 'lt'))) {
  const total = rC[d.id] + dC[d.id];
  const unavail = d.unavailableDates.length;
  console.log(
    ' ' + d.name.padEnd(19) + '| ' +
    String(rC[d.id]).padStart(2) + ' | ' +
    String(dC[d.id]).padStart(2) + ' | ' +
    String(total).padStart(4) + ' | ' +
    String(fridayC[d.id]).padStart(4) + ' | ' +
    String(weekendC[d.id]).padStart(4) + ' | ' +
    unavail
  );
}

const totals = nonRes.map(d => rC[d.id] + dC[d.id]);
const fridays = nonRes.map(d => fridayC[d.id]);
const weekends = nonRes.map(d => weekendC[d.id]);
console.log(`\n Budėjimai: min ${Math.min(...totals)} / vid ${(totals.reduce((a, b) => a + b, 0) / totals.length).toFixed(1)} / max ${Math.max(...totals)}`);
console.log(` Penktadieniai: min ${Math.min(...fridays)} / max ${Math.max(...fridays)}`);
console.log(` Savaitgaliai: min ${Math.min(...weekends)} / max ${Math.max(...weekends)}`);

// ── Rezidentų statistika ──
const residents = doctors.filter(d => d.role === 'resident');
const resC = {};
for (const d of residents) resC[d.id] = 0;
for (const e of s) {
  if (e.residentDoctor && resC[e.residentDoctor] !== undefined) resC[e.residentDoctor]++;
}

console.log(`\n${'─'.repeat(95)}`);
console.log(' REZIDENTŲ STATISTIKA');
console.log('─'.repeat(95));
console.log(' Rezidentas              | Bud. | Atost./Neg. dienų');
console.log('-------------------------|------|------------------');
for (const d of residents.sort((a, b) => a.name.localeCompare(b.name, 'lt'))) {
  console.log(' ' + d.name.padEnd(24) + '| ' + String(resC[d.id]).padStart(4) + ' | ' + d.unavailableDates.length);
}

// ── Problemos ──
console.log(`\n${'─'.repeat(95)}`);
console.log(' PATIKRINIMAS');
console.log('─'.repeat(95));
const emptyR = s.filter(e => !e.republicDoctor).map(e => e.day);
const emptyD = s.filter(e => !e.departmentDoctor).map(e => e.day);
const emptyRes = s.filter(e => !e.residentDoctor).map(e => e.day);
const sameRD = s.filter(e => e.republicDoctor && e.republicDoctor === e.departmentDoctor).map(e => e.day);
const sameClinicR = s.filter(e => e.clinicDoctor && e.clinicDoctor === e.republicDoctor && !e.isWeekend && !e.isHoliday).map(e => `${e.day}`);

if (emptyR.length) console.log(` ⚠️  Tuščios R dienos: ${emptyR.join(', ')}`);
if (emptyD.length) console.log(` ⚠️  Tuščios D dienos: ${emptyD.join(', ')}`);
if (emptyRes.length) console.log(` ⚠️  Tuščios rezidentų dienos: ${emptyRes.join(', ')}`);
if (sameRD.length) console.log(` ❌ R=D tas pats gydytojas: ${sameRD.join(', ')}`);
if (!emptyR.length && !emptyD.length) console.log(' ✅ Visos R ir D dienos užpildytos');
if (!sameRD.length) console.log(' ✅ R ≠ D kiekvieną dieną');

// Check unavailable violations
let violations = 0;
for (const e of s) {
  for (const slot of ['republicDoctor', 'departmentDoctor']) {
    const did = e[slot];
    if (!did) continue;
    const doc = doctors.find(d => d.id === did);
    if (doc && doc.unavailableDates.includes(e.date)) {
      console.log(` ❌ ${doc.name} paskirtas ${e.date} bet negali/atostogauja!`);
      violations++;
    }
  }
}
if (!violations) console.log(' ✅ Nėra atostogų/negali pažeidimų');
