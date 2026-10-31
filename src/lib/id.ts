import { randomBytes } from 'crypto';

/** Короткий уникальный id для имён файлов (без зависимости от cuid). */
export function createId() {
  return randomBytes(12).toString('hex');
}
