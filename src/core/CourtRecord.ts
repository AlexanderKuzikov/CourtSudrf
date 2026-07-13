/**
 * Формат единой записи суда.
 * Совместим с CourtHarvest2.
 */

export interface CourtRecord {
  /** Первичный ключ: RRTTNNNN (01RS0001) */
  code: string;
  /** Полное официальное название */
  name: string;
  /** Код типа суда (RS, OS, MS, GV, VS, …) — совместимо с CourtHarvest2 */
  court_type: string;
  /** Расшифровка типа суда (районный суд, областной суд, …) */
  court_type_name: string;
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

  /** Доп. адреса (основной + ПСП) — расширение CourtSudrf */
  addresses?: {
    type: 'main' | 'psp' | 'other';
    address: string;
    phone?: string;
  }[];

  /** Телефон(ы) — расширение CourtSudrf */
  phone?: string;
  /** Email — расширение CourtSudrf */
  email?: string;

  // Поля для совместимости с CourtHarvest2 (всегда null в CourtSudrf)
  okato?: string | null;
  okmo?: string | null;
  okpo?: string | null;
}

/** Извлекает код региона (первые 2 символа) из кода суда */
export function extractRegionCode(code: string): string {
  return code.slice(0, 2);
}

/**
 * Маппинг кодов типов → русские названия.
 * Обратный: код извлекается из 3-4 символов кода суда.
 */
export const COURT_TYPE_MAP: Record<string, string> = {
  RS: 'Районный суд',
  OS: 'Областной и равный ему суд',
  VS: 'Верховный Суд РФ',
  GV: 'Гарнизонный военный суд',
  OV: 'Окружной (флотский) военный суд',
  AJ: 'Апелляционный суд общей юрисдикции',
  KJ: 'Кассационный суд общей юрисдикции',
  UD: 'Судебный участок (Управление Судебного департамента)',
  MS: 'Мировой суд',
  AS: 'Арбитражный суд субъекта',
  AA: 'Арбитражный апелляционный суд',
  AO: 'Арбитражный суд округа',
  AI: 'Суд по интеллектуальным правам',
  KV: 'Кассационный военный суд',
  AV: 'Апелляционный военный суд',
};

/** Извлекает код типа суда из полного кода (RS из 59RS0014) */
export function extractCourtType(code: string): string {
  return code.slice(2, 4);
}

/** Получает русское название типа суда по коду */
export function getCourtTypeName(typeCode: string): string {
  return COURT_TYPE_MAP[typeCode] ?? 'прочие';
}
