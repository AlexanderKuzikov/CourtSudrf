const fs = require('fs');
const d = JSON.parse(fs.readFileSync('D:/GitHub/CourtSudrf/data/courts.json', 'utf-8'));
const courts = d.courts || d;

const samples = ['43RS0018', '24OS0000', '01MS0001'];

for (const code of samples) {
  const c = courts.find(x => x.code === code);
  if (!c) { console.log('Not found:', code); continue; }
  const psp = (c.addresses||[]).filter(a => a.type === 'psp');

  const out = {
    code: c.code,
    name: c.name,
    court_type: c.court_type,
    address: c.address,
    phone: c.phone || null,
    okmo: c.okmo || null,
    psp_count: psp.length,
  };

  for (let i = 0; i < psp.length; i++) {
    out['psp_address_' + i] = psp[i].address;
    out['psp_phone_' + i] = psp[i].phone || null;
    out['psp_okmo_' + i] = null; // ОКТМО для ПСП — нет в sudrf, заполняется отдельно
  }

  console.log(`// ${c.code} — ${c.name}`);
  console.log(JSON.stringify(out, null, 2));
  console.log('');
}
