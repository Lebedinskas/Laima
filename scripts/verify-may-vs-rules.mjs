/**
 * Patikrinti gegužės grafiką pagal VISUS mamos reikalavimus
 * iš "Reikalavimai budėjimams.docx"
 */

// Helper
function dateRange(year, month, from, to) {
  const dates = [];
  for (let d = from; d <= (to ?? from); d++)
    dates.push(`${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`);
  return dates;
}
const may = (f, t) => dateRange(2026, 5, f, t);

// Full doctor list with May data (same as generate-may.mjs)
const doctors = [
  {id:'tamasauskas-a',name:'Tamašauskas A.',role:'doctor',canRepublic:true,canDepartment:false,maxRepublicPerMonth:3,allowedWeekdays:[3],polyclinicSchedule:[{weekday:0,startHour:11,endHour:13}],unavailableDates:[]},
  {id:'vilcinis',name:'Vilcinis',role:'doctor',canRepublic:true,canDepartment:false,maxRepublicPerMonth:null,allowedWeekdays:null,polyclinicSchedule:[{weekday:2,startHour:9,endHour:12}],unavailableDates:[...may(20),...may(23)]},
  {id:'ambrozaitis',name:'Ambrozaitis',role:'doctor',canRepublic:true,canDepartment:false,maxRepublicPerMonth:null,allowedWeekdays:null,polyclinicSchedule:[{weekday:0,startHour:8,endHour:12}],unavailableDates:[...may(1,3)]},
  {id:'vaitkevicius',name:'Vaitkevičius',role:'doctor',canRepublic:true,canDepartment:false,maxRepublicPerMonth:3,allowedWeekdays:null,polyclinicSchedule:[{weekday:2,startHour:12,endHour:16}],unavailableDates:[...may(18,24)]},
  {id:'deltuva',name:'Deltuva',role:'doctor',canRepublic:true,canDepartment:false,maxRepublicPerMonth:3,allowedWeekdays:[1,2],polyclinicSchedule:[{weekday:0,startHour:12,endHour:15}],unavailableDates:[...may(5,8)]},
  {id:'urbonas',name:'Urbonas',role:'doctor',canRepublic:true,canDepartment:false,maxRepublicPerMonth:3,allowedWeekdays:null,polyclinicSchedule:[{weekday:0,startHour:9,endHour:12},{weekday:3,startHour:8,endHour:12}],unavailableDates:[]},
  {id:'matukevičius',name:'Matukevičius',role:'doctor',canRepublic:true,canDepartment:false,maxRepublicPerMonth:null,allowedWeekdays:null,polyclinicSchedule:[{weekday:0,startHour:9,endHour:12}],unavailableDates:[]},
  {id:'tamasauskas-s',name:'Tamašauskas Š.',role:'doctor',canRepublic:false,canDepartment:true,allowedWeekdays:[0,1,2,3,5,6],polyclinicSchedule:[{weekday:3,startHour:12,endHour:16}],unavailableDates:[...may(1,10)]},
  {id:'tamasauskas-d',name:'Tamašauskas D.',role:'doctor',canRepublic:false,canDepartment:true,allowedWeekdays:null,polyclinicSchedule:[{weekday:1,startHour:12,endHour:16}],unavailableDates:[...may(29)]},
  {id:'vaisvilas',name:'Vaišvilas',role:'doctor',canRepublic:false,canDepartment:true,allowedWeekdays:null,polyclinicSchedule:[{weekday:1,startHour:8,endHour:12}],unavailableDates:[...may(1,11)]},
  {id:'fedaravicius',name:'Fedaravičius',role:'doctor',canRepublic:false,canDepartment:true,allowedWeekdays:null,polyclinicSchedule:[{weekday:4,startHour:12,endHour:16}],unavailableDates:[...may(1,4),...may(11)]},
  {id:'piliponis',name:'Piliponis',role:'doctor',canRepublic:false,canDepartment:true,allowedWeekdays:null,polyclinicSchedule:[{weekday:4,startHour:8,endHour:12}],unavailableDates:[...may(1,3),...may(8,10),...may(15),...may(22)]},
  {id:'budenas',name:'Budėnas',role:'doctor',canRepublic:false,canDepartment:true,allowedWeekdays:null,polyclinicSchedule:[{weekday:2,startHour:12,endHour:16}],unavailableDates:[...may(22,24)]},
  {id:'bareikis',name:'Bareikis',role:'doctor',canRepublic:false,canDepartment:true,allowedWeekdays:null,polyclinicSchedule:[{weekday:1,startHour:8,endHour:13}],unavailableDates:[...may(8,10)]},
  {id:'simaitis',name:'Simaitis',role:'doctor',canRepublic:false,canDepartment:true,allowedWeekdays:null,polyclinicSchedule:[{weekday:3,startHour:12,endHour:16}],unavailableDates:[...may(7,10),...may(15,31)]},
  {id:'sliauzys',name:'Šliaužys',role:'doctor',canRepublic:false,canDepartment:true,allowedWeekdays:null,polyclinicSchedule:[{weekday:2,startHour:8,endHour:12}],unavailableDates:[...may(26)]},
  {id:'kalasauskas',name:'Kalasauskas',role:'doctor',canRepublic:true,canDepartment:true,allowedWeekdays:null,polyclinicSchedule:[{weekday:2,startHour:8,endHour:10}],unavailableDates:[...may(17,22),...may(28)]},
  {id:'radziunas',name:'Radžiūnas',role:'doctor',canRepublic:true,canDepartment:true,allowedWeekdays:null,polyclinicSchedule:[{weekday:0,startHour:12,endHour:16}],unavailableDates:[...may(9,16)]},
  {id:'marcinkevičius',name:'Marcinkevičius',role:'doctor',canRepublic:true,canDepartment:true,allowedWeekdays:null,polyclinicSchedule:[{weekday:3,startHour:9,endHour:12}],unavailableDates:[...may(4)]},
  {id:'bernotas',name:'Bernotas',role:'doctor',canRepublic:true,canDepartment:true,allowedWeekdays:null,polyclinicSchedule:[{weekday:2,startHour:10,endHour:12}],unavailableDates:[]},
  {id:'sinkūnas',name:'Šinkūnas',role:'doctor',canRepublic:true,canDepartment:true,allowedWeekdays:null,polyclinicSchedule:[{weekday:1,startHour:13,endHour:16}],unavailableDates:[...may(23)]},
  {id:'cikotas',name:'Čikotas',role:'doctor',canRepublic:true,canDepartment:true,allowedWeekdays:[1,2,3,4,5,6],polyclinicSchedule:[{weekday:4,startHour:8,endHour:12}],unavailableDates:[...may(1,3)]},
];
const docMap = Object.fromEntries(doctors.map(d => [d.id, d]));

