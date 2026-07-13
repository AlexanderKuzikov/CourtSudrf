/**
 * Типы HTML-структуры sudrf.ru
 */

/** Единичная запись с ya_coords */
export interface YaCoordEntry {
  type: 'fs' | 'ms';
  name: string;
  adress: string;
  coord: [number, number];
}

/** Результат парсинга ya_coords: { [vnkod]: YaCoordEntry[] } */
export type YaCoordData = Record<string, YaCoordEntry[]>;

/** HTML-структура ответа ya_info */
export interface YaInfoHtml {
  /** Название суда из .sud_name */
  courtName: string;
  /** Окружной суд из .sud_okrug_name */
  okrugName: string;
  /** Территория из .sud_ter_name */
  terName: string;
  /** Классификационный код */
  code: string;
  /** Адрес (основной + ПСП через ;) */
  address: string;
  /** Телефон(ы) */
  phone: string;
  /** Email */
  email: string;
  /** Официальный сайт */
  website: string;
}
