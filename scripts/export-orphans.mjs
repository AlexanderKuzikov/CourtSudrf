import { readFileSync, writeFileSync } from 'fs';

const CH2_PATH = process.argv[2] || 'D:/GitHub/CourtHarvest2/data_20260712/courts.json';

const ch2 = JSON.parse(readFileSync(CH2_PATH, 'utf-8'));
const sudrf = JSON.parse(readFileSync('./data/courts.json', 'utf-8'));

const ch2Map = new Map(ch2.courts.map(c => [c.code, c]));
const sudrfMap = new Map(sudrf.courts.map(c => [c.code, c]));

const exclude = new Set(['AS', 'AA', 'AO', 'AI', 'UD']);

const allCodes = new Set([...ch2Map.keys(), ...sudrfMap.keys()]);
const orphans = [];

for (const code of allCodes) {
  const inCh2 = ch2Map.has(code);
  const inSudrf = sudrfMap.has(code);
  if (inCh2 && inSudrf) continue; // не изгой
  if (inCh2 && exclude.has(ch2Map.get(code).court_type)) continue;
  if (inSudrf && exclude.has(sudrfMap.get(code).court_type)) continue;

  const ch2rec = ch2Map.get(code);
  const sudrfRec = sudrfMap.get(code);

  const entry = {
    code,
    name: ch2rec?.name || sudrfRec?.name || code,
    court_type: ch2rec?.court_type || sudrfRec?.court_type,
    present_in: inCh2 && inSudrf ? 'both' : inCh2 ? 'ch2' : 'sudrf',
  };

  // Поля из CH2 (если есть)
  if (ch2rec) {
    entry.ch2 = {
      inn: ch2rec.inn || null,
      address: ch2rec.address || null,
      website: ch2rec.website || null,
    };
  }

  // Поля из sudrf (если есть)
  if (sudrfRec) {
    entry.sudrf = {
      address: sudrfRec.address || null,
      phone: sudrfRec.phone || null,
      email: sudrfRec.email || null,
      website: sudrfRec.website || null,
    };
  }

  orphans.push(entry);
}

orphans.sort((a, b) => a.code.localeCompare(b.code));

const output = {
  meta: {
    description: 'Суды-изгои: присутствуют только в одной из баз (CH2 или sudrf)',
    excluded_types: ['AS', 'AA', 'AO', 'AI', 'UD'],
    total: orphans.length,
    only_in_ch2: orphans.filter(o => o.present_in === 'ch2').length,
    only_in_sudrf: orphans.filter(o => o.present_in === 'sudrf').length,
  },
  courts: orphans,
};

writeFileSync('data/orphans.json', JSON.stringify(output, null, 2), 'utf-8');
console.log('Сохранено data/orphans.json — ' + orphans.length + ' записей');
console.log('  только в CH2:    ' + output.meta.only_in_ch2);
console.log('  только в sudrf:  ' + output.meta.only_in_sudrf);
