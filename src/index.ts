/**
 * CourtSudrf — CLI точка входа.
 *
 * Парсер контактных данных судов РФ с sudrf.ru (ГАС «Правосудие»).
 *
 * Использование:
 *   tsx src/index.ts fetch            # Получить все суды (ya_coords)
 *   tsx src/index.ts details          # Получить детали по всем судам
 *   tsx src/index.ts all              # Полный цикл: список + детали
 *   tsx src/index.ts details --code 59RS0014  # Детали конкретного суда
 *   tsx src/index.ts details --limit 10       # Ограничить количество
 *   tsx src/index.ts details --resume          # Продолжить с последнего
 *   tsx src/index.ts regions          # Список доступных регионов
 */

import { Command } from 'commander';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from './env.js';
import { SudrfClient } from './core/SudrfClient.js';
import type { YaCoordData } from './types/sudrf.js';
import type { CourtRecord } from './core/CourtRecord.js';
import { getCourtTypeName } from './core/CourtRecord.js';

// Определяем __dirname для ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_DIR = join(__dirname, '..', 'data');
const PREFIXES_DIR = join(DATA_DIR, 'prefixes');
const COORD_CACHE = join(DATA_DIR, 'court_coords.json');
const COURTS_JSON = join(DATA_DIR, 'courts.json');
const PROGRESS_FILE = join(DATA_DIR, '.progress');

interface CliOptions {
  code?: string;
  limit?: number;
  resume?: boolean;
  delay?: number;
  region?: string;
}

/** Загружает или создаёт пустой список судов */
function loadCoordCache(): YaCoordData {
  if (existsSync(COORD_CACHE)) {
    return JSON.parse(readFileSync(COORD_CACHE, 'utf-8'));
  }
  return {};
}

/** Сохраняет список судов */
function saveCoordCache(data: YaCoordData): void {
  writeFileSync(COORD_CACHE, JSON.stringify(data, null, 2), 'utf-8');
}

/** Загружает список всех CourtRecord из courts.json */
function loadCourts(): CourtRecord[] {
  if (existsSync(COURTS_JSON)) {
    const raw = JSON.parse(readFileSync(COURTS_JSON, 'utf-8'));
    // Поддерживаем оба формата: { meta, courts } и голый массив
    if (Array.isArray(raw)) return raw;
    if (raw.courts && Array.isArray(raw.courts)) return raw.courts;
    return [];
  }
  return [];
}

/** Сохраняет все CourtRecord в courts.json и по префиксам */
function saveCourts(records: CourtRecord[]): void {
  // Единый файл — формат совместимый с CourtHarvest2: { meta, courts }
  const output = {
    meta: {
      totalCourts: records.length,
      timestamp: new Date().toISOString(),
      phase: `sudrf-${new Date().toISOString().slice(0, 10)}`,
      mode: 'sudrf',
    },
    courts: records,
  };
  writeFileSync(COURTS_JSON, JSON.stringify(output, null, 2), 'utf-8');

  // По префиксам
  const byPrefix = new Map<string, CourtRecord[]>();
  for (const r of records) {
    const prefix = r.code.slice(0, 4);
    if (!byPrefix.has(prefix)) byPrefix.set(prefix, []);
    byPrefix.get(prefix)!.push(r);
  }

  for (const [prefix, items] of byPrefix) {
    const filePath = join(PREFIXES_DIR, `${prefix}.json`);
    writeFileSync(filePath, JSON.stringify(items, null, 2), 'utf-8');
  }
}

/** Загружает прогресс (последний обработанный код) */
function loadProgress(): string | null {
  if (existsSync(PROGRESS_FILE)) {
    return readFileSync(PROGRESS_FILE, 'utf-8').trim() || null;
  }
  return null;
}

/** Сохраняет прогресс */
function saveProgress(code: string): void {
  writeFileSync(PROGRESS_FILE, code, 'utf-8');
}

const program = new Command();

program
  .name('courtsudrf')
  .description('Парсер контактных данных судов РФ с sudrf.ru')
  .version('0.1.0');

