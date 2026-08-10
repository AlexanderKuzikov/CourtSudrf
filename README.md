<p align="center">
  <a href="https://www.typescriptlang.org/"><img alt="TypeScript 7" src="https://img.shields.io/badge/TypeScript-7.0-3178C6?logo=typescript&logoColor=white"></a>
  <a href="https://nodejs.org/"><img alt="Node 24" src="https://img.shields.io/badge/Node-24-339933?logo=node.js&logoColor=white"></a>
  <a href="LICENSE"><img alt="License" src="https://img.shields.io/badge/License-Apache_2.0-blue.svg"></a>
</p>

<h1 align="center">CourtSudrf</h1>
<p align="center">Парсер контактных данных судов РФ с sudrf.ru</p>

---

Извлекает контактные данные (адрес, телефон, email, ПСП) для 10 081 судов РФ напрямую с sudrf.ru (ГАС «Правосудие»). Дополняет CourtHarvest2 данными, которых нет в DaData: телефоны, email, ПСП-адреса, координаты.

- **2 334 федеральных суда** — через `ya_coords` + `ya_info`
- **7 747 мировых судей** — парсинг HTML `go_ms_search`
- **ПСП-адреса** — 148 судов, 155 постоянных судебных присутствий
- **Rate limiting** — Bottleneck 1.5s (~58 мин полный прогон)
- **Совместимость** — формат CourtRecord идентичен CourtHarvest2
- **CP1251** — iconv-lite для windows-1251

## Быстрый старт

```bash
git clone https://github.com/AlexanderKuzikov/CourtSudrf.git
cd CourtSudrf
npm install

npx tsx src/index.ts fetch       # список федеральных судов
npx tsx src/index.ts details     # детали (адрес, телефон, email)
npx tsx src/index.ts ms          # мировые судьи
npx tsx src/index.ts all         # полный цикл
```

## Документация

- [`docs/CONTEXT.md`](docs/CONTEXT.md) — состояние проекта
- [`docs/DECISIONS.md`](docs/DECISIONS.md) — архитектурные решения

## Статус

**v0.1.0** — 10 081 записей. 13/15 багов исправлены. 2 отложено (hardcoded regions, нет тестов).

## Лицензия

[Apache-2.0](LICENSE) © Alexander Kuzikov