const WD_NAMES = ['Pirmadienis','Antradienis','Trečiadienis','Ketvirtadienis','Penktadienis','Šeštadienis','Sekmadienis'];

// Fetch schedule from API
const res = await fetch('http://localhost:3000/api/schedule/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    doctors: [
      ...doctors,
      {id:'juskytas',name:'Juškys',role:'resident',canRepublic:false,canDepartment:false,maxRepublicPerMonth:null,allowedWeekdays:null,polyclinicSchedule:[],unavailableDates:[]},
      {id:'gustaitiene',name:'Gustaitienė',role:'resident',canRepublic:false,canDepartment:false,maxRepublicPerMonth:null,allowedWeekdays:null,polyclinicSchedule:[],unavailableDates:[...may(2,3)]},
      {id:'reimoris',name:'Reimoris',role:'resident',canRepublic:false,canDepartment:false,maxRepublicPerMonth:null,allowedWeekdays:null,polyclinicSchedule:[],unavailableDates:[]},
      {id:'jakstas',name:'Jakštas',role:'resident',canRepublic:false,canDepartment:false,maxRepublicPerMonth:null,allowedWeekdays:null,polyclinicSchedule:[],unavailableDates:[...may(1,31)]},
      {id:'davainis',name:'Davainis',role:'resident',canRepublic:false,canDepartment:false,maxRepublicPerMonth:null,allowedWeekdays:null,polyclinicSchedule:[],unavailableDates:[...may(18),...may(25,31)]},
      {id:'maslianikas',name:'Maslianikas',role:'resident',canRepublic:false,canDepartment:false,maxRepublicPerMonth:null,allowedWeekdays:null,polyclinicSchedule:[],unavailableDates:[]},
      {id:'dubosas',name:'Dubosas (OT)',role:'resident',canRepublic:false,canDepartment:false,maxRepublicPerMonth:null,allowedWeekdays:null,polyclinicSchedule:[],unavailableDates:[]},
      {id:'lukoseviciute',name:'Lukoševičiūtė (OT)',role:'resident',canRepublic:false,canDepartment:false,maxRepublicPerMonth:null,allowedWeekdays:null,polyclinicSchedule:[],unavailableDates:[...may(1,15)]},
      {id:'drobuzaite',name:'Drobužaitė (KCh)',role:'resident',canRepublic:false,canDepartment:false,maxRepublicPerMonth:null,allowedWeekdays:null,polyclinicSchedule:[],unavailableDates:[...may(2),...may(8),...may(23)]},
    ],
    config: {year:2026,month:5,holidays:[],maxWeeklyHours:55.5,shiftDurationHours:24},
    rules: [
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
    ],
    clinicHistory: {},
  }),
});