// ----------------------------------------------------------------
// fetch — получить список всех судов через ya_coords
// ----------------------------------------------------------------
program
  .command('fetch')
  .description('Получить список всех судов (код + название + координаты)')
  .action(async () => {
    console.log('[fetch] Загрузка списка всех судов через ya_coords...');
    const client = new SudrfClient();
    const data = await client.fetchAllCourts();
    const codes = Object.keys(data).length;
    console.log(`[fetch] Получено ${codes} судов`);

    mkdirSync(DATA_DIR, { recursive: true });
    saveCoordCache(data);
    console.log(`[fetch] Сохранено в ${COORD_CACHE}`);
  });

// ----------------------------------------------------------------
// details — получить детальную информацию по судам
// ----------------------------------------------------------------
program
  .command('details')
  .description('Получить детальную информацию по судам')
  .option('-c, --code <code>', 'Код конкретного суда (например 59RS0014)')
  .option('-l, --limit <number>', 'Максимум судов для обработки', (v) => parseInt(v, 10))
  .option('-r, --resume', 'Продолжить с последнего обработанного')
  .option('-d, --delay <ms>', 'Задержка между запросами в мс', (v) => parseInt(v, 10), 1500)
  .option('--region <code>', 'Код региона (например 59)')
  .action(async (options: CliOptions) => {
    const client = new SudrfClient(options.delay);

    // Загружаем координатный кеш
    const coords = loadCoordCache();
    const allCodes = Object.keys(coords).sort();

    if (allCodes.length === 0) {
      console.error('[details] Нет данных. Сначала выполните: tsx src/index.ts fetch');
      process.exit(1);
    }

    // Фильтруем по коду, если указан
    let codes = allCodes;
    if (options.code) {
      codes = allCodes.filter((c) => c === options.code!.toUpperCase());
      if (codes.length === 0) {
        console.error(`[details] Код ${options.code!} не найден`);
        process.exit(1);
      }
    } else if (options.region) {
      codes = allCodes.filter((c) => c.startsWith(options.region!));
      console.log(`[details] Регион ${options.region}: ${codes.length} судов`);
    }

    // Возобновление
    let startIndex = 0;
    if (options.resume) {
      const lastCode = loadProgress();
      if (lastCode) {
        const idx = codes.indexOf(lastCode);
        if (idx !== -1) startIndex = idx + 1;
        console.log(`[details] Возобновление с кода ${lastCode} (индекс ${startIndex})`);
      }
    }

    // Лимит
    const limit = options.limit ?? codes.length;
    const toProcess = codes.slice(startIndex, startIndex + limit);

    if (toProcess.length === 0) {
      console.log('[details] Нет судов для обработки');
      return;
    }

    console.log(`[details] Обработка ${toProcess.length} судов...`);

    const records: CourtRecord[] = loadCourts();
    const existingCodes = new Set(records.map((r) => r.code));

    let success = 0;
    let fail = 0;

    for (let i = 0; i < toProcess.length; i++) {
      const code = toProcess[i];
      const entry = coords[code]?.[0];

      if (existingCodes.has(code)) {
        process.stdout.write(`\r[details] [${i + 1}/${toProcess.length}] ${code} — уже есть, пропускаем`);
        continue;
      }

      process.stdout.write(
        `\r[details] [${i + 1}/${toProcess.length}] ${code} — запрос...`,
      );

      const info = await client.fetchCourtInfo(code);
      if (info) {
        const record = client.toCourtRecord(code, info);
        // Если в ya_coords было название — используем его (оно полнее)
        if (entry && entry.name) {
          record.name = entry.name;
        }
        records.push(record);
        existingCodes.add(code);
        success++;
      } else {
        // Если ya_info не дал результата, создаём запись из ya_coords
        if (entry) {
          const typeCode = code.slice(2, 4);
          const typeName = getCourtTypeName(typeCode);
          records.push({
            code,
            name: entry.name || code,
            court_type: typeCode,
            court_type_name: typeName,
            address: entry.adress || '',
            legal_address: null,
            website: null,
            inn: null,
            region_code: code.slice(0, 2),
            phone: undefined,
            email: undefined,
            okato: null,
            okmo: null,
            okpo: null,
          });
          existingCodes.add(code);
          success++;
        } else {
          fail++;
        }
      }

      saveProgress(code);

      // Сохраняем каждые 50 записей
      if (success % 50 === 0) {
        saveCourts(records);
      }
    }

    saveCourts(records);
    console.log(
      `\n[details] Готово: ${success} успешно, ${fail} ошибок. Всего: ${records.length}`,
    );
  });

