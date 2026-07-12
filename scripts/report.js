const d = require('./data/courts.json');
const courts = d.courts;

// Группировка по типу
const byType = {};
for (const c of courts) {
  const t = c.court_type;
  if (!byType[t]) byType[t] = { total: 0, withAddr: 0, withPhone: 0, withEmail: 0, withSite: 0, withPsp: 0, regions: new Set() };
  byType[t].total++;
  if (c.address) byType[t].withAddr++;
  if (c.phone) byType[t].withPhone++;
  if (c.email) byType[t].withEmail++;
  if (c.website) byType[t].withSite++;
  if ((c.addresses?.length||0) > 1) byType[t].withPsp++;
  byType[t].regions.add(c.region_code);
}

const typeNames = {
  RS: 'Районные суды',
  MS: 'Мировые суды',
  OS: 'Областные и равные',
  GV: 'Гарнизонные военные',
  UD: 'Управления Судебного департамента',
  OV: 'Окружные военные',
  KJ: 'Кассационные суды',
  AJ: 'Апелляционные суды',
  VS: 'Верховный Суд РФ',
  AV: 'Апелляционный военный суд',
};

console.log('='.repeat(80));
console.log('              ОТЧЁТ ПО ТИПАМ СУДОВ — CourtSudrf');
console.log('='.repeat(80));
console.log('');
console.log('  Всего записей: ' + courts.length);
console.log('  Дата сбора:    ' + d.meta.timestamp.slice(0, 10));
console.log('');

const hdr = ['Тип', 'Расшифровка', 'Всего', 'Адрес', 'Тел.', 'Email', 'Сайт', 'ПСП', 'Регионов'];
console.log('  ' + hdr.map((h, i) => h.padEnd([8, 38, 7, 7, 7, 7, 7, 6, 8][i])).join(''));
console.log('  ' + '─'.repeat(87));

const sorted = Object.entries(byType).sort((a, b) => b[1].total - a[1].total);
for (const [code, s] of sorted) {
  const name = typeNames[code] || code;
  const row = [
    code.padEnd(8),
    name.padEnd(38),
    String(s.total).padStart(6),
    String(s.withAddr).padStart(6),
    String(s.withPhone).padStart(6),
    String(s.withEmail).padStart(6),
    String(s.withSite).padStart(6),
    String(s.withPsp).padStart(5),
    String(s.regions.size).padStart(8),
  ];
  console.log('  ' + row.join(' '));
}

console.log('');
console.log('  ПСП всего: ' + courts.filter(c => (c.addresses?.length||0) > 1).length + ' судов');
console.log('');

// Топ-10 регионов по числу судов
const regionNames = {
  '01':'Адыгея','02':'Алтай','03':'Башкортостан','04':'Бурятия','05':'Дагестан',
  '06':'Ингушетия','07':'Кабардино-Балкария','08':'Калмыкия','09':'Карачаево-Черкесия',
  '10':'Карелия','11':'Коми','12':'Марий Эл','13':'Мордовия','14':'Саха (Якутия)',
  '15':'Сев.Осетия','16':'Татарстан','17':'Тыва','18':'Удмуртия','19':'Хакасия',
  '20':'Чечня','21':'Чувашия','22':'Алтайский кр.','23':'Краснодарский кр.',
  '24':'Красноярский кр.','25':'Приморский кр.','26':'Ставропольский кр.',
  '27':'Хабаровский кр.','28':'Амурская','29':'Архангельская','30':'Астраханская',
  '31':'Белгородская','32':'Брянская','33':'Владимирская','34':'Волгоградская',
  '35':'Вологодская','36':'Воронежская','37':'Ивановская','38':'Иркутская',
  '39':'Калининградская','40':'Калужская','41':'Камчатский кр.','42':'Кемеровская',
  '43':'Кировская','44':'Костромская','45':'Курганская','46':'Курская',
  '47':'Ленинградская','48':'Липецкая','49':'Магаданская','50':'Московская',
  '51':'Мурманская','52':'Нижегородская','53':'Новгородская','54':'Новосибирская',
  '55':'Омская','56':'Оренбургская','57':'Орловская','58':'Пензенская',
  '59':'Пермский кр.','60':'Псковская','61':'Ростовская','62':'Рязанская',
  '63':'Самарская','64':'Саратовская','65':'Сахалинская','66':'Свердловская',
  '67':'Смоленская','68':'Тамбовская','69':'Тверская','70':'Томская',
  '71':'Тульская','72':'Тюменская','73':'Ульяновская','74':'Челябинская',
  '75':'Забайкальский кр.','76':'Ярославская','77':'Москва','78':'СПб',
  '79':'Еврейская АО','81':'Коми-Пермяцкий АО','83':'Ненецкий АО',
  '86':'ХМАО','87':'Чукотский АО','89':'ЯНАО',
  '90':'Запорожская','91':'Крым','92':'Севастополь',
  '93':'ДНР','94':'ЛНР','95':'вне РФ','96':'Херсонская','97':'центр.подч.',
};

