# CourtSudrf

[![TypeScript](https://img.shields.io/badge/TypeScript-7.0-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-24-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

Парсер контактных данных судов РФ с сайта **sudrf.ru** (ГАС «Правосудие»).

Извлекает ПСП-адреса, телефоны, email, сайты федеральных судов РФ — информация, которой нет в DaData. Мировые суды (MS) — только код, название, сайт (адреса/телефоны на sudrf.ru отсутствуют).

## Данные

| Тип | Кол-во | Адрес | Телефон | Email | ПСП |
|-----|-------:|:-----:|:-------:|:-----:|:---:|
| Федеральные (RS, OS, GV...) | 2 334 | ✅ 2 313 | ✅ 2 308 | ✅ 2 311 | **148** |
| Мировые (MS) | 7 747 | ❌ | ❌ | ❌ | 0 |
| **Всего** | **10 081** | | | | |

Сравнение с [CourtHarvest2](https://github.com/AlexanderKuzikov/CourtHarvest2) (DaData, 10 225 записей):
- Пересечение по кодам: **10 018** (98 %)
- Только в CH2: **93** (в основном новые регионы и арбитражные)
- Только в sudrf: **63** (из них 56 УСД, 7 новых MS)
- Расхождения выгружены в [`data/orphans.json`](data/orphans.json)

## Возможности

- 🔍 Получение списка **всех федеральных судов РФ** (2334) через `ya_coords` (1 запрос)
- 📋 Детальная информация: адрес (с индексом, точками), телефон, email, сайт
- 📍 Разделение основного адреса и ПСП (судебных присутствий) — **148 судов**
- 🌐 Парсинг мировых судей (7747) из HTML-страницы — без rate limiting
- 📁 Сохранение в формате, совместимом с CourtHarvest2:
  - `data/courts.json` — `{ meta, courts }`
  - `data/prefixes/{prefix}.json` — по префиксам
- 🔄 Возобновление прерванного сбора (`--resume`)
- ⏱ Встроенный rate limiting (1.5 с между запросами)
- 🗺 Без ключей API, публичные данные

## Быстрый старт

```bash
git clone https://github.com/AlexanderKuzikov/CourtSudrf.git
cd CourtSudrf
npm install

# Федеральные суды
npx tsx src/index.ts fetch                       # список всех судов
npx tsx src/index.ts details                     # детали по всем (∼58 мин)
npx tsx src/index.ts details --region 59         # только Пермский край
npx tsx src/index.ts details --code 59RS0014     # конкретный суд

# Мировые суды (адресов и телефонов нет, только код + сайт)
npx tsx src/index.ts ms                          # скачать + распарсить

# Анализ расхождений
node scripts/compare.mjs                         # сравнение с CH2
node scripts/orphans.mjs                         # список «изгоев»
```

## Команды CLI

| Команда | Описание |
|---------|----------|
| `fetch` | Список всех судов через `ya_coords` |
| `details` | Детальная информация (адрес, тел., email) |
| `all` | Полный цикл: fetch + details |
| `ms` | Парсинг мировых судей (MS) |
| `regions` | Список регионов РФ с кодами sudrf.ru |

### Параметры `details`

| Параметр | Описание |
|----------|---------|
| `-c, --code <code>` | Код конкретного суда (59RS0014) |
| `-l, --limit <n>` | Максимум судов |
| `-r, --resume` | Продолжить с последнего |
| `-d, --delay <ms>` | Задержка между запросами (умолч. 1500) |
| `--region <code>` | Код региона (59, 77...) |

## Формат записи

```ts
interface CourtRecord {
  code: string;               // 59RS0014
  name: string;
  court_type: string;         // "RS" (код, совместимо с CH2)
  court_type_name: string;    // "Районный суд" (расшифровка)
  address: string;
  legal_address: string | null;
  website: string | null;
  inn: string | null;
  region_code: string;        // "59"
  addresses?: {               // Основной + ПСП
    type: 'main' | 'psp' | 'other';
    address: string;
    phone?: string;
  }[];
  phone?: string;
  email?: string;
  okato?: string | null;      // совместимость с CH2
  okmo?: string | null;
  okpo?: string | null;
}
```

## Архитектура

```
src/
├── index.ts              CLI (commander)
├── env.ts                Загрузка .env
├── core/
│   ├── SudrfClient.ts    HTTP-клиент + парсинг (ya_coords, ya_info, MS HTML)
│   └── CourtRecord.ts    Формат записи + типы кодов
└── types/
    └── sudrf.ts          Типы HTML-структуры
scripts/
├── compare.mjs           Сравнение с CourtHarvest2
├── export-orphans.mjs    Выгрузка расхождений в JSON
├── orphans.mjs           Список «изгоев» в консоль
└── report.js             Отчёт по типам судов
data/
├── courts.json           10 081 запись
├── court_coords.json     2 334 федеральных (координаты)
├── ms_courts.html        HTML-снапшот 7 747 MS
├── orphans.json          100 расхождений с CH2
└── prefixes/             354 файла по RRTT
```

### Эндпоинты sudrf.ru

| Эндпоинт | Описание | JS-защита |
|----------|----------|:---------:|
| `ya_coords?type_suds=fs` | Все федеральные суды (2334) | ❌ |
| `ya_info&vnkod=X` | Детали суда (адрес, тел., email) | ❌ |
| `ajax_search&court_subj=59` | Список судов региона | ❌ |
| `go_ms_search&ms_type=ms` | Все мировые судьи (7747, HTML) | ❌ |
| `go_search&court_subj=59` | Поиск судов | ✅ Qrator |

**Важно:** `go_search` заблокирован JS-защитой. Используем `ya_coords` + `ya_info`.

## Сравнение с CourtHarvest2

| Тип | CH2 | Sudrf | Только CH2 | Только sudrf |
|-----|:---:|:-----:|:----------:|:------------:|
| RS | 2 148 | 2 070 | 78 | 0 |
| MS | 7 744 | 7 747 | 4 | 7 |
| OS | 89 | 85 | 4 | 0 |
| GV | 104 | 99 | 5 | 0 |
| Арбитражные | 114 | 0 | 114 | 0 |
| УСД (UD) | 0 | 56 | 0 | 56 |
| Прочие | 26 | 24 | 2 | 0 |
| **Всего** | **10 225** | **10 081** | **207** | **63** |

Без учёта арбитражных и УСД — **93 изгоя в CH2, 7 в sudrf** (см. `data/orphans.json`).

## Связанные проекты

- [CourtHarvest2](https://github.com/AlexanderKuzikov/CourtHarvest2) — сборщик DaData (10 225 судов, ИНН, ОКТМО)
- [Court-Harvester](https://github.com/AlexanderKuzikov/Court-Harvester) — v1 (предшественник)

## Лицензия

Apache 2.0