// ----------------------------------------------------------------
// all — полный цикл
// ----------------------------------------------------------------
program
  .command('all')
  .description('Полный цикл: fetch + details')
  .option('-l, --limit <number>', 'Максимум судов для обработки', parseInt)
  .option('-d, --delay <ms>', 'Задержка между запросами в мс', parseInt, 1500)
  .option('--region <code>', 'Код региона')
  .action(async (options: CliOptions) => {
    mkdirSync(DATA_DIR, { recursive: true });
    mkdirSync(PREFIXES_DIR, { recursive: true });

    await program.parseAsync(['node', 'test', 'fetch'], { from: 'user' });

    const detailCmd = program.commands.find((c) => c.name() === 'details')!;
    const detailArgs = ['details'];
    if (options.limit) detailArgs.push('--limit', String(options.limit));
    if (options.delay) detailArgs.push('--delay', String(options.delay));
    if (options.region) detailArgs.push('--region', options.region);
    await detailCmd.parseAsync(detailArgs, { from: 'user' });
  });

// ----------------------------------------------------------------
// ms — парсинг мировых судей (MS)
// ----------------------------------------------------------------
program
  .command('ms')
  .description('Парсинг мировых судей (MS) из HTML go_ms_search')
  .option('-f, --file <path>', 'Путь к локальному HTML-файлу (по умолчанию скачать с sudrf.ru)')
  .action(async (options: { file?: string }) => {
    mkdirSync(DATA_DIR, { recursive: true });
    mkdirSync(PREFIXES_DIR, { recursive: true });

    let html: string;
    if (options.file) {
      console.log(`[ms] Чтение файла ${options.file}...`);
      html = readFileSync(options.file, 'utf-8');
    } else {
      console.log('[ms] Скачивание HTML go_ms_search...');
      const client = new SudrfClient(0);
      html = await client.fetchMsHtml();
      // Сохраняем копию на диск
      const savedPath = join(DATA_DIR, 'ms_courts.html');
      writeFileSync(savedPath, html, 'utf-8');
      console.log(`[ms] Сохранено в ${savedPath}`);
    }

    console.log('[ms] Парсинг HTML...');
    const client = new SudrfClient(0);
    const records = client.parseMsHtml(html);

    // Загружаем существующие записи, чтобы не потерять федеральные
    const existing = loadCourts();
    const existingCodes = new Set(existing.map((r) => r.code));
    const newRecords = records.filter((r) => !existingCodes.has(r.code));

    console.log(`[ms] Всего MS: ${records.length}, новых: ${newRecords.length}`);

    if (newRecords.length === 0) {
      console.log('[ms] Новых записей нет');
      return;
    }

    const merged = [...existing, ...newRecords];
    saveCourts(merged);
    console.log(`[ms] Готово. Всего записей: ${merged.length}`);
  });

// ----------------------------------------------------------------
// regions — вывод списка регионов
// ----------------------------------------------------------------
program
  .command('regions')
  .description('Показать список доступных регионов')
  .action(() => {
    console.log('Список регионов sudrf.ru:');
    console.log('  Код  | Регион');
    console.log('  ------|--------');
    for (const [code, name] of REGIONS) {
      console.log(`  ${code.padStart(4)} | ${name}`);
    }
  });