const byRegion = {};
for (const c of courts) {
  const r = c.region_code;
  if (!byRegion[r]) byRegion[r] = { total: 0, fed: 0, ms: 0, psp: 0 };
  byRegion[r].total++;
  if (c.court_type === 'MS') byRegion[r].ms++;
  else byRegion[r].fed++;
  if ((c.addresses?.length||0) > 1) byRegion[r].psp++;
}

const regionSorted = Object.entries(byRegion).sort((a, b) => b[1].total - a[1].total);

console.log('='.repeat(80));
console.log('  ТОП-15 РЕГИОНОВ ПО ЧИСЛУ СУДОВ');
console.log('='.repeat(80));
console.log('');
const rhdr = ['Код', 'Регион', 'Всего', 'Фед.', 'MS', 'ПСП'];
console.log('  ' + rhdr.map((h, i) => h.padEnd([5, 22, 7, 7, 7, 6][i])).join(''));
console.log('  ' + '─'.repeat(52));

for (const [code, s] of regionSorted.slice(0, 15)) {
  const name = regionNames[code] || code;
  const row = [
    code.padEnd(5),
    name.padEnd(22),
    String(s.total).padStart(6),
    String(s.fed).padStart(6),
    String(s.ms).padStart(6),
    String(s.psp).padStart(5),
  ];
  console.log('  ' + row.join(' '));
}

console.log('  ...');

console.log('');
console.log('='.repeat(80));
console.log('  ПСП-СУДЫ ПО ТИПАМ');
console.log('='.repeat(80));
console.log('');

const pspByType = {};
for (const c of courts) {
  if ((c.addresses?.length||0) > 1) {
    const t = c.court_type;
    if (!pspByType[t]) pspByType[t] = [];
    pspByType[t].push({ code: c.code, name: c.name, addrs: c.addresses.length, phone: !!c.phone, email: !!c.email });
  }
}

const pspSorted = Object.entries(pspByType).sort((a, b) => b[1].length - a[1].length);
for (const [code, items] of pspSorted) {
  const maxAddrs = Math.max(...items.map(i => i.addrs));
  const withPhone = items.filter(i => i.phone).length;
  const pct = ((items.length / (byType[code]?.total || 1)) * 100).toFixed(1);
  const typeName = typeNames[code] || code;
  console.log('  ' + code + ' ' + typeName + ': ' + items.length + ' (' + pct + '%)');
  console.log('    макс ПСП: ' + maxAddrs + ', с телефоном: ' + withPhone + '/' + items.length);
  // топ-3
  items.slice(0, 3).forEach(i => {
    console.log('    └ ' + i.code + ' ' + i.name.slice(0, 55) + ' (' + i.addrs + ' адр.)');
  });
}
