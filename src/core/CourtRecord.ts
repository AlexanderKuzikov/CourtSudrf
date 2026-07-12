/**
 * Формат единой записи суда.
 * Совместим с CourtHarvest2.
 */

export interface CourtRecord {
  /** Первичный ключ: RRTTNNNN (01RS0001) */
  code: string;
  /** Полное официальное название */
  name: string;
  /** Тип суда */
  court_type: string;
  /** Основной адрес */
  address: string;
  /** Юридический адрес */
  legal_address: string | null;
  /** Сайт */
  website: string | null;
  /** ИНН */
  inn: string | null;
  /** Код региона из code */
  region_code: string;

  /** Доп. адреса (основной + ПСП) */
  addresses?: {
    type: 'main' | 'psp' | 'other';
    address: string;
    phone?: string;
  }[];

  /** Телефон(ы) */
  phone?: string;
  /** Email */
  email?: string;
}

/** Извлекает код региона (первые 2 символа) из кода суда */
export function extractRegionCode(code: string): string {
  return code.slice(0, 2);
}

/** Извлекает префикс (первые 4 символа: RRTT) */
export function extractPrefix(code: string): string {
  return code.slice(0, 4);
}
