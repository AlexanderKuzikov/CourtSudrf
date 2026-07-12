import { readFileSync } from 'fs';

const CH2_PATH = process.argv[2] || 'D:/GitHub/CourtHarvest2/data_20260712/courts.json';

const ch2 = JSON.parse(readFileSync(CH2_PATH, 'utf-8'));
const sudrf = JSON.parse(readFileSync('./data/courts.json', 'utf-8'));

const ch2codes = new Map(ch2.courts.map(c => [c.code, c]));
const sudrfCodes = new Map(sudrf.courts.map(c => [c.code, c]));

// Исключаем арбитражные (AS, AA, AO, AI) и УСД (UD)
const exclude = new Set(['AS', 'AA', 'AO', 'AI', 'UD']);

const onlyCH2 = ch2.courts.filter(c => !sudrfCodes.has(c.code) && !exclude.has(c.court_type));
const onlySudrf = sudrf.courts.filter(c => !ch2codes.has(c.code) && !exclude.has(c.court_type));

console.log('='.repeat(80));
console.log('  СПИСОК «ИЗГОЕВ» — без арбитражных и УСД');
console.log('='.repeat(80));
console.log('');

// ── Только в CH2 ──
console.log('─'.repeat(80));
console.log('  ТОЛЬКО В CourtHarvest2 (нет в sudrf.ru) — ' + onlyCH2.length + ' шт');
console.log('─'.repeat(80));

const byTypeCH2 = {};
for (const c of onlyCH2) {
  const t = c.court_type;
  if (!byTypeCH2[t]) byTypeCH2[t] = [];
  byTypeCH2[t].push(c);
}

for (const [t, items] of Object.entries(byTypeCH2).sort((a,b) => b[1].length-a[1].length)) {
  console.log('');
  console.log('  ' + t + ' — ' + items.length + ' судов:');
  for (const c of items) {
    const region = c.code.slice(0,2);
    console.log('    ' + c.code + '  ' + c.name + (c.website ? '  ' + c.website : ''));
  }
}

// ── Только в sudrf ──
console.log('');
console.log('─'.repeat(80));
console.log('  ТОЛЬКО В sudrf.ru (нет в CH2) — ' + onlySudrf.length + ' шт');
console.log('─'.repeat(80));

const byTypeS = {};
for (const c of onlySudrf) {
  const t = c.court_type;
  if (!byTypeS[t]) byTypeS[t] = [];
  byTypeS[t].push(c);
}

for (const [t, items] of Object.entries(byTypeS).sort((a,b) => b[1].length-a[1].length)) {
  console.log('');
  console.log('  ' + t + ' — ' + items.length + ' судов:');
  for (const c of items) {
    console.log('    ' + c.code + '  ' + c.name + (c.website ? '  ' + c.website : ''));
  }
}