/** Карта регионов sudrf.ru (из HTML-селекта) */
const REGIONS: [string, string][] = [
  ['01', 'Республика Адыгея'],
  ['02', 'Республика Алтай'],
  ['03', 'Республика Башкортостан'],
  ['04', 'Республика Бурятия'],
  ['05', 'Республика Дагестан'],
  ['06', 'Республика Ингушетия'],
  ['07', 'Кабардино-Балкарская Республика'],
  ['08', 'Республика Калмыкия'],
  ['09', 'Карачаево-Черкесская Республика'],
  ['10', 'Республика Карелия'],
  ['11', 'Республика Коми'],
  ['12', 'Республика Марий Эл'],
  ['13', 'Республика Мордовия'],
  ['14', 'Республика Саха (Якутия)'],
  ['15', 'Республика Северная Осетия-Алания'],
  ['16', 'Республика Татарстан'],
  ['17', 'Республика Тыва'],
  ['18', 'Удмуртская Республика'],
  ['19', 'Республика Хакасия'],
  ['20', 'Чеченская Республика'],
  ['21', 'Чувашская Республика — Чувашия'],
  ['22', 'Алтайский край'],
  ['23', 'Краснодарский край'],
  ['24', 'Красноярский край'],
  ['25', 'Приморский край'],
  ['26', 'Ставропольский край'],
  ['27', 'Хабаровский край'],
  ['28', 'Амурская область'],
  ['29', 'Архангельская область'],
  ['30', 'Астраханская область'],
  ['31', 'Белгородская область'],
  ['32', 'Брянская область'],
  ['33', 'Владимирская область'],
  ['34', 'Волгоградская область'],
  ['35', 'Вологодская область'],
  ['36', 'Воронежская область'],
  ['37', 'Ивановская область'],
  ['38', 'Иркутская область'],
  ['39', 'Калининградская область'],
  ['40', 'Калужская область'],
  ['41', 'Камчатский край'],
  ['42', 'Кемеровская область — Кузбасс'],
  ['43', 'Кировская область'],
  ['44', 'Костромская область'],
  ['45', 'Курганская область'],
  ['46', 'Курская область'],
  ['47', 'Ленинградская область'],
  ['48', 'Липецкая область'],
  ['49', 'Магаданская область'],
  ['50', 'Московская область'],
  ['51', 'Мурманская область'],
  ['52', 'Нижегородская область'],
  ['53', 'Новгородская область'],
  ['54', 'Новосибирская область'],
  ['55', 'Омская область'],
  ['56', 'Оренбургская область'],
  ['57', 'Орловская область'],
  ['58', 'Пензенская область'],
  ['59', 'Пермский край'],
  ['60', 'Псковская область'],
  ['61', 'Ростовская область'],
  ['62', 'Рязанская область'],
  ['63', 'Самарская область'],
  ['64', 'Саратовская область'],
  ['65', 'Сахалинская область'],
  ['66', 'Свердловская область'],
  ['67', 'Смоленская область'],
  ['68', 'Тамбовская область'],
  ['69', 'Тверская область'],
  ['70', 'Томская область'],
  ['71', 'Тульская область'],
  ['72', 'Тюменская область'],
  ['73', 'Ульяновская область'],
  ['74', 'Челябинская область'],
  ['75', 'Забайкальский край'],
  ['76', 'Ярославская область'],
  ['77', 'Город Москва'],
  ['78', 'Город Санкт-Петербург'],
  ['79', 'Еврейская автономная область'],
  ['83', 'Ненецкий автономный округ'],
  ['86', 'Ханты-Мансийский автономный округ — Югра'],
  ['87', 'Чукотский автономный округ'],
  ['89', 'Ямало-Ненецкий автономный округ'],
  ['90', 'Запорожская область'],
  ['91', 'Республика Крым'],
  ['92', 'Город Севастополь'],
  ['93', 'Донецкая Народная Республика'],
  ['94', 'Луганская Народная Республика'],
  ['95', 'Территории за пределами РФ'],
  ['96', 'Херсонская область'],
  ['97', 'Организации центрального подчинения'],
];

// ----------------------------------------------------------------
loadEnv();
mkdirSync(DATA_DIR, { recursive: true });
mkdirSync(PREFIXES_DIR, { recursive: true });

program.parse(process.argv);
