# CourtSudrf — Instructions for AI Agents

## Commands
- start: `npm start`
- typecheck: `npm run typecheck`
- format: `npm run format`
- format:check: `npm run format:check`

## Conventions
- TypeScript 7, ESM, Node 24+, no build step (tsx)
- Rate limiting: Bottleneck 1.5s между запросами
- Кодировка: windows-1251 → UTF-8 через iconv-lite
- Формат данных совместим с CourtHarvest2
- CLI через commander

## Structure
- `src/index.ts` — CLI entry (commander)
- `src/core/CourtRecord.ts` — формат записи + коды типов судов
- `src/core/SudrfClient.ts` — HTTP-клиент + HTML-парсинг
- `src/types/sudrf.ts` — типы HTML-структуры
- `data/` — выходные JSON
- `scripts/` — утилиты сравнения

## Do NOT touch
- `.env` — секреты
- `data/` — выходные данные
- `node_modules/`

## Documentation rules
- После работы — обнови docs/CONTEXT.md
- Если принял архитектурное решение — запиши в docs/DECISIONS.md
- НЕ создавай новых файлов документации без разрешения
- Переиспользуемые знания — в D:\GitHub\knowledge/README.md