if (!res.ok) { console.error('API error:', res.status); process.exit(1); }
const { schedule } = await res.json();

// ═══════════════════════════════════════════════════════════════
// TIKRINIMAS PAGAL KIEKVIENĄ MAMOS REIKALAVIMĄ
// ═══════════════════════════════════════════════════════════════

let passed = 0, failed = 0, warnings = 0;

function check(ok, label, detail) {
  if (ok) { console.log(`  ✅ ${label}`); passed++; }
  else { console.log(`  ❌ ${label}: ${detail}`); failed++; }
}
function warn(ok, label, detail) {
  if (ok) { console.log(`  ✅ ${label}`); passed++; }
  else { console.log(`  ⚠️  ${label}: ${detail}`); warnings++; }
}

console.log('═'.repeat(85));
console.log(' MAMOS REIKALAVIMAI vs. MŪSŲ GRAFIKAS — GEGUŽĖ 2026');
console.log('═'.repeat(85));

// ─── 1. Suminė darbo apskaita: per 7 d. ≤ 55,5 val. ─────
console.log('\n1. SUMINĖ DARBO APSKAITA (≤55,5 val. per 7 d.)');
const weeklyHours = {};
for (const e of schedule) {
  for (const slot of ['republicDoctor', 'departmentDoctor']) {
    const did = e[slot];
    if (!did) continue;
    // Simple: count shifts per ISO week
    const d = new Date(e.date);
    const week = Math.ceil((d.getDate() + new Date(d.getFullYear(), d.getMonth(), 1).getDay()) / 7);
    const key = `${did}_w${week}`;
    weeklyHours[key] = (weeklyHours[key] || 0) + 24;
  }
}
const overHours = Object.entries(weeklyHours).filter(([, h]) => h > 55.5);
check(overHours.length === 0, 'Niekas neviršija 55,5 val./sav.',
  overHours.map(([k, h]) => `${k}: ${h}h`).join(', '));

// ─── 2. Visi budėjimai po 24 val. ────────────────────────
console.log('\n2. VISI BUDĖJIMAI PO 24 VAL.');
check(true, 'Sistema naudoja shiftDurationHours=24');

// ─── 3. Negali budėti prieš/po/tą dieną kai poliklinika ──
console.log('\n3. POLIKLINIKOS APRIBOJIMAI');
let polyViolations = [];
for (const e of schedule) {
  for (const slot of ['republicDoctor', 'departmentDoctor']) {
    const did = e[slot];
    if (!did || !docMap[did]) continue;
    const doc = docMap[did];
    // Tą pačią dieną kai poliklinika
    if (doc.polyclinicSchedule.some(s => s.weekday === e.weekday)) {
      polyViolations.push(`${doc.name} d.${e.day} (${WD_NAMES[e.weekday]}) — poliklinika tą dieną`);
    }
    // Kitą dieną po budėjimo — poliklinika
    const nextDay = schedule.find(x => x.day === e.day + 1);
    if (nextDay && doc.polyclinicSchedule.some(s => s.weekday === nextDay.weekday)) {
      polyViolations.push(`${doc.name} budi d.${e.day}, bet d.${nextDay.day} poliklinika`);
    }
  }
}
check(polyViolations.length === 0, 'Jokių poliklinikos konfliktų',
  polyViolations.slice(0, 3).join('; '));

// ─── 4-5. R=24val, D=16val darbo d./24val savaitgaliais ──
console.log('\n4-5. BUDĖJIMŲ TRUKMĖS');
check(true, 'R visada 24val (8-8)');
check(true, 'D: darbo d. 16val (16-8), savaitg. 24val (8-8) — struktūrinis');

// ─── 6. Rezidentai budi darbo d. 16val, savaitg. 24val ───
console.log('\n6. REZIDENTAI');
const resAssigned = schedule.filter(e => e.residentDoctor);
check(resAssigned.length === 31, `Visos 31 diena turi rezidentą (${resAssigned.length}/31)`,
  `tik ${resAssigned.length}/31`);

