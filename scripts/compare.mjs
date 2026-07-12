import { readFileSync } from 'fs';

const CH2_PATH = process.argv[2] || 'D:/GitHub/CourtHarvest2/data_20260712/courts.json';

const ch2 = JSON.parse(readFileSync(CH2_PATH, 'utf-8'));
const sudrf = JSON.parse(readFileSync('./data/courts.json', 'utf-8'));

const ch2codes = new Map(ch2.courts.map(c => [c.code, c]));
const sudrfCodes = new Map(sudrf.courts.map(c => [c.code, c]));

const onlyCH2 = ch2.courts.filter(c => !sudrfCodes.has(c.code));
const onlySudrf = sudrf.courts.filter(c => !ch2codes.has(c.code));
const both = ch2.courts.filter(c => sudrfCodes.has(c.code));

console.log('='.repeat(80));
console.log('  СРАВНЕНИЕ БАЗ: CourtHarvest2 vs CourtSudrf');
console.log('='.repeat(80));
console.log('');
console.log('  CourtHarvest2 (DaData): ' + ch2.meta.totalCourts + ' записей');
console.log('  CourtSudrf (sudrf.ru):  ' + sudrf.meta.totalCourts + ' записей');
console.log('  Пересечение (есть в обеих): ' + both.length);
console.log('  Только в CH2:             ' + onlyCH2.length);
console.log('  Только в sudrf.ru:        ' + onlySudrf.length);

console.log('');
console.log('─'.repeat(80));
console.log('  РАСХОЖДЕНИЯ ПО ТИПАМ СУДОВ');
console.log('─'.repeat(80));

const ch2ByType = {}, sudrfByType = {}, onlyCh2ByType = {}, onlySByType = {};
for (const c of ch2.courts) {
  const t = c.court_type;
  ch2ByType[t] = (ch2ByType[t]||0) + 1;
  if (!sudrfCodes.has(c.code)) onlyCh2ByType[t] = (onlyCh2ByType[t]||0) + 1;
}
for (const c of sudrf.courts) {
  const t = c.court_type;
  sudrfByType[t] = (sudrfByType[t]||0) + 1;
  if (!ch2codes.has(c.code)) onlySByType[t] = (onlySByType[t]||0) + 1;
}

const allTypes = [...new Set([...Object.keys(ch2ByType), ...Object.keys(sudrfByType)])].sort();
const typeNames = {
  RS:'Районные', MS:'Мировые', OS:'Областные', AS:'Арбитражные субъекта',
  AA:'Арбитражные апелляц.', AO:'Арбитражные округа', AI:'Интеллект. права',
  VS:'ВС РФ', GV:'Гарнизонные воен.', OV:'Окружные воен.',
  KJ:'Кассационные', AJ:'Апелляционные', KV:'Кассационные воен.',
  AV:'Апелляц. воен.', UD:'УСД'
};

console.log('');
console.log('  Тип  Расшифровка'.padEnd(35) + 'CH2'.padEnd(7) + 'Sudrf'.padEnd(7) + ' +/-  Только CH2  Только sudrf');
console.log('  ' + '-'.repeat(78));
for (const t of allTypes) {
  const ch2n = ch2ByType[t]||0;
  const srn = sudrfByType[t]||0;
  const diff = srn - ch2n;
  const oCh2 = onlyCh2ByType[t]||0;
  const oSr = onlySByType[t]||0;
  const nm = typeNames[t]||t;
  console.log('  ' + t.padEnd(5) + nm.padEnd(28) +
    String(ch2n).padStart(6) + ' ' + String(srn).padStart(6) + ' ' +
    (diff >= 0 ? '+' : '').padStart(1) + String(diff).padStart(4) + ' ' +
    String(oCh2).padStart(8) + ' ' + String(oSr).padStart(12));
}

console.log('');
console.log('─'.repeat(80));
console.log('  ТОЛЬКО В CourtHarvest2 (нет в sudrf.ru) — ' + onlyCH2.length + ' шт');
console.log('─'.repeat(80));

const ocByType = {};
for (const c of onlyCH2) {
  const t = c.court_type;
  if (!ocByType[t]) ocByType[t] = [];
  ocByType[t].push(c);
}
for (const [t, items] of Object.entries(ocByType).sort((a,b) => b[1].length-a[1].length)) {
  console.log('  ' + t + ' (' + (typeNames[t]||'') + '): ' + items.length + ' судов');
  const show = items.length <= 10 ? items : items.slice(0, 5);
  show.forEach(c => console.log('    └ ' + c.code + ' ' + c.name.slice(0, 55)));
  if (items.length > 10) console.log('    ... ещё ' + (items.length - 5));
}

console.log('');
console.log('─'.repeat(80));
console.log('  ТОЛЬКО В sudrf.ru (нет в CH2) — ' + onlySudrf.length + ' шт');
console.log('─'.repeat(80));

const osByType = {};
for (const c of onlySudrf) {
  const t = c.court_type;
  if (!osByType[t]) osByType[t] = [];
  osByType[t].push(c);
}
for (const [t, items] of Object.entries(osByType).sort((a,b) => b[1].length-a[1].length)) {
  console.log('  ' + t + ' (' + (typeNames[t]||'') + '): ' + items.length + ' судов');
  const show = items.length <= 10 ? items : items.slice(0, 3);
  show.forEach(c => console.log('    └ ' + c.code + ' ' + c.name.slice(0, 55) + (c.website ? ' site:'+c.website : '')));
  if (items.length > 10) console.log('    ... ещё ' + (items.length - 3));
}

console.log('');
console.log('─'.repeat(80));
console.log('  ДОПОЛНИТЕЛЬНЫЕ ПОЛЯ sudrf.ru В ОБЩИХ ЗАПИСЯХ');
console.log('─'.repeat(80));

console.log('  Из ' + both.length + ' общих судов:');
console.log('  с телефоном в sudrf: ' + both.filter(c => c.phone).length);
console.log('  с email в sudrf:     ' + both.filter(c => c.email).length);
console.log('  с ПСП в sudrf:      ' + both.filter(c => (c.addresses?.length||0) > 1).length);
console.log('  с ИНН в CH2:         ' + both.filter(c => c.inn).length);
