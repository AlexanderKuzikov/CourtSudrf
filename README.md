# CourtSudrf

[![TypeScript](https://img.shields.io/badge/TypeScript-7.0-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-24-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

Парсер контактных данных судов РФ с сайта **sudrf.ru** (ГАС «Правосудие»).

Извлекает ПСП-адреса, телефоны, email, сайты судов РФ — информация, которой нет в DaData.

## Возможности

- 🔍 Получение списка **всех федеральных судов РФ** (2334+) через `ya_coords`
- 📋 Детальная информация по каждому суду: адрес, телефон, email, сайт
- 📍 Разделение основного адреса и ПСП (судебных присутствий)
- 📁 Сохранение в формате, совместимом с [CourtHarvest2](https://github.com/AlexanderKuzikov/CourtHarvest2):
  - `data/courts.json` — единая сборка
  - `data/prefixes/{prefix}.json` — по префиксам (59RS.json, 77OS.json и т.д.)
- 🔄 Возобновление прерванного сбора (`--resume`)
- ⏱ Встроенный rate limiting (1.5с между запросами по умолчанию)
- 🗺 Сбор всех данных публично, **без ключей API**

## Быстрый старт

```bash
# Установка
git clone https://github.com/AlexanderKuzikov/CourtSudrf.git
cd CourtSudrf
npm install

# Полный цикл: получить список судов + детали
npx tsx src/index.ts all

# Или по шагам:
npx tsx src/index.ts fetch              # список всех судов
npx tsx src/index.ts details            # детали по всем
npx tsx src/index.ts details --region 59  # только Пермский край
npx tsx src/index.ts details --code 59RS0014  # конкретный суд
npx tsx src/index.ts details --limit 10 --resume  # 10 штук с возобновлением
```

## Команды

| Команда | Описание |
|---------|----------|
| `fetch` | Получить список всех судов через `ya_coords` (2334+ записей) |
| `details` | Получить детальную информацию (адрес, телефон, email) |
| `all` | Полный цикл: fetch + details |
| `regions` | Показать список регионов РФ с кодами sudrf.ru |

### Параметры `details`

| Параметр | Описание |
|----------|---------|
| `-c, --code <code>` | Код конкретного суда (59RS0014) |
| `-l, --limit <n>` | Максимум судов для обработки |
| `-r, --resume` | Продолжить с последнего обработанного |
| `-d, --delay <ms>` | Задержка между запросами (умолч. 1500) |
| `--region <code>` | Код региона (59, 77, 50...) |

## Формат записи

```ts
interface CourtRecord {
  code: string;           // 59RS0014
  name: string;           // Верещагинский районный суд Пермского края
  court_type: string;     // районный суд
  address: string;        // 617120, Пермский край, г. Верещагино, ул. Фрунзе, д. 74
  legal_address: string | null;
  website: string | null;
  inn: string | null;
  region_code: string;    // 59
  addresses?: {           // Основной + ПСП
    type: 'main' | 'psp' | 'other';
    address: string;
    phone?: string;
  }[];
  phone?: string;
  email?: string;
}
```

## Архитектура

```
src/
├── index.ts              CLI (commander)
├── env.ts                Загрузка .env
├── core/
│   ├── SudrfClient.ts    HTTP-клиент sudrf.ru
│   └── CourtRecord.ts    Формат записи
└── types/
    └── sudrf.ts          Типы HTML-структуры
```

### Эндпоинты sudrf.ru

| Эндпоинт | Описание | JS-защита |
|----------|----------|-----------|
| `ya_coords?type_suds=fs` | Все суды (код + имя + коорд.) | ❌ Нет |
| `ya_info&vnkod=59RS0014` | Детали суда (адрес, тел., email) | ❌ Нет |
| `ajax_search&searchtype=sp&court_subj=59` | Список судов региона | ❌ Нет |
| `go_search&searchtype=fs&court_subj=59` | Поиск судов | ✅ Да (JS challenge) |

**Важно:** `go_search` заблокирован JS-защитой Qrator. Вместо него используем `ya_coords` (один запрос на все суды) + `ya_info` (детали по каждому).

## Связанные проекты

- [CourtHarvest2](https://github.com/AlexanderKuzikov/CourtHarvest2) — сборщик DaData (10 225 судов)
- [Court-Harvester](https://github.com/AlexanderKuzikov/Court-Harvester) — v1

## Лицензия

Apache 2.0