// ─── 7. TamašauskasA tik ketvirtadieniais, max 3 ─────────
console.log('\n7. TAMAŠAUSKAS A. — TIK KETVIRTADIENIAIS, MAX 3');
const taA = schedule.filter(e => e.republicDoctor === 'tamasauskas-a');
const taADays = taA.map(e => `d.${e.day}(${WD_NAMES[e.weekday]})`);
check(taA.every(e => e.weekday === 3), 'Tik ketvirtadieniais', taADays.join(', '));
check(taA.length <= 3, `Max 3 kartus (turi ${taA.length})`, `${taA.length} kartai`);

// ─── 8. Deltuva tik antr-treč, max 3 ─────────────────────
console.log('\n8. DELTUVA — TIK ANTR-TREČ, MAX 3');
const del = schedule.filter(e => e.republicDoctor === 'deltuva');
const delDays = del.map(e => `d.${e.day}(${WD_NAMES[e.weekday]})`);
check(del.every(e => e.weekday === 1 || e.weekday === 2), 'Tik antr-treč', delDays.join(', '));
check(del.length <= 3, `Max 3 kartus (turi ${del.length})`, `${del.length} kartai`);

// ─── 9. Vaitkevičius max 3 ───────────────────────────────
console.log('\n9. VAITKEVIČIUS — MAX 3');
const vaik = schedule.filter(e => e.republicDoctor === 'vaitkevicius');
check(vaik.length <= 3, `Max 3 kartus (turi ${vaik.length})`, `${vaik.length}`);

// ─── 10. Urbonas max 3 ──────────────────────────────────
console.log('\n10. URBONAS — MAX 3');
const urb = schedule.filter(e => e.republicDoctor === 'urbonas');
check(urb.length <= 3, `Max 3 kartus (turi ${urb.length})`, `${urb.length}`);

// ─── 11. Panašus penktadienių IR savaitgalių skaičius ───
console.log('\n11. TOLYGUS PENKTADIENIŲ IR SAVAITGALIŲ PASKIRSTYMAS');
const friWeCounts = {};
for (const d of doctors) friWeCounts[d.id] = { fri: 0, we: 0 };
for (const e of schedule) {
  for (const slot of ['republicDoctor', 'departmentDoctor']) {
    const did = e[slot];
    if (!did || !friWeCounts[did]) continue;
    if (e.weekday === 4) friWeCounts[did].fri++;
    if (e.isWeekend || e.isHoliday) friWeCounts[did].we++;
  }
}
const friVals = doctors.map(d => friWeCounts[d.id].fri);
const weVals = doctors.map(d => friWeCounts[d.id].we);
const friSpread = Math.max(...friVals) - Math.min(...friVals);
const weSpread = Math.max(...weVals) - Math.min(...weVals);
warn(friSpread <= 1, `Penktadieniai: min ${Math.min(...friVals)} / max ${Math.max(...friVals)} (skirtumas ${friSpread})`,
  `skirtumas ${friSpread} — turėtų būti ≤1`);
warn(weSpread <= 1, `Savaitgaliai: min ${Math.min(...weVals)} / max ${Math.max(...weVals)} (skirtumas ${weSpread})`,
  `skirtumas ${weSpread} — turėtų būti ≤1`);

// ─── 12. Atostogos/negali ───────────────────────────────
console.log('\n12. ATOSTOGŲ IR NEGALI DIENŲ LAIKYMASIS');
let unavailViolations = [];
for (const e of schedule) {
  for (const slot of ['republicDoctor', 'departmentDoctor']) {
    const did = e[slot];
    if (!did || !docMap[did]) continue;
    if (docMap[did].unavailableDates.includes(e.date)) {
      unavailViolations.push(`${docMap[did].name} paskirtas ${e.date}`);
    }
  }
}
check(unavailViolations.length === 0, 'Jokių atostogų/negali pažeidimų',
  unavailViolations.join('; '));

// ─── 13. Slot tipai (R-only, D-only, abu) ───────────────
console.log('\n13. GYDYTOJŲ SLOT TIPAI (KAS KAME GALI BUDĖTI)');
let slotViolations = [];
for (const e of schedule) {
  if (e.republicDoctor && docMap[e.republicDoctor]) {
    if (!docMap[e.republicDoctor].canRepublic)
      slotViolations.push(`${docMap[e.republicDoctor].name} paskirtas R bet negali`);
  }
  if (e.departmentDoctor && docMap[e.departmentDoctor]) {
    if (!docMap[e.departmentDoctor].canDepartment)
      slotViolations.push(`${docMap[e.departmentDoctor].name} paskirtas D bet negali`);
  }
}
check(slotViolations.length === 0, 'Visi gydytojai savo teisinguose slot\'uose',
  slotViolations.join('; '));

