/**
 * Загрузка .env без внешних зависимостей.
 *
 * Читает файл .env в корне проекта, парсит KEY=VALUE строки.
 * Поддерживает:
 *   - комментарии (#)
 *   - пустые строки
 *   - кавычки (одинарные/двойные) в значениях
 *   - экспорт (export KEY=VALUE)
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ENV_LINE =
  /^\s*(?:export\s+)?(?<key>[A-Za-z_][A-Za-z0-9_]*)\s*=\s*(?<value>.*)$/;

function stripQuotes(s: string): string {
  const q = s.charAt(0);
  if ((q === '"' || q === "'") && s.endsWith(q) && s.length > 1) {
    return s.slice(1, -1);
  }
  return s;
}

/** Загружает .env из корня проекта в process.env */
export function loadEnv(): void {
  const root = process.env['INIT_CWD'] ?? process.cwd();
  const envPath = join(root, '.env');

  if (!existsSync(envPath)) return;

  const text = readFileSync(envPath, 'utf-8');

  for (const raw of text.split(/\r?\n/)) {
    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const m = trimmed.match(ENV_LINE);
    if (!m?.groups) continue;

    let value = m.groups['value'].trim();
    // Убираем комментарий в конце строки, если значение не в кавычках
    if (!(value.startsWith('"') || value.startsWith("'"))) {
      const hashIdx = value.indexOf('#');
      if (hashIdx !== -1) value = value.slice(0, hashIdx).trim();
    }

    value = stripQuotes(value);
    const key = m.groups['key'];
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}