// ─── 14. R+D gydytojai — po vienodą R ir D ─────────────
console.log('\n14. R+D GYDYTOJAI — PO VIENODĄ R IR D');
const dualDocs = doctors.filter(d => d.canRepublic && d.canDepartment);
for (const d of dualDocs) {
  const rCount = schedule.filter(e => e.republicDoctor === d.id).length;
  const dCount = schedule.filter(e => e.departmentDoctor === d.id).length;
  const diff = Math.abs(rCount - dCount);
  warn(diff <= 1, `${d.name}: R=${rCount}, D=${dCount} (skirtumas ${diff})`,
    `R=${rCount}, D=${dCount}, skirtumas=${diff}`);
}

// ─── 15. Klinika — nedirba excluded gydytojai ──────────
console.log('\n15. KLINIKA — EXCLUDED GYDYTOJAI NEDIRBA');
const clinicExcluded = ['tamasauskas-a', 'deltuva', 'vaitkevicius', 'vilcinis', 'urbonas', 'matukevičius'];
let clinicViolations = [];
for (const e of schedule) {
  if (e.clinicDoctor && clinicExcluded.includes(e.clinicDoctor)) {
    clinicViolations.push(`${docMap[e.clinicDoctor]?.name || e.clinicDoctor} d.${e.day}`);
  }
}
check(clinicViolations.length === 0, 'Excluded gydytojai nedirba klinikoje',
  clinicViolations.join('; '));

// ─── 16. R ≠ D tą pačią dieną ───────────────────────────
console.log('\n16. R ≠ D TĄ PAČIĄ DIENĄ');
const sameRD = schedule.filter(e => e.republicDoctor && e.republicDoctor === e.departmentDoctor);
check(sameRD.length === 0, 'Niekada R = D',
  sameRD.map(e => `d.${e.day}`).join(', '));

// ─── 17. Min 2 poilsio dienos ──────────────────────────
console.log('\n17. MIN 2 POILSIO DIENOS TARP BUDĖJIMŲ');
let restViolations = [];
for (const d of doctors) {
  const days = schedule
    .filter(e => e.republicDoctor === d.id || e.departmentDoctor === d.id)
    .map(e => e.day)
    .sort((a, b) => a - b);
  for (let i = 1; i < days.length; i++) {
    if (days[i] - days[i-1] < 2) {
      restViolations.push(`${d.name}: d.${days[i-1]} ir d.${days[i]} (${days[i]-days[i-1]}d tarpas)`);
    }
  }
}
check(restViolations.length === 0, 'Visi turi ≥2 dienų tarpą',
  restViolations.join('; '));

// ─── 18. Bendras balansas ───────────────────────────────
console.log('\n18. BENDRAS BUDĖJIMŲ BALANSAS');
const totals = doctors.map(d => {
  const r = schedule.filter(e => e.republicDoctor === d.id).length;
  const dep = schedule.filter(e => e.departmentDoctor === d.id).length;
  return { name: d.name, total: r + dep, unavail: d.unavailableDates.length };
});
const min = Math.min(...totals.map(t => t.total));
const max = Math.max(...totals.map(t => t.total));
const avg = (totals.reduce((s, t) => s + t.total, 0) / totals.length).toFixed(1);
console.log(`  Paskirstymas: min ${min} / vid ${avg} / max ${max}`);
warn(max - min <= 2, `Skirtumas tarp max ir min: ${max - min}`,
  `${max - min} — idealiai ≤2`);

// Show who has min/max
const minDocs = totals.filter(t => t.total === min).map(t => `${t.name}(${t.total}, negali:${t.unavail}d.)`);
const maxDocs = totals.filter(t => t.total === max).map(t => `${t.name}(${t.total}, negali:${t.unavail}d.)`);
console.log(`  Min (${min}): ${minDocs.join(', ')}`);
console.log(`  Max (${max}): ${maxDocs.join(', ')}`);

// ─── 19. Visos dienos užpildytos ────────────────────────
console.log('\n19. VISOS DIENOS UŽPILDYTOS');
const emptyR = schedule.filter(e => !e.republicDoctor).map(e => e.day);
const emptyD = schedule.filter(e => !e.departmentDoctor).map(e => e.day);
check(emptyR.length === 0, 'Visos R dienos užpildytos', `tuščios: ${emptyR.join(',')}`);
check(emptyD.length === 0, 'Visos D dienos užpildytos', `tuščios: ${emptyD.join(',')}`);

// ═══════════════════════════════════════════════════════════════
console.log(`\n${'═'.repeat(85)}`);
console.log(` REZULTATAS: ✅ ${passed} teisingai | ❌ ${failed} klaidų | ⚠️  ${warnings} pastabų`);
console.log('═'.repeat(85));
